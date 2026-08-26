/*
  Feed engine for the Social Media module.

  One place builds the "who is this viewer" picture and one place scores a piece
  of content against it, so the home feed, For You, Trending and the
  recommendation endpoints all rank consistently.

  No external services: scoring is a weighted sum computed in Node over a
  candidate set that Mongo has already narrowed down.
*/

import mongoose from "mongoose";
import Reels from "../models/Reels.js";
import User from "../models/users.js";
import Hashtag from "../models/Hashtag.js";
import { hiddenUserIds, canView, relationship, effectiveSettings } from "./privacy.js";
import { meetsAgeGate } from "./safety.js";

export const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));

/*
  The soft-delete tombstone, as a query fragment.

  Deleting a post sets `status: "deleted"` and keeps the row, so anything that
  lists posts has to say it does not want those. baseMatch() below does; the
  older hand-rolled queries in reels.js and postreel.js each have to spread
  this in, and missing it is invisible -- the delete succeeds, the row is
  marked, and the post carries on appearing wherever the filter was forgotten.
  One definition so those queries cannot drift apart from baseMatch().

  "hidden" travels with it: a post a moderator has taken down is no more
  listable than one its author removed.
*/
export const NOT_DELETED = Object.freeze({ status: { $nin: ["hidden", "deleted"] } });

export const POSTTYPE = {
  post:  /^post$/i,
  reel:  /^reel$/i,
  story: /^stor(y|ies)$/i,
};

/* ------------------------------------------------------------------ */
/* text parsing                                                        */
/* ------------------------------------------------------------------ */

// Unicode-aware so Arabic hashtags work too.
export const extractHashtags = (text = "") => {
  const found = String(text).match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))];
};

export const extractMentionNames = (text = "") => {
  const found = String(text).match(/@[\p{L}\p{N}_.]+/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))];
};

/*
  Resolve @names to real user ids.

  There is no separate username field, so a handle is the display name with its
  spaces stripped: "Layla Hassan" is reachable as @LaylaHassan. The comparison
  has to strip spaces on the *stored* name too — matching a handle against the
  raw name never hits for anyone whose name contains a space, which is most
  people.
*/
export const resolveMentions = async (text) => {
  const names = extractMentionNames(text);
  if (names.length === 0) return [];

  const users = await User.find({
    $expr: {
      $in: [
        { $toLower: { $replaceAll: { input: { $ifNull: ["$name", ""] }, find: " ", replacement: "" } } },
        names,
      ],
    },
  }).select("_id").lean();

  return users.map((u) => u._id);
};

/* Keep the Hashtag collection in step whenever content is created or edited. */
export const touchHashtags = async (tags = [], when = new Date()) => {
  if (!tags.length) return;
  await Hashtag.bulkWrite(
    tags.map((tag) => ({
      updateOne: {
        filter: { tag },
        update: { $inc: { postCount: 1 }, $set: { lastUsedAt: when }, $setOnInsert: { tag } },
        upsert: true,
      },
    }))
  );
};

/* ------------------------------------------------------------------ */
/* viewer context                                                      */
/* ------------------------------------------------------------------ */

/*
  Everything the ranker needs about the viewer, fetched once per request:
    following      - ids they follow
    hidden         - blocked in either direction
    interestTags   - hashtags they engage with most
    affinity       - authors they interact with, scored
    seen           - content already viewed (stories + For You dedupe)
*/
export async function buildViewerContext(viewerId) {
  const ctx = {
    viewerId: isId(viewerId) ? String(viewerId) : null,
    following: [], hidden: [], interestTags: [], affinity: {}, seen: [],
    interest: null,
  };
  if (!ctx.viewerId) return ctx;

  const me = await User.findById(viewerId)
    .select("following interest closeFriends")
    .lean();
  if (!me) return ctx;

  ctx.following = (me.following || []).map(String);
  ctx.interest = me.interest || null;
  ctx.hidden = (await hiddenUserIds(viewerId)).map(String);

  // What the viewer has liked or commented on recently tells us both which
  // hashtags they care about and which authors they keep coming back to.
  const engaged = await Reels.find({
    $or: [{ "likes.username": oid(viewerId) }, { "comments.username": oid(viewerId) }],
  })
    .select("hashtags username")
    .sort({ xtime: -1 })
    .limit(200)
    .lean();

  const tagCount = {};
  for (const doc of engaged) {
    for (const t of doc.hashtags || []) tagCount[t] = (tagCount[t] || 0) + 1;
    const author = String(doc.username);
    ctx.affinity[author] = (ctx.affinity[author] || 0) + 1;
  }

  ctx.interestTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([t]) => t);

  const seen = await Reels.find({ "viewedBy.user": oid(viewerId) })
    .select("_id")
    .sort({ xtime: -1 })
    .limit(300)
    .lean();
  ctx.seen = seen.map((s) => String(s._id));

  return ctx;
}

/* ------------------------------------------------------------------ */
/* scoring                                                            */
/* ------------------------------------------------------------------ */

const HOUR = 3600 * 1000;

/* Raw engagement, weighted by how much effort each action takes. */
export function engagementOf(doc) {
  const n = (a) => (Array.isArray(a) ? a.length : 0);
  return (
    n(doc.likes) * 1 +
    n(doc.comments) * 3 +
    n(doc.shares) * 4 +
    n(doc.savepost) * 3 +
    n(doc.favorites) * 2 +
    (doc.viewsCount || 0) * 0.05
  );
}

/*
  Hacker-News style decay: strong content stays up for a while, but nothing
  outranks fresh material forever. gravity 1.5 over hours.
*/
export function timeDecay(date, gravity = 1.5) {
  const ageHours = Math.max((Date.now() - new Date(date || Date.now()).getTime()) / HOUR, 0);
  return 1 / Math.pow(ageHours + 2, gravity);
}

/*
  For You score. Returns the number plus the reasons, so the app can show
  "Because you follow X" and so the ranking is debuggable.
*/
export function scoreForYou(doc, ctx) {
  const reasons = [];
  const author = String(doc.username?._id || doc.username);

  const engagement = engagementOf(doc);
  const decay = timeDecay(doc.xtime);

  // Baseline: popularity that fades with age
  let score = engagement * decay * 10;

  if (ctx.following.includes(author)) {
    score += 25;
    reasons.push("from someone you follow");
  }

  const affinity = ctx.affinity[author] || 0;
  if (affinity > 0) {
    score += Math.min(affinity * 4, 20);
    reasons.push("you interact with this creator");
  }

  const shared = (doc.hashtags || []).filter((t) => ctx.interestTags.includes(t));
  if (shared.length) {
    score += Math.min(shared.length * 8, 24);
    reasons.push(`about #${shared[0]}`);
  }

  // A little freshness bonus so brand-new posts get a chance to be seen
  const ageHours = (Date.now() - new Date(doc.xtime || Date.now()).getTime()) / HOUR;
  if (ageHours < 6) {
    score += 12 * (1 - ageHours / 6);
    reasons.push("posted recently");
  }

  // Media-rich content performs better in a visual feed
  const mediaCount = (doc.media || []).length;
  if (mediaCount > 1) score += 3;
  if (doc.poll) score += 5;

  // Already-seen content sinks rather than disappearing
  if (ctx.seen.includes(String(doc._id))) {
    score *= 0.25;
    reasons.push("seen before");
  }

  // Never show the viewer their own posts in For You
  if (ctx.viewerId && author === ctx.viewerId) score = -1;

  return { score, reasons };
}

/* Trending is popularity-first with a sharper decay — it is a "right now" list. */
export function scoreTrending(doc) {
  return engagementOf(doc) * timeDecay(doc.xtime, 1.8) * 100;
}

/* ------------------------------------------------------------------ */
/* visibility filtering                                                */
/* ------------------------------------------------------------------ */

/*
  Base match for any feed query: published, not hidden by a moderator, not
  from a blocked account, and (for stories) not expired.
*/
export function baseMatch(ctx, { type, includeExpired = false, group = null } = {}) {
  const match = {
    ...NOT_DELETED,
    /*
      Drafts never appear. Scheduled posts are excluded by their own date
      rather than by this field: a post whose time has come is publishable even
      if the publisher has not run yet, and one whose time has not come must
      stay out no matter what its status says. The date is the source of truth,
      so a late scheduler publishes late and never early.
    */
    status_draft_publish: { $ne: "Draft" },
    $and: [{ $or: [
      { status_draft_publish: { $ne: "Scheduled" } },
      { scheduledFor: { $lte: new Date() } },
    ] }],
    /*
      Group posts are readable only through the group's own feed, so the public
      timeline asks for `group: null`. Mongo matches a missing field against
      null, which is what keeps every post written before groups existed in the
      feed. Pass a group id to invert this and read that group instead.
    */
    group: group || null,
  };
  if (group) match.groupStatus = "approved";

  if (type && POSTTYPE[type]) match.posttype = POSTTYPE[type];
  if (ctx.hidden.length) match.username = { $nin: ctx.hidden.map(oid) };
  if (!includeExpired) {
    match.$or = [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }];
  }
  return match;
}

/*
  Second pass: drop anything this viewer must not see. Runs on the candidate
  page only, so it stays cheap.

  Three rules are layered here, in order of how specific they are:

    1. posts the viewer has hidden themselves ("not interested")
    2. the post's own `audience`, which overrides the account-level setting
    3. the account-level privacy setting, for posts that set no audience

  Two overrides rather than one combined test, because a public post on a
  followers-only account is exactly what a per-post control is for; ANDing the
  two settings would make that impossible to express. Age-restricted posts are
  gated separately, since being old enough is not a relationship.
*/
export async function filterByPrivacy(docs, viewerId, area = "posts") {
  if (docs.length === 0) return [];

  const authorIds = [...new Set(docs.map((d) => String(d.username?._id || d.username)))];
  const authors = await User.find({ _id: { $in: authorIds.map(oid) } })
    .select("privacy privacySettings followers followRequests closeFriends blockedUsers")
    .lean();
  const byId = Object.fromEntries(authors.map((a) => [String(a._id), a]));

  // The viewer's own hide list and date of birth, both per-viewer rather than
  // per-author, so they are read once for the whole page.
  const viewer = isId(viewerId)
    ? await User.findById(viewerId).select("hiddenPosts dateofbirth").lean()
    : null;
  const hiddenPostIds = new Set((viewer?.hiddenPosts || []).map(String));
  const oldEnough = meetsAgeGate(viewer);

  const allowed = {};
  for (const id of authorIds) {
    const author = byId[id];
    if (!author) { allowed[id] = false; continue; }
    if (viewerId && String(viewerId) === id) { allowed[id] = true; continue; }
    const rel = await relationship(viewerId, author);
    allowed[id] = await canView(viewerId, author, area, rel);
  }

  const holds = (list, id) => (list || []).some((x) => String(x?._id || x) === String(id));

  return docs.filter((d) => {
    const authorId = String(d.username?._id || d.username);

    // Applies to the author too: hiding your own post from your own feed is a
    // legitimate thing to want, and nothing else here would honour it.
    if (hiddenPostIds.has(String(d._id))) return false;

    const mine = viewerId && String(viewerId) === authorId;
    if (mine) return true;

    if (d.ageRestricted && !oldEnough) return false;

    const audience = d.audience;
    if (audience === "onlyMe") return false;
    // Posts written before the field existed carry no audience and fall
    // through to the account-level setting, which is what they always used.
    if (audience === "everyone") return true;
    if (audience === "followers") return holds(byId[authorId]?.followers, viewerId);
    if (audience === "closeFriends") return holds(byId[authorId]?.closeFriends, viewerId);

    return allowed[authorId];
  });
}

/* ------------------------------------------------------------------ */
/* response shaping                                                    */
/* ------------------------------------------------------------------ */

/*
  Normalised feed item. Keeps the field names the existing mobile screens
  already read (videoUrl, videoTitle, likes as a count, userInfo, followStatus)
  and adds the new structures alongside them.
*/
export function shapeFeedItem(doc, ctx = {}, extras = {}) {
  const author = doc.username && typeof doc.username === "object" ? doc.username : null;
  const authorId = String(author?._id || doc.username);
  const viewer = ctx.viewerId;

  const count = (a) => (Array.isArray(a) ? a.length : 0);
  const sumCount = (a) => (Array.isArray(a) ? a.reduce((s, x) => s + (x.count || 1), 0) : 0);

  // Fall back to the legacy videoUrl when a document predates media[]
  let media = doc.media || [];
  if (media.length === 0 && doc.videoUrl) {
    const v = doc.videoUrl;
    if (typeof v === "string") media = [{ url: v, type: /\.(mp4|mov|webm|m3u8)/i.test(v) ? "video" : "image", order: 0 }];
    else if (Array.isArray(v)) media = v.map((x, i) => ({ url: typeof x === "string" ? x : x.url, type: (typeof x === "object" && x.type) || "image", order: i }));
    else if (typeof v === "object" && (v.url || v.uri)) media = [{ url: v.url || v.uri, type: v.type || "image", order: 0 }];
  }

  let poll = null;
  if (doc.poll) {
    const totalVotes = (doc.poll.options || []).reduce((s, o) => s + count(o.votes), 0);
    const myVotes = viewer
      ? (doc.poll.options || []).filter((o) => (o.votes || []).some((v) => String(v) === viewer)).map((o) => o.id)
      : [];
    const ended = doc.poll.closed || (doc.poll.endsAt && new Date(doc.poll.endsAt) < new Date());
    // Results stay hidden until the viewer votes or the poll ends
    const reveal = myVotes.length > 0 || ended;

    poll = {
      question: doc.poll.question,
      multiple: !!doc.poll.multiple,
      endsAt: doc.poll.endsAt || null,
      closed: !!ended,
      totalVotes,
      hasVoted: myVotes.length > 0,
      myVotes,
      options: (doc.poll.options || []).map((o) => ({
        id: o.id,
        text: o.text,
        votes: reveal ? count(o.votes) : null,
        percent: reveal && totalVotes ? Math.round((count(o.votes) / totalVotes) * 100) : null,
      })),
    };
  }

  return {
    _id: doc._id,
    posttype: doc.posttype,
    posttypechild: doc.posttypechild,

    // legacy fields the current app screens read
    videoUrl: doc.videoUrl,
    videoTitle: doc.videoTitle,
    sound: doc.sound,
    videosound: doc.videosound,
    username: authorId,
    xtime: doc.xtime,

    // new structures
    caption: doc.videoTitle || "",
    music: doc.music || null,
    effects: doc.effects || null,
    media,
    isCarousel: media.length > 1,
    mediaCount: media.length,
    poll,
    place: doc.place || (doc.location ? { name: doc.location } : null),
    hashtags: doc.hashtags || [],
    taggedUsers: (doc.taggedUsers || []).map((t) => ({
      user: t.user && typeof t.user === "object"
        ? { _id: t.user._id, name: t.user.name, image: t.user.image, verifiedBadge: !!t.user.verifiedBadge }
        : t.user,
      x: t.x, y: t.y, mediaIndex: t.mediaIndex,
      // Surfaced so a client can render a tag awaiting the taggee's approval
      // differently from a live one.
      approved: t.approved !== false,
    })),
    mentions: doc.mentions || [],
    expiresAt: doc.expiresAt || null,

    // counts
    likes: sumCount(doc.likes),
    // Reaction breakdown. Rows written before reactions existed carry no
    // `type` and count as a plain like.
    reactions: (doc.likes || []).reduce((acc, l) => {
      const t = l.type || "like";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
    // A legacy row has no `type`, so an existing row still reads back as a
    // like rather than contradicting isLiked below.
    myReaction: viewer
      ? ((doc.likes || []).some((l) => String(l.username) === viewer)
          ? ((doc.likes || []).find((l) => String(l.username) === viewer).type || "like")
          : null)
      : null,
    dislikes: sumCount(doc.dislikes),
    comments: (doc.comments || []).filter((c) => !c.deleted).length,
    favorites: sumCount(doc.favorites),
    shares: sumCount(doc.shares),
    saves: count(doc.savepost),
    stars: sumCount(doc.stars),
    views: doc.viewsCount || 0,
    commentsdetails: (doc.comments || []).filter((c) => !c.deleted),

    // viewer state
    isLiked: viewer ? (doc.likes || []).some((l) => String(l.username) === viewer) : false,
    isSaved: viewer ? (doc.savepost || []).some((s) => String(s.username) === viewer) : false,
    isViewed: viewer ? (doc.viewedBy || []).some((v) => String(v.user) === viewer) : false,
    followStatus: ctx.following?.includes(authorId) ? "follow" : "not follow",
    isMine: viewer === authorId,

    userInfo: author
      ? {
          userid: author._id,
          name: author.name,
          email: author.email,
          image: author.image,
          bio: author.bio,
          gender: author.gender,
          nationality: author.nationality,
          verifiedBadge: !!author.verifiedBadge,
          accountType: author.accountType || "personal",
        }
      : null,

    ...extras,
  };
}

export const AUTHOR_FIELDS = "name email image bio gender nationality verifiedBadge accountType privacy";
