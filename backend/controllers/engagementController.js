/*
  Engagement API — Social Media module.

  Covers the nine engagement features as one coherent surface:
    Like & React to Posts ...... reactions with six types, toggle + breakdown
    Comment on Posts ........... create / edit / soft-delete / paginate
    Reply to Comments .......... true threading via comments[].parentId
    Heart / Favourite a Comment  toggle with a real ObjectId author
    Save / Bookmark Posts ...... toggle, kept in step with the Savereel table
    Share Posts ................ share counter, optional repost, share list
    Mention Users (@username) .. suggest, resolve, notify, mentions feed
    Tag Users in Photos ........ position tags, review queue, approve / reject
    Push Notifications ......... every action above raises one via notify()

  The legacy endpoints in controllers/reels.js are left untouched — the current
  mobile screens still call them. New screens should move here, where the
  ObjectId comparisons are correct and every action notifies.
*/

import mongoose from "mongoose";

import Reels, { REACTIONS } from "../models/Reels.js";
import User from "../models/users.js";
import Savereel from "../models/savereel.js";
import Notification from "../models/Notification.js";
import { notify, notifyMany } from "../services/notificationService.js";
import {
  isId, AUTHOR_FIELDS,
  extractMentionNames, resolveMentions,
  buildViewerContext, shapeFeedItem,
} from "../helpers/feed.js";
import { hiddenUserIds, isBlockedEither } from "../helpers/privacy.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[engagement]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const sameId = (a, b) => String(a) === String(b);

/*
  Reaction totals for a post. Rows written before reactions existed carry no
  `type`, so they count as a plain like rather than being dropped.
*/
const reactionSummary = (likes = [], viewerId) => {
  const counts = Object.fromEntries(REACTIONS.map((r) => [r, 0]));
  let mine = null;
  for (const l of likes) {
    const t = REACTIONS.includes(l.type) ? l.type : "like";
    counts[t] += 1;
    // `username` arrives populated on the list endpoint and as a bare id
    // everywhere else, so unwrap before comparing.
    const uid = l.username?._id || l.username;
    if (viewerId && sameId(uid, viewerId)) mine = t;
  }
  return { total: likes.length, counts, myReaction: mine };
};

const authorLite = (u) =>
  u && typeof u === "object"
    ? {
        _id: u._id, name: u.name, image: u.image,
        verifiedBadge: !!u.verifiedBadge, accountType: u.accountType,
      }
    : { _id: u };

/*
  Legacy replies live on comment.reply[] and carry no id the client can act on,
  so they are surfaced read-only alongside the real threaded ones. New replies
  are comments with parentId set.
*/
const shapeComment = (c, viewerId, replies = []) => ({
  _id: c._id,
  message: c.deleted ? null : c.message,
  deleted: !!c.deleted,
  author: authorLite(c.username),
  timestamp: c.timestamp,
  editedAt: c.editedAt || null,
  parentId: c.parentId || null,
  replyTo: c.replyTo ? authorLite(c.replyTo) : null,
  mentions: (c.mentions || []).map(authorLite),
  likes: (c.likes || []).length,
  isLiked: viewerId ? (c.likes || []).some((l) => sameId(l.username, viewerId)) : false,
  isMine: viewerId ? sameId(c.username?._id || c.username, viewerId) : false,
  replyCount: replies.length,
  replies,
});

const shapeLegacyReply = (r) => ({
  _id: r._id,
  message: r.message,
  deleted: false,
  author: r.userinfo ? authorLite(r.userinfo) : authorLite(r.username),
  timestamp: r.xtime,
  legacy: true,
  likes: 0,
  isLiked: false,
  replies: [],
  replyCount: 0,
});

// Comment authors, reply targets and mentions all need the same author fields.
const withCommentAuthors = (q) =>
  q.populate("comments.username", AUTHOR_FIELDS)
   .populate("comments.replyTo", AUTHOR_FIELDS)
   .populate("comments.mentions", AUTHOR_FIELDS);

const findComment = (post, commentId) =>
  (post.comments || []).find((c) => sameId(c._id, commentId));

const firstThumb = (doc) =>
  doc?.media?.[0]?.thumbnail || doc?.media?.[0]?.url ||
  (typeof doc?.videoUrl === "object" ? doc.videoUrl?.url : doc?.videoUrl) || undefined;

/* ------------------------------------------------------------------ */
/* 1. Like & React to Posts                                            */
/* ------------------------------------------------------------------ */

/*
  One endpoint for like, unlike and switching reaction. Posting the reaction
  you already have removes it, which is what a tap on a lit-up button means.
*/
export const react = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const type = String(req.body?.type || "like").toLowerCase();

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");
  if (!REACTIONS.includes(type)) {
    return fail(res, 400, `type must be one of: ${REACTIONS.join(", ")}`);
  }

  const post = await Reels.findById(id).select("likes username media videoUrl videoTitle").lean();
  if (!post) return fail(res, 404, "Post not found");

  if (await isBlockedEither(userId, post.username)) {
    return fail(res, 403, "You can't interact with this post");
  }

  const existing = (post.likes || []).find((l) => sameId(l.username, userId));
  let action;

  if (existing && (existing.type || "like") === type) {
    await Reels.updateOne({ _id: id }, { $pull: { likes: { username: oid(userId) } } });
    action = "removed";
  } else if (existing) {
    await Reels.updateOne(
      { _id: id },
      { $set: { "likes.$[el].type": type, "likes.$[el].xtime": new Date() } },
      { arrayFilters: [{ "el.username": oid(userId) }] }
    );
    action = "changed";
  } else {
    await Reels.updateOne(
      { _id: id },
      { $push: { likes: { username: oid(userId), type, count: 1, xtime: new Date() } } }
    );
    action = "added";
  }

  const fresh = await Reels.findById(id).select("likes").lean();
  const summary = reactionSummary(fresh.likes, userId);

  // Only a new or changed reaction is worth a notification; withdrawing one
  // leaves the existing record alone rather than pinging again.
  if (action !== "removed") {
    await notify({
      recipient: post.username,
      actor: userId,
      type: "like",
      post: id,
      reactionType: type,
      preview: post.videoTitle,
      thumbnail: firstThumb(post),
    });
  }

  ok(res, {
    message: `Reaction ${action}`,
    action,
    reaction: action === "removed" ? null : type,
    ...summary,
  });
});

export const unreact = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const post = await Reels.findById(id).select("_id").lean();
  if (!post) return fail(res, 404, "Post not found");

  await Reels.updateOne({ _id: id }, { $pull: { likes: { username: oid(userId) } } });
  const fresh = await Reels.findById(id).select("likes").lean();

  ok(res, {
    message: "Reaction removed",
    action: "removed",
    reaction: null,
    ...reactionSummary(fresh.likes, userId),
  });
});

/* Who reacted, optionally filtered to one reaction type. */
export const listReactions = wrap(async (req, res) => {
  const { id } = req.params;
  const viewerId = actorId(req);
  const { skip, limit, page } = paging(req);
  const filter = req.query.type ? String(req.query.type).toLowerCase() : null;

  if (!isId(id)) return fail(res, 400, "Valid post id is required");
  if (filter && !REACTIONS.includes(filter)) return fail(res, 400, "Unknown reaction type");

  const post = await Reels.findById(id).select("likes")
    .populate("likes.username", AUTHOR_FIELDS).lean();
  if (!post) return fail(res, 404, "Post not found");

  const hidden = isId(viewerId) ? await hiddenUserIds(viewerId) : [];
  const rows = (post.likes || [])
    .filter((l) => l.username)
    .filter((l) => !hidden.some((h) => sameId(h, l.username._id || l.username)))
    .filter((l) => !filter || (l.type || "like") === filter)
    .sort((a, b) => new Date(b.xtime || 0) - new Date(a.xtime || 0));

  ok(res, {
    page, limit, total: rows.length,
    ...reactionSummary(post.likes, viewerId),
    users: rows.slice(skip, skip + limit).map((l) => ({
      ...authorLite(l.username),
      reaction: l.type || "like",
      at: l.xtime,
    })),
  });
});

/* ------------------------------------------------------------------ */
/* 2 + 3. Comment on Posts, Reply to Comments (threaded)               */
/* ------------------------------------------------------------------ */

/*
  Creates a top-level comment, or a reply when `parentId` is supplied. Replies
  are stored flat in the same array; a reply to a reply re-parents onto the
  thread root, so a thread stays two deep — which is what the UI renders and
  what keeps replyCount meaningful.
*/
export const addComment = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const message = String(req.body?.message || "").trim();
  const { parentId } = req.body || {};

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");
  if (!message) return fail(res, 400, "message is required");
  if (message.length > 2200) return fail(res, 400, "Comment is too long (2200 characters max)");

  const post = await Reels.findById(id).select("comments username videoTitle media videoUrl").lean();
  if (!post) return fail(res, 404, "Post not found");

  if (await isBlockedEither(userId, post.username)) {
    return fail(res, 403, "You can't comment on this post");
  }

  let parent = null;
  let rootId = null;
  if (parentId) {
    if (!isId(parentId)) return fail(res, 400, "Invalid parentId");
    parent = findComment(post, parentId);
    if (!parent) return fail(res, 404, "The comment you're replying to no longer exists");
    rootId = parent.parentId || parent._id;
  }

  const mentions = await resolveMentions(message);
  const comment = {
    _id: new mongoose.Types.ObjectId(),
    username: oid(userId),
    message,
    timestamp: new Date(),
    parentId: rootId ? oid(rootId) : null,
    replyTo: parent ? parent.username : null,
    mentions,
    likes: [],
    reply: [],
  };

  await Reels.updateOne({ _id: id }, { $push: { comments: comment } });

  const thumbnail = firstThumb(post);

  if (parent) {
    await notify({
      recipient: parent.username, actor: userId, type: "reply",
      post: id, commentId: comment._id, preview: message, thumbnail,
    });
    // The post author hears about a reply too, unless they are the person
    // being replied to (notify() already drops the self case).
    if (!sameId(parent.username, post.username)) {
      await notify({
        recipient: post.username, actor: userId, type: "comment",
        post: id, commentId: comment._id, preview: message, thumbnail,
      });
    }
  } else {
    await notify({
      recipient: post.username, actor: userId, type: "comment",
      post: id, commentId: comment._id, preview: message, thumbnail,
    });
  }

  if (mentions.length) {
    await notifyMany(
      mentions.filter((m) => !sameId(m, post.username) && !sameId(m, parent?.username)),
      { actor: userId, type: "mention_comment", post: id, commentId: comment._id, preview: message, thumbnail }
    );
  }

  const saved = await withCommentAuthors(Reels.findById(id).select("comments")).lean();
  const fresh = findComment(saved, comment._id);

  ok(res, {
    message: parent ? "Reply added" : "Comment added",
    comment: shapeComment(fresh, userId),
    totalComments: (saved.comments || []).filter((c) => !c.deleted).length,
  });
});

/*
  Top-level comments with their first few replies inlined — the shape a comment
  sheet needs to render a thread without a round trip per comment.
*/
export const listComments = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  const { skip, limit, page } = paging(req);
  const replyPreview = Math.min(parseInt(req.query.replies, 10) || 2, 10);
  const sort = req.query.sort === "top" ? "top" : "recent";

  if (!isId(id)) return fail(res, 400, "Valid post id is required");

  const post = await withCommentAuthors(Reels.findById(id).select("comments")).lean();
  if (!post) return fail(res, 404, "Post not found");

  const hidden = isId(viewerId) ? await hiddenUserIds(viewerId) : [];
  const visible = (post.comments || []).filter(
    (c) => !hidden.some((h) => sameId(h, c.username?._id || c.username))
  );

  const byParent = new Map();
  for (const c of visible) {
    if (!c.parentId) continue;
    const k = String(c.parentId);
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(c);
  }

  // A deleted comment with no surviving replies is dropped entirely; one that
  // still holds replies stays as a tombstone so the thread does not collapse.
  let roots = visible
    .filter((c) => !c.parentId)
    .filter((c) => !c.deleted || (byParent.get(String(c._id)) || []).length > 0);

  if (sort === "top") {
    roots.sort((a, b) =>
      (b.likes?.length || 0) - (a.likes?.length || 0) ||
      new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    roots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  const items = roots.slice(skip, skip + limit).map((c) => {
    const threaded = (byParent.get(String(c._id)) || [])
      .filter((r) => !r.deleted)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const all = [
      ...(c.reply || []).map(shapeLegacyReply),
      ...threaded.map((r) => shapeComment(r, viewerId)),
    ];
    const shaped = shapeComment(c, viewerId, all.slice(0, replyPreview));
    shaped.replyCount = all.length;
    return shaped;
  });

  ok(res, {
    page, limit,
    total: roots.length,
    totalComments: visible.filter((c) => !c.deleted).length,
    hasMore: skip + limit < roots.length,
    comments: items,
  });
});

/* Full reply list for one thread. */
export const listReplies = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id, commentId } = req.params;
  const { skip, limit, page } = paging(req);

  if (!isId(id) || !isId(commentId)) {
    return fail(res, 400, "Valid post id and comment id are required");
  }

  const post = await withCommentAuthors(Reels.findById(id).select("comments")).lean();
  if (!post) return fail(res, 404, "Post not found");

  const parent = findComment(post, commentId);
  if (!parent) return fail(res, 404, "Comment not found");

  const hidden = isId(viewerId) ? await hiddenUserIds(viewerId) : [];
  const threaded = (post.comments || [])
    .filter((c) => sameId(c.parentId, commentId) && !c.deleted)
    .filter((c) => !hidden.some((h) => sameId(h, c.username?._id || c.username)))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((c) => shapeComment(c, viewerId));

  const all = [...(parent.reply || []).map(shapeLegacyReply), ...threaded];

  ok(res, {
    page, limit, total: all.length,
    hasMore: skip + limit < all.length,
    replies: all.slice(skip, skip + limit),
  });
});

export const editComment = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, commentId } = req.params;
  const message = String(req.body?.message || "").trim();

  if (!isId(id) || !isId(commentId) || !isId(userId)) {
    return fail(res, 400, "Valid post id, comment id and userId are required");
  }
  if (!message) return fail(res, 400, "message is required");

  const post = await Reels.findById(id).select("comments").lean();
  if (!post) return fail(res, 404, "Post not found");

  const comment = findComment(post, commentId);
  if (!comment) return fail(res, 404, "Comment not found");
  if (!sameId(comment.username, userId)) return fail(res, 403, "You can only edit your own comment");
  if (comment.deleted) return fail(res, 410, "This comment was deleted");

  const mentions = await resolveMentions(message);
  await Reels.updateOne(
    { _id: id, "comments._id": oid(commentId) },
    {
      $set: {
        "comments.$.message": message,
        "comments.$.mentions": mentions,
        "comments.$.editedAt": new Date(),
      },
    }
  );

  // Only people newly mentioned by the edit get pinged.
  const added = mentions.filter((m) => !(comment.mentions || []).some((old) => sameId(old, m)));
  if (added.length) {
    await notifyMany(added, {
      actor: userId, type: "mention_comment", post: id, commentId, preview: message,
    });
  }

  const saved = await withCommentAuthors(Reels.findById(id).select("comments")).lean();
  ok(res, { message: "Comment updated", comment: shapeComment(findComment(saved, commentId), userId) });
});

/*
  Soft delete. The post author can remove any comment on their post; the
  comment author can remove their own. Replies survive on a tombstone.
*/
export const deleteComment = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, commentId } = req.params;

  if (!isId(id) || !isId(commentId) || !isId(userId)) {
    return fail(res, 400, "Valid post id, comment id and userId are required");
  }

  const post = await Reels.findById(id).select("comments username").lean();
  if (!post) return fail(res, 404, "Post not found");

  const comment = findComment(post, commentId);
  if (!comment) return fail(res, 404, "Comment not found");

  const isCommentAuthor = sameId(comment.username, userId);
  const isPostAuthor = sameId(post.username, userId);
  if (!isCommentAuthor && !isPostAuthor) {
    return fail(res, 403, "You can only delete your own comment");
  }

  const hasReplies =
    (post.comments || []).some((c) => sameId(c.parentId, commentId) && !c.deleted) ||
    (comment.reply || []).length > 0;

  if (hasReplies) {
    await Reels.updateOne(
      { _id: id, "comments._id": oid(commentId) },
      { $set: { "comments.$.deleted": true, "comments.$.message": "", "comments.$.mentions": [] } }
    );
  } else {
    await Reels.updateOne({ _id: id }, { $pull: { comments: { _id: oid(commentId) } } });
  }

  // The notification pointing at this comment is no longer actionable.
  await Notification.deleteMany({ post: oid(id), commentId: oid(commentId) });

  const fresh = await Reels.findById(id).select("comments").lean();
  ok(res, {
    message: "Comment deleted",
    softDeleted: hasReplies,
    totalComments: (fresh.comments || []).filter((c) => !c.deleted).length,
  });
});

/* ------------------------------------------------------------------ */
/* 4. Heart / Favourite a Comment                                      */
/* ------------------------------------------------------------------ */

/*
  Replaces addReplyCommentsLikes, which looked the actor up by email and then
  wrote that email into an ObjectId field. Here the actor is an id throughout,
  a second tap removes the heart, and the author gets notified once.
*/
export const likeComment = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, commentId } = req.params;

  if (!isId(id) || !isId(commentId) || !isId(userId)) {
    return fail(res, 400, "Valid post id, comment id and userId are required");
  }

  const post = await Reels.findById(id).select("comments videoTitle media videoUrl").lean();
  if (!post) return fail(res, 404, "Post not found");

  const comment = findComment(post, commentId);
  if (!comment) return fail(res, 404, "Comment not found");
  if (comment.deleted) return fail(res, 410, "This comment was deleted");

  const liked = (comment.likes || []).some((l) => sameId(l.username, userId));

  if (liked) {
    await Reels.updateOne(
      { _id: id, "comments._id": oid(commentId) },
      { $pull: { "comments.$.likes": { username: oid(userId) } } }
    );
  } else {
    await Reels.updateOne(
      { _id: id, "comments._id": oid(commentId) },
      { $push: { "comments.$.likes": { username: oid(userId), count: 1, xtime: new Date() } } }
    );
    await notify({
      recipient: comment.username, actor: userId, type: "comment_like",
      post: id, commentId, preview: comment.message, thumbnail: firstThumb(post),
    });
  }

  const fresh = await Reels.findById(id).select("comments").lean();
  const updated = findComment(fresh, commentId);

  ok(res, {
    message: liked ? "Heart removed" : "Comment hearted",
    isLiked: !liked,
    likes: (updated.likes || []).length,
  });
});

/* Who hearted a comment. */
export const listCommentLikes = wrap(async (req, res) => {
  const { id, commentId } = req.params;
  const { skip, limit, page } = paging(req);

  if (!isId(id) || !isId(commentId)) {
    return fail(res, 400, "Valid post id and comment id are required");
  }

  const post = await Reels.findById(id).select("comments")
    .populate("comments.likes.username", AUTHOR_FIELDS).lean();
  if (!post) return fail(res, 404, "Post not found");

  const comment = findComment(post, commentId);
  if (!comment) return fail(res, 404, "Comment not found");

  const rows = (comment.likes || []).filter((l) => l.username);
  ok(res, {
    page, limit, total: rows.length,
    users: rows.slice(skip, skip + limit).map((l) => ({ ...authorLite(l.username), at: l.xtime })),
  });
});

/* ------------------------------------------------------------------ */
/* 5. Save / Bookmark Posts                                            */
/* ------------------------------------------------------------------ */

/*
  Saves were split across two places: the feed reads Reels.savepost while the
  old endpoint wrote a Savereel row, so a saved post never came back marked as
  saved. This writes both, treating Reels.savepost as the source of truth.
*/
export const toggleSave = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const post = await Reels.findById(id).select("savepost").lean();
  if (!post) return fail(res, 404, "Post not found");

  const saved = (post.savepost || []).some((s) => sameId(s.username, userId));

  if (saved) {
    await Reels.updateOne({ _id: id }, { $pull: { savepost: { username: oid(userId) } } });
    await Savereel.deleteMany({ userid: oid(userId), reels: oid(id) });
  } else {
    await Reels.updateOne(
      { _id: id },
      { $push: { savepost: { username: oid(userId), count: 1, xtime: new Date() } } }
    );
    // Kept in step so the existing /getSavetimeline screen still works.
    const exists = await Savereel.findOne({ userid: oid(userId), reels: oid(id) }).lean();
    if (!exists) await Savereel.create({ userid: oid(userId), reels: oid(id) });
  }

  const fresh = await Reels.findById(id).select("savepost").lean();
  ok(res, {
    message: saved ? "Removed from saved" : "Saved",
    isSaved: !saved,
    saves: (fresh.savepost || []).length,
  });
});

export const savedPosts = wrap(async (req, res) => {
  const userId = actorId(req);
  const { skip, limit, page } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { "savepost.username": oid(userId) };
  const [docs, total] = await Promise.all([
    Reels.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS)
      .populate("taggedUsers.user", "name image verifiedBadge")
      .lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(userId);
  ok(res, {
    page, limit, total,
    hasMore: skip + docs.length < total,
    items: docs.map((d) => shapeFeedItem(d, ctx)),
  });
});

/* ------------------------------------------------------------------ */
/* 6. Share Posts                                                      */
/* ------------------------------------------------------------------ */

/*
  Records the share against the original post — the counter the feed reads —
  and optionally creates a repost carrying the sharer's own commentary. The
  repost keeps the sharepost[] shape the current mobile card renders.
*/
export const sharePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { text = "", repost = true, target } = req.body || {};

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const post = await Reels.findById(id)
    .select("username videoTitle videoUrl media posttype shares").lean();
  if (!post) return fail(res, 404, "Post not found");

  if (await isBlockedEither(userId, post.username)) {
    return fail(res, 403, "You can't share this post");
  }

  const already = (post.shares || []).some((s) => sameId(s.username, userId));
  if (already) {
    await Reels.updateOne(
      { _id: id },
      { $inc: { "shares.$[el].count": 1 }, $set: { "shares.$[el].xtime": new Date() } },
      { arrayFilters: [{ "el.username": oid(userId) }] }
    );
  } else {
    await Reels.updateOne(
      { _id: id },
      { $push: { shares: { username: oid(userId), count: 1, xtime: new Date() } } }
    );
  }

  let created = null;
  if (repost) {
    created = await Reels.create({
      username: oid(userId),
      posttype: post.posttype || "Post",
      videoTitle: String(text || "").trim(),
      videoUrl: post.videoUrl,
      media: post.media || [],
      status: "active",
      status_draft_publish: "Publish",
      xtime: new Date(),
      sharepost: [{ user: oid(userId), text: String(text || "").trim(), originalPost: oid(id) }],
    });
  }

  await notify({
    recipient: post.username, actor: userId, type: "share",
    post: id, preview: text || post.videoTitle, thumbnail: firstThumb(post),
  });

  const fresh = await Reels.findById(id).select("shares").lean();
  ok(res, {
    message: "Post shared",
    // `target` is echoed back so a client sharing into chat or an external app
    // can correlate the response; the server does not route it.
    target: target || "feed",
    shares: (fresh.shares || []).reduce((s, x) => s + (x.count || 1), 0),
    sharers: (fresh.shares || []).length,
    repost: created ? { _id: created._id } : null,
  });
});

export const listShares = wrap(async (req, res) => {
  const { id } = req.params;
  const { skip, limit, page } = paging(req);
  if (!isId(id)) return fail(res, 400, "Valid post id is required");

  const post = await Reels.findById(id).select("shares")
    .populate("shares.username", AUTHOR_FIELDS).lean();
  if (!post) return fail(res, 404, "Post not found");

  const rows = (post.shares || [])
    .filter((s) => s.username)
    .sort((a, b) => new Date(b.xtime || 0) - new Date(a.xtime || 0));

  ok(res, {
    page, limit,
    total: rows.length,
    shares: rows.reduce((s, x) => s + (x.count || 1), 0),
    users: rows.slice(skip, skip + limit).map((s) => ({
      ...authorLite(s.username), count: s.count || 1, at: s.xtime,
    })),
  });
});

/* ------------------------------------------------------------------ */
/* 7. Mention Users (@username)                                        */
/* ------------------------------------------------------------------ */

/*
  Autocomplete for the @ picker. Ranks people the user actually knows first:
  accounts they follow, then their followers, then everyone else.
*/
export const suggestMentions = wrap(async (req, res) => {
  const userId = actorId(req);
  const q = String(req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);

  const me = isId(userId)
    ? await User.findById(userId).select("following followers").lean()
    : null;
  const hidden = isId(userId) ? await hiddenUserIds(userId) : [];

  const filter = {
    _id: { $nin: [...hidden.map(oid), ...(isId(userId) ? [oid(userId)] : [])] },
    accountStatus: { $ne: "banned" },
  };
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const users = await User.find(filter)
    .select(`${AUTHOR_FIELDS} privacySettings`)
    .limit(limit * 4)
    .lean();

  const following = new Set((me?.following || []).map(String));
  const followers = new Set((me?.followers || []).map(String));
  const rank = (u) => (following.has(String(u._id)) ? 0 : followers.has(String(u._id)) ? 1 : 2);

  const ranked = users
    .filter((u) => (u.privacySettings?.mentions ?? "everyone") !== "nobody")
    .sort((a, b) => rank(a) - rank(b) || String(a.name || "").localeCompare(String(b.name || "")))
    .slice(0, limit);

  ok(res, {
    users: ranked.map((u) => ({
      ...authorLite(u),
      // There is no separate handle field; @mentions match the name with
      // spaces stripped, which is what resolveMentions() looks for.
      handle: String(u.name || "").replace(/\s+/g, ""),
      relation: rank(u) === 0 ? "following" : rank(u) === 1 ? "follower" : "none",
    })),
  });
});

/* Preview what a caption's @names resolve to before it is posted. */
export const resolveMentionNames = wrap(async (req, res) => {
  const text = String(req.body?.text || req.query.text || "");
  const names = extractMentionNames(text);
  const ids = await resolveMentions(text);
  const users = await User.find({ _id: { $in: ids } }).select(AUTHOR_FIELDS).lean();

  ok(res, {
    names,
    resolved: users.map(authorLite),
    unresolved: names.filter(
      (n) => !users.some((u) => String(u.name || "").replace(/\s+/g, "").toLowerCase() === n)
    ),
  });
});

/* Posts and comments that mention me. */
export const mentionsFeed = wrap(async (req, res) => {
  const userId = actorId(req);
  const { skip, limit, page } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const hidden = await hiddenUserIds(userId);
  const filter = {
    $or: [{ mentions: oid(userId) }, { "comments.mentions": oid(userId) }],
    username: { $nin: hidden.map(oid) },
  };

  const [docs, total] = await Promise.all([
    Reels.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS).lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(userId);
  ok(res, {
    page, limit, total,
    hasMore: skip + docs.length < total,
    items: docs.map((d) => ({
      ...shapeFeedItem(d, ctx),
      mentionedInCaption: (d.mentions || []).some((m) => sameId(m, userId)),
      mentionedInComments: (d.comments || []).filter(
        (c) => (c.mentions || []).some((m) => sameId(m, userId))
      ).length,
    })),
  });
});

/* ------------------------------------------------------------------ */
/* 8. Tag Users in Photos                                              */
/* ------------------------------------------------------------------ */

/*
  Tags themselves are written by the feed controller. What was missing is the
  consent loop: a user with tagReview on gets a pending tag they can accept or
  decline, so a post never lands on their tagged feed without consent.
*/
export const pendingTags = wrap(async (req, res) => {
  const userId = actorId(req);
  const { skip, limit, page } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { taggedUsers: { $elemMatch: { user: oid(userId), approved: false } } };
  const [docs, total] = await Promise.all([
    Reels.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS)
      .populate("taggedUsers.user", "name image verifiedBadge").lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(userId);
  ok(res, { page, limit, total, items: docs.map((d) => shapeFeedItem(d, ctx)) });
});

export const respondToTag = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const action = String(req.body?.action || "").toLowerCase();

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");
  if (!["approve", "reject"].includes(action)) return fail(res, 400, "action must be approve or reject");

  const post = await Reels.findById(id).select("taggedUsers").lean();
  if (!post) return fail(res, 404, "Post not found");
  if (!(post.taggedUsers || []).some((t) => sameId(t.user, userId))) {
    return fail(res, 404, "You are not tagged in this post");
  }

  if (action === "approve") {
    await Reels.updateOne(
      { _id: id },
      { $set: { "taggedUsers.$[el].approved": true } },
      { arrayFilters: [{ "el.user": oid(userId) }] }
    );
  } else {
    await Reels.updateOne({ _id: id }, { $pull: { taggedUsers: { user: oid(userId) } } });
    await Notification.deleteMany({ recipient: oid(userId), post: oid(id), type: "tag" });
  }

  ok(res, { message: action === "approve" ? "Tag approved" : "Tag removed" });
});

/* Everyone tagged on a post, grouped by which carousel item they sit on. */
export const listTags = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid post id is required");

  const post = await Reels.findById(id).select("taggedUsers")
    .populate("taggedUsers.user", AUTHOR_FIELDS).lean();
  if (!post) return fail(res, 404, "Post not found");

  const approved = (post.taggedUsers || []).filter((t) => t.user && t.approved !== false);
  const byMedia = {};
  for (const t of approved) {
    const k = String(t.mediaIndex || 0);
    (byMedia[k] = byMedia[k] || []).push({
      ...authorLite(t.user), x: t.x, y: t.y, mediaIndex: t.mediaIndex || 0,
    });
  }

  ok(res, {
    total: approved.length,
    pending: (post.taggedUsers || []).filter((t) => t.approved === false).length,
    byMedia,
    users: approved.map((t) => ({
      ...authorLite(t.user), x: t.x, y: t.y, mediaIndex: t.mediaIndex || 0,
    })),
  });
});

/* ------------------------------------------------------------------ */
/* Aggregate counters — one call for a post's whole engagement bar      */
/* ------------------------------------------------------------------ */

export const engagementSummary = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid post id is required");

  const post = await Reels.findById(id)
    .select("likes comments shares savepost viewsCount taggedUsers").lean();
  if (!post) return fail(res, 404, "Post not found");

  ok(res, {
    ...reactionSummary(post.likes, viewerId),
    comments: (post.comments || []).filter((c) => !c.deleted).length,
    shares: (post.shares || []).reduce((s, x) => s + (x.count || 1), 0),
    saves: (post.savepost || []).length,
    isSaved: viewerId ? (post.savepost || []).some((s) => sameId(s.username, viewerId)) : false,
    views: post.viewsCount || 0,
    tags: (post.taggedUsers || []).filter((t) => t.approved !== false).length,
  });
});
