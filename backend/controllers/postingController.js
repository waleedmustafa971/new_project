/*
  Posting & Content Creation API — Social Media module.

  Covers the create-side features of the module sheet:
    Upload Multiple Photos / Videos  multi-file upload returning ordered media[]
    Save Post as Draft ............. draft list, autosave, publish, discard
    Edit or Delete a Post .......... full edit surface + soft delete / restore
    Captions with Emojis ........... grapheme-correct length, emoji extraction
    Add Music to Videos or Stories . library search, trim, attach, trending
    Camera Filters & Beauty Effects  catalogue the capture screen reads

  Live-stream creation features (start, co-host, guests, gifting) live in
  controllers/liveController.js — same sheet section, different subsystem.
*/

import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import Reels from "../models/Reels.js";
import Music from "../models/Music.js";
import Filter from "../models/Filter.js";
import User from "../models/users.js";
import Notification from "../models/Notification.js";
import {
  isId, AUTHOR_FIELDS,
  extractHashtags, resolveMentions, touchHashtags,
  buildViewerContext, shapeFeedItem,
} from "../helpers/feed.js";
import { notifyMany } from "../services/notificationService.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[posting]", req.method, req.originalUrl, err);
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

/* ---- captions ---- */

export const CAPTION_MAX = 2200;

/*
  Caption length has to be counted in grapheme clusters, not code units.
  "👨‍👩‍👧‍👦" is one character to a person and eleven to `String.length`, and a
  flag or a skin-toned emoji is two or more — counting code units rejects
  captions that are visibly well inside the limit.
*/
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

export const captionLength = (text = "") => {
  const s = String(text);
  if (!segmenter) return [...s].length; // code points still beat code units
  let n = 0;
  for (const _ of segmenter.segment(s)) n += 1;
  return n;
};

// Extended_Pictographic covers emoji proper; the ZWJ/selector run keeps a
// multi-part sequence (family, profession, skin tone) together as one match.
const EMOJI_RE = /\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|[️\u{1F3FB}-\u{1F3FF}])*/gu;

export const extractEmojis = (text = "") => String(text).match(EMOJI_RE) || [];

const validateCaption = (text) => {
  const len = captionLength(text);
  if (len > CAPTION_MAX) {
    return `Caption is too long — ${len} of ${CAPTION_MAX} characters`;
  }
  return null;
};

/* ---- media ---- */

const VIDEO_RE = /\.(mp4|mov|m4v|webm|mkv|avi|m3u8)$/i;

const mediaTypeOf = (nameOrUrl = "", mimetype = "") =>
  mimetype.startsWith("video/") || VIDEO_RE.test(String(nameOrUrl)) ? "video" : "image";

const cleanMediaList = (media = []) =>
  media
    .map((m, i) => ({
      url: m.url,
      type: m.type || mediaTypeOf(m.url),
      thumbnail: m.thumbnail,
      width: m.width,
      height: m.height,
      duration: m.duration,
      altText: m.altText,
      order: m.order !== undefined ? m.order : i,
    }))
    .sort((a, b) => a.order - b.order);

/* ---- music ---- */

const shapeTrack = (t) => t && ({
  _id: t._id,
  title: t.musicname,
  artist: t.artist || "",
  url: t.musicfile,
  coverImage: t.coverImage || t.image,
  duration: t.duration,
  genre: t.genre || t.music_group,
  usageCount: t.usageCount || 0,
  featured: !!t.featured,
});

/*
  Build the embedded music object for a post. Copies title/artist/url next to
  the reference so the sound strip survives the track leaving the catalogue.
*/
const buildPostMusic = async (music) => {
  if (!music) return null;
  const trackId = music.track || music.trackId || music._id;
  if (!isId(trackId)) return null;

  const track = await Music.findById(trackId).lean();
  if (!track) return null;

  const startAt = Math.max(Number(music.startAt) || 0, 0);
  let duration = music.duration !== undefined ? Number(music.duration) : undefined;
  if (duration !== undefined && !Number.isFinite(duration)) duration = undefined;
  // A trim cannot run past the end of the track it is trimming.
  if (duration !== undefined && track.duration) {
    duration = Math.min(duration, Math.max(track.duration - startAt, 0));
  }

  const volume = music.volume === undefined ? 1 : Math.min(Math.max(Number(music.volume), 0), 1);

  return {
    track: track._id,
    title: track.musicname,
    artist: track.artist || "",
    url: track.musicfile,
    coverImage: track.coverImage || track.image,
    startAt,
    duration,
    volume: Number.isFinite(volume) ? volume : 1,
  };
};

/* ---- effects ---- */

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, 0), 1);
};

const buildEffects = async (effects) => {
  if (!effects) return null;

  let filterDoc = null;
  const filterId = effects.filter || effects.filterId;
  if (isId(filterId)) filterDoc = await Filter.findById(filterId).lean();

  const beautyIn = effects.beauty || {};
  const beauty = {
    smooth: clamp01(beautyIn.smooth),
    slim: clamp01(beautyIn.slim),
    brighten: clamp01(beautyIn.brighten),
    eyes: clamp01(beautyIn.eyes),
  };
  const hasBeauty = Object.values(beauty).some((v) => v !== undefined);

  if (!filterDoc && !hasBeauty) return null;

  return {
    filter: filterDoc?._id,
    filterName: filterDoc?.name || effects.filterName,
    intensity: clamp01(effects.intensity) ?? 1,
    beauty: hasBeauty ? beauty : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* 1. Upload Multiple Photos / Videos                                  */
/* ------------------------------------------------------------------ */

/*
  Takes the files multer has already written to /uploads and returns them as
  media[] entries, ordered as they were sent. The client posts that array
  straight back to /apis/feed/posts — upload and create stay separate so a
  failed post does not mean re-uploading a 100 MB video.
*/
export const uploadMedia = wrap(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return fail(res, 400, "No files uploaded");

  // Positional metadata: altText[0], width[0]… line up with the file order.
  const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const altText = asArray(req.body?.altText);
  const widths = asArray(req.body?.width);
  const heights = asArray(req.body?.height);
  const durations = asArray(req.body?.duration);
  const thumbs = asArray(req.body?.thumbnail);

  const media = files.map((f, i) => ({
    url: `/uploads/${f.filename}`,
    type: mediaTypeOf(f.originalname, f.mimetype),
    thumbnail: thumbs[i] || undefined,
    width: widths[i] ? Number(widths[i]) : undefined,
    height: heights[i] ? Number(heights[i]) : undefined,
    duration: durations[i] ? Number(durations[i]) : undefined,
    altText: altText[i] || undefined,
    order: i,
    sizeBytes: f.size,
    originalName: f.originalname,
  }));

  ok(res, {
    message: `${media.length} file(s) uploaded`,
    count: media.length,
    // Ready to hand straight to POST /apis/feed/posts as `media`.
    media,
  });
});

/* Remove an uploaded file that never made it into a post. */
export const discardUpload = wrap(async (req, res) => {
  const url = String(req.body?.url || "");
  const name = path.basename(url);

  // Only ever unlink inside /uploads, and only a bare filename — a url of
  // "../../index.js" must not resolve anywhere interesting.
  if (!name || name !== url.replace(/^\/uploads\//, "")) {
    return fail(res, 400, "url must be an /uploads path");
  }

  const inUse = await Reels.findOne({ "media.url": `/uploads/${name}` }).select("_id").lean();
  if (inUse) return fail(res, 409, "That file is attached to a post");

  const full = path.join(process.cwd(), "uploads", name);
  if (!fs.existsSync(full)) return fail(res, 404, "File not found");
  fs.unlinkSync(full);

  ok(res, { message: "Upload discarded" });
});

/* ------------------------------------------------------------------ */
/* 2. Save Post as Draft                                               */
/* ------------------------------------------------------------------ */

export const listDrafts = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = {
    username: oid(userId),
    status_draft_publish: "Draft",
    status: { $ne: "deleted" },
  };

  const [docs, total] = await Promise.all([
    Reels.find(filter)
      .sort({ draftUpdatedAt: -1, xtime: -1 })
      .skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS)
      .populate("taggedUsers.user", "name image verifiedBadge")
      .lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(userId);
  ok(res, {
    page, limit, total,
    hasMore: skip + docs.length < total,
    drafts: docs.map((d) => ({
      ...shapeFeedItem(d, ctx),
      draftUpdatedAt: d.draftUpdatedAt || d.xtime,
    })),
  });
});

/*
  Create or update a draft. Sending an `id` autosaves over the existing draft
  rather than piling up a new row per keystroke, which is what a compose screen
  saving on a timer needs.
*/
export const saveDraft = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const {
    id, caption = "", posttype = "Post", posttypechild,
    media = [], music, effects, taggedUsers,
    xbackgroundcolor, xfontstyle, xfontsize, xtextalign,
  } = req.body || {};

  const bad = validateCaption(caption);
  if (bad) return fail(res, 400, bad);

  const now = new Date();
  const patch = {
    videoTitle: caption,
    posttype, posttypechild,
    media: cleanMediaList(media),
    hashtags: extractHashtags(caption),
    mentions: await resolveMentions(caption),
    status: "active",
    status_draft_publish: "Draft",
    draftUpdatedAt: now,
    xbackgroundcolor, xfontstyle, xfontsize, xtextalign,
  };

  const track = await buildPostMusic(music);
  if (track) patch.music = track;
  const fx = await buildEffects(effects);
  if (fx) patch.effects = fx;
  if (Array.isArray(taggedUsers)) {
    patch.taggedUsers = taggedUsers
      .map((t) => (typeof t === "string" ? { user: t } : t))
      .filter((t) => isId(t.user))
      .map((t) => ({ user: oid(t.user), x: t.x, y: t.y, mediaIndex: t.mediaIndex || 0, approved: true }));
  }
  // videoUrl is required on the schema, so a text-only draft still needs one.
  // Same placeholder feedController.createPost writes for a text post.
  patch.videoUrl = patch.media[0]
    ? { url: patch.media[0].url, type: patch.media[0].type }
    : { url: "", type: "text" };

  let doc;
  if (id) {
    if (!isId(id)) return fail(res, 400, "Invalid draft id");
    const existing = await Reels.findById(id).select("username status_draft_publish").lean();
    if (!existing) return fail(res, 404, "Draft not found");
    if (!sameId(existing.username, userId)) return fail(res, 403, "That draft isn't yours");
    if (existing.status_draft_publish === "Publish") {
      return fail(res, 409, "That post is already published — edit it instead");
    }
    doc = await Reels.findByIdAndUpdate(id, patch, { new: true }).lean();
  } else {
    doc = await Reels.create({ ...patch, username: oid(userId), xtime: now });
  }

  ok(res, { message: "Draft saved", draftId: doc._id, draftUpdatedAt: now });
});

/*
  Publish a draft. Hashtag counts and tag/mention notifications are deliberately
  deferred to this moment — a draft that was edited ten times must not have
  pinged the people in it ten times, or counted its hashtags ten times.
*/
export const publishDraft = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid draft id and userId are required");

  const draft = await Reels.findById(id).lean();
  if (!draft) return fail(res, 404, "Draft not found");
  if (!sameId(draft.username, userId)) return fail(res, 403, "That draft isn't yours");
  if (draft.status_draft_publish === "Publish") return fail(res, 409, "Already published");

  const hasBody = (draft.media || []).length > 0 || String(draft.videoTitle || "").trim().length > 0;
  if (!hasBody) return fail(res, 400, "A post needs a caption or at least one photo or video");

  const now = new Date();
  await Reels.updateOne({ _id: id }, {
    $set: { status_draft_publish: "Publish", publishedAt: now, xtime: now },
  });

  if ((draft.hashtags || []).length) await touchHashtags(draft.hashtags, now);
  if (draft.music?.track) {
    await Music.updateOne({ _id: draft.music.track }, { $inc: { usageCount: 1 } });
  }
  if (draft.effects?.filter) {
    await Filter.updateOne({ _id: draft.effects.filter }, { $inc: { usageCount: 1 } });
  }

  const thumbnail = draft.media?.[0]?.thumbnail || draft.media?.[0]?.url;
  const tagged = (draft.taggedUsers || []).map((t) => t.user);
  if (tagged.length) {
    await notifyMany(tagged, {
      actor: userId, type: "tag", post: id, preview: draft.videoTitle, thumbnail,
    });
  }
  if ((draft.mentions || []).length) {
    const taggedSet = new Set(tagged.map(String));
    await notifyMany((draft.mentions || []).filter((m) => !taggedSet.has(String(m))), {
      actor: userId, type: "mention_post", post: id, preview: draft.videoTitle, thumbnail,
    });
  }

  const full = await Reels.findById(id)
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();
  const ctx = await buildViewerContext(userId);

  ok(res, { message: "Published", item: shapeFeedItem(full, ctx) });
});

export const discardDraft = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid draft id and userId are required");

  const draft = await Reels.findById(id).select("username status_draft_publish").lean();
  if (!draft) return fail(res, 404, "Draft not found");
  if (!sameId(draft.username, userId)) return fail(res, 403, "That draft isn't yours");
  if (draft.status_draft_publish === "Publish") {
    return fail(res, 409, "That post is published — delete it instead");
  }

  // A draft was never visible to anyone, so it goes for real.
  await Reels.deleteOne({ _id: id });
  ok(res, { message: "Draft discarded" });
});

export const draftCount = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  ok(res, {
    drafts: await Reels.countDocuments({
      username: oid(userId), status_draft_publish: "Draft", status: { $ne: "deleted" },
    }),
  });
});

/* ------------------------------------------------------------------ */
/* 3. Edit or Delete a Post                                            */
/* ------------------------------------------------------------------ */

/*
  The edit surface the compose screen needs. feedController.updatePost already
  handles caption, place, tags and media; this adds music, effects and the text
  styling fields, and re-counts hashtags when the caption changes.
*/
export const editPost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username hashtags music effects status").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (!sameId(doc.username, userId)) return fail(res, 403, "You can only edit your own post");
  if (doc.status === "deleted") return fail(res, 410, "That post was deleted");

  const update = {};

  if (req.body.caption !== undefined) {
    const bad = validateCaption(req.body.caption);
    if (bad) return fail(res, 400, bad);
    update.videoTitle = req.body.caption;
    update.hashtags = extractHashtags(req.body.caption);
    update.mentions = await resolveMentions(req.body.caption);
  }

  if (Array.isArray(req.body.media)) {
    const media = cleanMediaList(req.body.media);
    if (media.some((m) => !m.url)) return fail(res, 400, "Every media item needs a url");
    update.media = media;
    if (media[0]) update.videoUrl = { url: media[0].url, type: media[0].type };
  }

  // `null` clears the track; omitting the key leaves it alone.
  if (req.body.music !== undefined) {
    update.music = req.body.music === null ? undefined : await buildPostMusic(req.body.music);
    if (req.body.music && !update.music) return fail(res, 404, "That track is not in the library");
  }
  if (req.body.effects !== undefined) {
    update.effects = req.body.effects === null ? undefined : await buildEffects(req.body.effects);
  }

  for (const k of ["xbackgroundcolor", "xfontstyle", "xfontsize", "xtextalign", "posttypechild"]) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }

  if (Object.keys(update).length === 0) return fail(res, 400, "Nothing to update");

  update.editedAt = new Date();
  const saved = await Reels.findByIdAndUpdate(id, update, { new: true })
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  // Only tags the edit introduced are counted.
  const added = (update.hashtags || []).filter((t) => !(doc.hashtags || []).includes(t));
  if (added.length) await touchHashtags(added);

  const ctx = await buildViewerContext(userId);
  ok(res, { message: "Post updated", item: shapeFeedItem(saved, ctx) });
});

/*
  Soft delete by default: the row survives so shares pointing at it, and the
  author's own restore window, both still work. `?hard=true` removes it for
  good along with everything referencing it.
*/
export const deletePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const hard = String(req.query.hard || req.body?.hard || "") === "true";

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username hashtags music status").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (!sameId(doc.username, userId)) return fail(res, 403, "You can only delete your own post");

  if (hard) {
    await Reels.deleteOne({ _id: id });
    await Notification.deleteMany({ post: oid(id) });
    // Reposts quoting it would render an empty card.
    await Reels.deleteMany({ "sharepost.originalPost": oid(id) });
  } else {
    if (doc.status === "deleted") return fail(res, 409, "That post is already deleted");
    await Reels.updateOne({ _id: id }, { $set: { status: "deleted", deletedAt: new Date() } });
    await Notification.deleteMany({ post: oid(id) });
  }

  if (doc.music?.track) {
    await Music.updateOne({ _id: doc.music.track, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
  }

  ok(res, { message: hard ? "Post deleted permanently" : "Post deleted", hard });
});

export const restorePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username status music").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (!sameId(doc.username, userId)) return fail(res, 403, "That post isn't yours");
  if (doc.status !== "deleted") return fail(res, 409, "That post isn't deleted");

  await Reels.updateOne({ _id: id }, { $set: { status: "active" }, $unset: { deletedAt: "" } });
  if (doc.music?.track) await Music.updateOne({ _id: doc.music.track }, { $inc: { usageCount: 1 } });

  ok(res, { message: "Post restored" });
});

/* The author's own recycle bin. */
export const listDeleted = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { username: oid(userId), status: "deleted" };
  const [docs, total] = await Promise.all([
    Reels.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS).lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(userId);
  ok(res, {
    page, limit, total,
    items: docs.map((d) => ({ ...shapeFeedItem(d, ctx), deletedAt: d.deletedAt })),
  });
});

/* ------------------------------------------------------------------ */
/* 4. Captions with Emojis                                             */
/* ------------------------------------------------------------------ */

/*
  Lets the compose screen show the same character count the server will
  enforce, instead of guessing with String.length and disagreeing on emoji.
*/
export const inspectCaption = wrap(async (req, res) => {
  const text = String(req.body?.caption ?? req.body?.text ?? req.query.caption ?? "");
  const emojis = extractEmojis(text);
  const length = captionLength(text);

  ok(res, {
    length,
    max: CAPTION_MAX,
    remaining: CAPTION_MAX - length,
    valid: length <= CAPTION_MAX,
    // Where String.length would have landed — the two differ on any emoji.
    rawLength: text.length,
    emojis,
    emojiCount: emojis.length,
    hashtags: extractHashtags(text),
    mentions: (String(text).match(/@[\p{L}\p{N}_.]+/gu) || []).map((m) => m.slice(1)),
  });
});

/* ------------------------------------------------------------------ */
/* 5. Add Music to Videos or Stories                                   */
/* ------------------------------------------------------------------ */

export const listMusic = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const q = String(req.query.q || "").trim();
  const genre = String(req.query.genre || "").trim();
  const sort = req.query.sort === "popular" ? { usageCount: -1 } : { xtime: -1 };

  const filter = { status: { $ne: "Inactive" } };
  if (genre) filter.$or = [{ genre }, { music_group: genre }];
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and = [{ $or: [{ musicname: rx }, { artist: rx }] }];
  }

  const [rows, total] = await Promise.all([
    Music.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Music.countDocuments(filter),
  ]);

  ok(res, { page, limit, total, hasMore: skip + rows.length < total, tracks: rows.map(shapeTrack) });
});

/* Editorially featured first, then whatever is actually being used most. */
export const trendingMusic = wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const rows = await Music.find({ status: { $ne: "Inactive" } })
    .sort({ featured: -1, usageCount: -1, xtime: -1 })
    .limit(limit).lean();
  ok(res, { tracks: rows.map(shapeTrack) });
});

export const getTrack = wrap(async (req, res) => {
  const { id } = req.params;
  const viewerId = actorId(req);
  if (!isId(id)) return fail(res, 400, "Valid track id is required");

  const track = await Music.findById(id).lean();
  if (!track) return fail(res, 404, "Track not found");

  const { limit, skip, page } = paging(req, 12);
  const filter = {
    "music.track": oid(id),
    status: { $nin: ["hidden", "deleted"] },
    status_draft_publish: "Publish",
  };
  const [posts, total] = await Promise.all([
    Reels.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS).lean(),
    Reels.countDocuments(filter),
  ]);

  const ctx = await buildViewerContext(viewerId);
  ok(res, {
    track: shapeTrack(track),
    page, limit, postCount: total,
    posts: posts.map((d) => shapeFeedItem(d, ctx)),
  });
});

/*
  Attach, re-trim or clear the track on a post the caller owns. Passing
  `music: null` removes it.
*/
export const attachMusic = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username music").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (!sameId(doc.username, userId)) return fail(res, 403, "That post isn't yours");

  const incoming = req.body?.music === undefined ? req.body : req.body.music;

  if (incoming === null) {
    await Reels.updateOne({ _id: id }, { $unset: { music: "" } });
    if (doc.music?.track) {
      await Music.updateOne({ _id: doc.music.track, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
    }
    return ok(res, { message: "Music removed", music: null });
  }

  const music = await buildPostMusic(incoming);
  if (!music) return fail(res, 404, "That track is not in the library");

  await Reels.updateOne({ _id: id }, { $set: { music } });

  // Only count a genuinely new track, not a re-trim of the same one.
  if (!doc.music?.track || !sameId(doc.music.track, music.track)) {
    await Music.updateOne({ _id: music.track }, { $inc: { usageCount: 1 } });
    if (doc.music?.track) {
      await Music.updateOne({ _id: doc.music.track, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
    }
  }

  ok(res, { message: "Music attached", music });
});

/* ------------------------------------------------------------------ */
/* Music Library Integration — genres and a saved list                 */
/* ------------------------------------------------------------------ */

/*
  The genres the library actually contains, with a count each.

  Derived from the tracks rather than kept as a fixed list, so a genre cannot
  appear in the picker with nothing behind it — an empty filter chip is the most
  irritating kind of dead end. The catalogue carries the genre in two fields
  (`genre` on newer rows, `music_group` on the ones the admin panel wrote), so
  both are folded together here rather than making the client know that.
*/
export const musicGenres = wrap(async (req, res) => {
  const rows = await Music.aggregate([
    { $match: { status: { $ne: "Inactive" } } },
    { $project: { g: { $ifNull: ["$genre", "$music_group"] } } },
    { $match: { g: { $nin: [null, ""] } } },
    { $group: { _id: "$g", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  ok(res, { genres: rows.map((r) => ({ genre: r._id, count: r.count })) });
});

/*
  Save a track for later.

  Its own list rather than a flag on the track, because "saved" is a fact about
  a person and the catalogue is shared — a boolean on the track would be the
  same value for everybody. `$addToSet` so tapping save twice is not two rows.
*/
export const saveTrack = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid track id and userId are required");

  const track = await Music.findById(id).select("_id status").lean();
  if (!track) return fail(res, 404, "That track is not in the library");
  if (track.status === "Inactive") return fail(res, 409, "That track has been retired");

  const user = await User.findByIdAndUpdate(
    userId, { $addToSet: { savedMusic: oid(id) } }, { new: true }
  ).select("savedMusic").lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { message: "Track saved", saved: true, count: (user.savedMusic || []).length });
});

export const unsaveTrack = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid track id and userId are required");

  const user = await User.findByIdAndUpdate(
    userId, { $pull: { savedMusic: oid(id) } }, { new: true }
  ).select("savedMusic").lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { message: "Track removed", saved: false, count: (user.savedMusic || []).length });
});

/*
  The caller's saved tracks.

  A track pulled from the catalogue after it was saved is dropped from the list
  rather than returned as a broken row — the alternative is a picker offering
  something that cannot be attached.
*/
export const savedTracks = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("savedMusic").lean();
  if (!user) return fail(res, 404, "User not found");

  const ids = (user.savedMusic || []).map((m) => oid(m));
  if (!ids.length) return ok(res, { total: 0, tracks: [] });

  const rows = await Music.find({ _id: { $in: ids }, status: { $ne: "Inactive" } }).lean();

  // Preserve the order they were saved in; $in comes back in storage order.
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const tracks = (user.savedMusic || [])
    .map((m) => byId.get(String(m)))
    .filter(Boolean)
    .map(shapeTrack);

  ok(res, { total: tracks.length, tracks });
});

/* ------------------------------------------------------------------ */
/* 6. Camera Filters & Beauty Effects                                  */
/* ------------------------------------------------------------------ */

const shapeFilter = (f) => ({
  _id: f._id,
  name: f.name,
  slug: f.slug,
  kind: f.kind,
  category: f.category,
  thumbnail: f.thumbnail,
  lutUrl: f.lutUrl,
  params: f.params || {},
  premium: !!f.premium,
  order: f.order || 0,
  usageCount: f.usageCount || 0,
});

/*
  The capture screen reads this once and caches it. Returned grouped by kind so
  the UI can build its filter tray and beauty panel without re-sorting.
*/
export const listFilters = wrap(async (req, res) => {
  const filter = { status: "active" };
  if (req.query.kind) filter.kind = String(req.query.kind);
  if (req.query.category) filter.category = String(req.query.category);

  const rows = await Filter.find(filter).sort({ order: 1, name: 1 }).lean();
  const grouped = {};
  for (const f of rows) (grouped[f.kind] = grouped[f.kind] || []).push(shapeFilter(f));

  ok(res, {
    total: rows.length,
    categories: [...new Set(rows.map((f) => f.category))],
    byKind: grouped,
    filters: rows.map(shapeFilter),
  });
});

export const getFilter = wrap(async (req, res) => {
  const { id } = req.params;
  const doc = isId(id)
    ? await Filter.findById(id).lean()
    : await Filter.findOne({ slug: String(id).toLowerCase() }).lean();
  if (!doc) return fail(res, 404, "Filter not found");
  ok(res, { filter: shapeFilter(doc) });
});

/* Record the treatment applied to an already-created post. */
export const applyEffects = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username effects").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (!sameId(doc.username, userId)) return fail(res, 403, "That post isn't yours");

  const incoming = req.body?.effects === undefined ? req.body : req.body.effects;

  if (incoming === null) {
    await Reels.updateOne({ _id: id }, { $unset: { effects: "" } });
    return ok(res, { message: "Effects cleared", effects: null });
  }

  const effects = await buildEffects(incoming);
  if (!effects) return fail(res, 400, "Supply a filter id or at least one beauty value");

  await Reels.updateOne({ _id: id }, { $set: { effects } });
  if (effects.filter && !sameId(doc.effects?.filter, effects.filter)) {
    await Filter.updateOne({ _id: effects.filter }, { $inc: { usageCount: 1 } });
  }

  ok(res, { message: "Effects applied", effects });
});
