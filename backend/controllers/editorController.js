/* ================================================================
   Video Editing Suite — trim, filters, text.
   (Advanced / Optional Features)

   The filters third of this row already shipped on 18 Aug with the posting
   build: a catalogue, a beauty panel and `POST /apis/posting/posts/:id/effects`
   that records the treatment on the post. It is verified by the suite rather
   than rebuilt. What was missing is trim and text, and they are here.

   **Nothing in this file cuts a frame.** The server records the decisions — trim
   these seconds, put this caption here from this second to that one — and the
   device renders them, exactly as `effects` already records a filter the server
   never applied. Storing decisions rather than a flattened render is what keeps
   an edit reopenable: a trim burned into the file cannot be widened again, and
   a caption drawn into the pixels cannot be corrected or translated. It also
   leaves the original upload as the only copy of the media.

   The one thing that would need real transcoding — producing a shorter file to
   serve — is deliberately out of scope and stated on the endpoint.
   ================================================================ */

import mongoose from "mongoose";
import Reels from "../models/Reels.js";
import { isId } from "../helpers/feed.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;
const sameId = (a, b) => String(a) === String(b);

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[editor]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
  The fonts the text tool offers.

  Served rather than hardcoded per platform for the same reason the string
  catalogue is: two apps keeping their own list is two lists that drift, and a
  post created with a font one platform has never heard of renders as something
  else entirely on the other.
*/
export const FONTS = [
  { id: "default",   name: "Default",    weight: 400, supportsArabic: true },
  { id: "classic",   name: "Classic",    weight: 400, supportsArabic: true },
  { id: "modern",    name: "Modern",     weight: 600, supportsArabic: true },
  { id: "typewriter", name: "Typewriter", weight: 400, supportsArabic: false },
  { id: "neon",      name: "Neon",       weight: 700, supportsArabic: false },
  { id: "handwriting", name: "Handwriting", weight: 400, supportsArabic: false },
];
const FONT_IDS = new Set(FONTS.map((f) => f.id));

const OVERLAY_LIMIT = 20;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

/* Fetch the post and confirm the caller owns it — every endpoint here needs it. */
const ownedPost = async (req) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return { error: [400, "Valid post id and userId are required"] };

  const doc = await Reels.findById(id).select("username media edit posttype").lean();
  if (!doc) return { error: [404, "Post not found"] };
  if (!sameId(doc.username, userId)) return { error: [403, "That post isn't yours"] };
  return { doc, userId };
};

/* The longest clip in the post, which is what a trim is bounded by. */
const sourceDuration = (doc) => {
  const durations = (doc.media || [])
    .filter((m) => m.type === "video" && Number(m.duration) > 0)
    .map((m) => Number(m.duration));
  return durations.length ? Math.max(...durations) : null;
};

const shapeEdit = (doc) => {
  const edit = doc.edit || {};
  return {
    trim: edit.trim
      ? {
          start: edit.trim.start || 0,
          end: edit.trim.end ?? null,
          duration: edit.trim.end != null ? Number((edit.trim.end - (edit.trim.start || 0)).toFixed(3)) : null,
        }
      : null,
    overlays: edit.overlays || [],
    revision: edit.revision || 0,
    updatedAt: edit.updatedAt || null,
    sourceDuration: sourceDuration(doc),
    // The whole point of the file, said once where a client can read it.
    rendered: false,
    note: "Edits are a decision list; the client renders them. The stored media is never overwritten.",
  };
};

/* ------------------------------------------------------------------ */
/* read                                                                */
/* ------------------------------------------------------------------ */

export const getEdit = wrap(async (req, res) => {
  const { doc, error } = await ownedPost(req);
  if (error) return fail(res, ...error);
  ok(res, { postId: doc._id, edit: shapeEdit(doc) });
});

export const listFonts = wrap(async (req, res) => {
  ok(res, {
    fonts: FONTS,
    // Named explicitly because an Arabic caption in a Latin-only display face
    // renders as boxes, and the editor needs to know before offering it.
    arabicCapable: FONTS.filter((f) => f.supportsArabic).map((f) => f.id),
  });
});

/* ------------------------------------------------------------------ */
/* trim                                                                */
/* ------------------------------------------------------------------ */

/*
  Set or clear the trim.

  Bounded by the source duration when the upload reported one. It often does
  not — `media[].duration` is filled in from what the client sent at upload
  time — so an unbounded trim is accepted rather than refused: rejecting a valid
  edit because the *metadata* is missing punishes the wrong thing.
*/
export const setTrim = wrap(async (req, res) => {
  const { doc, error } = await ownedPost(req);
  if (error) return fail(res, ...error);

  const incoming = req.body?.trim === undefined ? req.body : req.body.trim;

  if (incoming === null) {
    await Reels.updateOne({ _id: doc._id }, {
      $unset: { "edit.trim": "" },
      $inc: { "edit.revision": 1 },
      $set: { "edit.updatedAt": new Date() },
    });
    const fresh = await Reels.findById(doc._id).select("media edit").lean();
    return ok(res, { message: "Trim cleared", edit: shapeEdit(fresh) });
  }

  const start = num(incoming?.start) ?? 0;
  const end = num(incoming?.end);

  if (!Number.isFinite(start) || start < 0) return fail(res, 422, "trim.start must be zero or more");
  if (end === null) return fail(res, 422, "trim.end is required");
  if (!Number.isFinite(end)) return fail(res, 422, "trim.end must be a number");
  if (end <= start) return fail(res, 422, "trim.end must be after trim.start");

  const source = sourceDuration(doc);
  if (source !== null && end > source + 0.001) {
    return fail(res, 422, `trim.end is past the end of the clip (${source}s)`);
  }

  const now = new Date();
  await Reels.updateOne({ _id: doc._id }, {
    $set: { "edit.trim": { start, end }, "edit.updatedAt": now },
    $inc: { "edit.revision": 1 },
  });

  const fresh = await Reels.findById(doc._id).select("media edit").lean();
  ok(res, { message: "Trim saved", edit: shapeEdit(fresh) });
});

/* ------------------------------------------------------------------ */
/* text overlays                                                       */
/* ------------------------------------------------------------------ */

/*
  Validate one overlay.

  Position is a 0-1 fraction of the frame, never pixels: a caption at x:540 sits
  in the middle of one phone and off the edge of another, and the same post is
  rendered on both.
*/
const cleanOverlay = (raw, index, source) => {
  const text = String(raw?.text ?? "").trim();
  if (!text) return { error: `overlays[${index}]: text is required` };
  if (text.length > 200) return { error: `overlays[${index}]: text is too long (200 characters max)` };

  const frac = (v, dflt) => {
    const n = num(v);
    if (n === null) return dflt;
    if (!Number.isFinite(n) || n < 0 || n > 1) return NaN;
    return n;
  };

  const x = frac(raw?.x, 0.5);
  const y = frac(raw?.y, 0.5);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return { error: `overlays[${index}]: x and y are fractions of the frame, between 0 and 1` };
  }

  const font = String(raw?.font || "default");
  if (!FONT_IDS.has(font)) return { error: `overlays[${index}]: unknown font "${font}"` };

  const fontSize = num(raw?.fontSize) ?? 24;
  if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 200) {
    return { error: `overlays[${index}]: fontSize must be between 8 and 200` };
  }

  const color = String(raw?.color || "#ffffff");
  if (!HEX.test(color)) return { error: `overlays[${index}]: color must be a hex value` };

  const background = raw?.background == null || raw.background === "" ? null : String(raw.background);
  if (background !== null && !HEX.test(background)) {
    return { error: `overlays[${index}]: background must be a hex value or null` };
  }

  const align = String(raw?.align || "center");
  if (!["left", "center", "right"].includes(align)) {
    return { error: `overlays[${index}]: align must be left, center or right` };
  }

  const rotation = num(raw?.rotation) ?? 0;
  if (!Number.isFinite(rotation) || rotation < -180 || rotation > 180) {
    return { error: `overlays[${index}]: rotation must be between -180 and 180` };
  }

  const startAt = num(raw?.startAt);
  const endAt = num(raw?.endAt);
  if (startAt !== null && (!Number.isFinite(startAt) || startAt < 0)) {
    return { error: `overlays[${index}]: startAt must be zero or more` };
  }
  if (endAt !== null) {
    if (!Number.isFinite(endAt)) return { error: `overlays[${index}]: endAt must be a number` };
    if (endAt <= (startAt ?? 0)) return { error: `overlays[${index}]: endAt must be after startAt` };
    if (source !== null && endAt > source + 0.001) {
      return { error: `overlays[${index}]: endAt is past the end of the clip (${source}s)` };
    }
  }

  const mediaIndex = num(raw?.mediaIndex) ?? 0;
  if (!Number.isInteger(mediaIndex) || mediaIndex < 0) {
    return { error: `overlays[${index}]: mediaIndex must be a whole number` };
  }

  return {
    value: {
      // The client owns the id so it can address an overlay it has not saved
      // yet; a server-generated one would arrive too late to be useful.
      id: String(raw?.id || `t${index}-${Date.now().toString(36)}`),
      text, x, y, font, fontSize, color, background, align, rotation,
      ...(startAt === null ? {} : { startAt }),
      ...(endAt === null ? {} : { endAt }),
      mediaIndex,
    },
  };
};

/*
  Replace the whole overlay set.

  Wholesale rather than append, for the same reason story mentions are: the
  editor sends what the canvas currently shows, and appending would leave a
  caption on the post after it was dragged off screen.
*/
export const setOverlays = wrap(async (req, res) => {
  const { doc, error } = await ownedPost(req);
  if (error) return fail(res, ...error);

  const raw = req.body?.overlays;
  if (raw !== null && !Array.isArray(raw)) return fail(res, 400, "overlays must be an array, or null to clear");

  if (raw === null || raw.length === 0) {
    await Reels.updateOne({ _id: doc._id }, {
      $set: { "edit.overlays": [], "edit.updatedAt": new Date() },
      $inc: { "edit.revision": 1 },
    });
    const fresh = await Reels.findById(doc._id).select("media edit").lean();
    return ok(res, { message: "Text cleared", edit: shapeEdit(fresh) });
  }

  if (raw.length > OVERLAY_LIMIT) {
    return fail(res, 422, `At most ${OVERLAY_LIMIT} text overlays per post`);
  }

  const source = sourceDuration(doc);
  const overlays = [];
  const seen = new Set();
  for (let i = 0; i < raw.length; i++) {
    const { value, error: bad } = cleanOverlay(raw[i], i, source);
    if (bad) return fail(res, 422, bad);
    // Two overlays sharing an id makes the delete endpoint ambiguous, and the
    // editor cannot tell which one it just moved.
    if (seen.has(value.id)) return fail(res, 422, `overlays[${i}]: duplicate id "${value.id}"`);
    seen.add(value.id);
    overlays.push(value);
  }

  const now = new Date();
  await Reels.updateOne({ _id: doc._id }, {
    $set: { "edit.overlays": overlays, "edit.updatedAt": now },
    $inc: { "edit.revision": 1 },
  });

  const fresh = await Reels.findById(doc._id).select("media edit").lean();
  ok(res, { message: `${overlays.length} text overlay(s) saved`, edit: shapeEdit(fresh) });
});

/* Remove one overlay by id — the common case, without resending the rest. */
export const deleteOverlay = wrap(async (req, res) => {
  const { doc, error } = await ownedPost(req);
  if (error) return fail(res, ...error);

  const overlayId = String(req.params.overlayId || "");
  const existing = (doc.edit?.overlays || []).some((o) => o.id === overlayId);
  if (!existing) return fail(res, 404, "That text overlay is not on this post");

  await Reels.updateOne({ _id: doc._id }, {
    $pull: { "edit.overlays": { id: overlayId } },
    $inc: { "edit.revision": 1 },
    $set: { "edit.updatedAt": new Date() },
  });

  const fresh = await Reels.findById(doc._id).select("media edit").lean();
  ok(res, { message: "Text overlay removed", edit: shapeEdit(fresh) });
});

/* ------------------------------------------------------------------ */
/* reset                                                               */
/* ------------------------------------------------------------------ */

/*
  Back to the original.

  Cheap precisely because nothing was ever rendered: the media on disk is still
  what was uploaded, so discarding the decision list is the whole undo. Had the
  trim been applied to the file, this endpoint could not exist.
*/
export const resetEdit = wrap(async (req, res) => {
  const { doc, error } = await ownedPost(req);
  if (error) return fail(res, ...error);

  await Reels.updateOne({ _id: doc._id }, { $unset: { edit: "" } });
  const fresh = await Reels.findById(doc._id).select("media edit").lean();
  ok(res, { message: "Edits discarded", edit: shapeEdit(fresh) });
});

export default { getEdit, listFonts, setTrim, setOverlays, deleteOverlay, resetEdit };
