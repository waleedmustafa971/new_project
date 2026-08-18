/*
  Messaging API — Social Media module.

  REST surface for the chat features the socket layer never covered:

    React to Messages ............ one emoji per person, toggle, aggregated
    Edit & Delete Messages ....... edit window + history, delete for me / all
    File Sharing (PDFs, Docs) .... typed attachments, size caps, media gallery
    Send Videos in Chat .......... video attachments with thumbnail + duration
    Voice Messages ............... duration, waveform, played state
    Stickers, GIFs & Emojis ...... pack catalogue, search, recents
    Disappearing Messages ........ per-conversation TTL, view-once media
    Read Receipts & Typing ....... receipts honouring the privacy setting

  Calls live in controllers/callController.js and key exchange in
  controllers/encryptionController.js — same section, separate subsystems.

  Real-time delivery still goes over the socket in index.js; every mutation
  here emits the matching event so both transports stay in step.
*/

import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import { MessageModel, ConversationModel } from "../models/ConversationModel.js";
import { GroupChat } from "../models/Groupchat.js";
import StickerPack from "../models/StickerPack.js";
import User from "../models/users.js";
import { getIO } from "../socket/socket.js";
import { isBlockedEither } from "../helpers/privacy.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[chat]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const sameId = (a, b) => String(a) === String(b);

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 30) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

/* Emit over the socket without letting a socket problem fail the request. */
const emit = (userIds, event, payload) => {
  try {
    const io = getIO();
    if (!io) return;
    for (const uid of new Set(userIds.filter(Boolean).map(String))) {
      io.to(uid).emit(event, payload);
    }
  } catch (err) {
    console.error("[chat] emit failed", event, err.message);
  }
};

/* Everyone who should hear about a change to this message. */
const audienceOf = async (convo) => {
  if (!convo) return [];
  if (convo.type === "group" && convo.group) {
    const group = await GroupChat.findById(convo.group).select("members").lean();
    return (group?.members || []).map(String);
  }
  return [String(convo.sender), String(convo.receiver)].filter(Boolean);
};

const conversationOf = async (messageId) =>
  ConversationModel.findOne({ messages: oid(messageId) }).lean();

/*
  A message is visible to someone unless they deleted it for themselves, or it
  was deleted for everyone, or it is a view-once they have already opened.
*/
const visibleTo = (msg, userId) => {
  if (!msg) return false;
  if ((msg.deletedFor || []).some((u) => sameId(u, userId))) return false;
  if (msg.viewOnce && (msg.viewedBy || []).some((u) => sameId(u, userId)) && !sameId(msg.msgByUserId, userId)) return false;
  return true;
};

const shapeReactions = (msg, viewerId) => {
  const byEmoji = {};
  for (const r of msg.reactions || []) {
    (byEmoji[r.emoji] = byEmoji[r.emoji] || { emoji: r.emoji, count: 0, users: [] });
    byEmoji[r.emoji].count += 1;
    if (byEmoji[r.emoji].users.length < 10) byEmoji[r.emoji].users.push(r.user);
  }
  return {
    reactions: Object.values(byEmoji).sort((a, b) => b.count - a.count),
    myReaction: viewerId
      ? (msg.reactions || []).find((r) => sameId(r.user, viewerId))?.emoji || null
      : null,
    reactionCount: (msg.reactions || []).length,
  };
};

export const shapeMessage = (msg, viewerId) => ({
  _id: msg._id,
  clientMessageId: msg.clientMessageId,
  text: msg.deleted ? null : msg.text,
  deleted: !!msg.deleted,
  messagetype: msg.messagetype,
  imageUrl: msg.imageUrl,
  videoUrl: msg.videoUrl,
  audioUrl: msg.audioUrl,
  attachments: msg.deleted ? [] : (msg.attachments || []),
  sticker: msg.deleted ? null : (msg.sticker || null),
  msgByUserId: msg.msgByUserId,
  replyTo: msg.replyTo || null,
  isForwarded: !!msg.isForwarded,
  forwardedFrom: msg.forwardedFrom || null,
  seen: msg.seen,
  seenBy: msg.seenBy || [],
  deliveredTo: msg.deliveredTo || [],
  editedAt: msg.editedAt || null,
  edited: !!msg.editedAt,
  expiresAt: msg.expiresAt || null,
  viewOnce: !!msg.viewOnce,
  encrypted: !!msg.encrypted,
  encryption: msg.encryption || null,
  played: viewerId ? (msg.playedBy || []).some((u) => sameId(u, viewerId)) : false,
  call: msg.call || null,
  createdAt: msg.createdAt,
  ...shapeReactions(msg, viewerId),
});

/* ------------------------------------------------------------------ */
/* 1. React to Messages                                                */
/* ------------------------------------------------------------------ */

/*
  One emoji per person per message. Sending the emoji you already have removes
  it; sending a different one replaces it — so a person's reaction is always a
  single value, which is what the bubble renders.
*/
export const reactToMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const emoji = String(req.body?.emoji || "").trim();

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid message id and userId are required");
  if (!emoji) return fail(res, 400, "emoji is required");
  if ([...emoji].length > 8) return fail(res, 400, "That is not a single emoji");

  const msg = await MessageModel.findById(id).lean();
  if (!msg) return fail(res, 404, "Message not found");
  if (msg.deleted) return fail(res, 410, "That message was deleted");

  const existing = (msg.reactions || []).find((r) => sameId(r.user, userId));
  let action;

  if (existing && existing.emoji === emoji) {
    await MessageModel.updateOne({ _id: id }, { $pull: { reactions: { user: oid(userId) } } });
    action = "removed";
  } else if (existing) {
    await MessageModel.updateOne(
      { _id: id },
      { $set: { "reactions.$[el].emoji": emoji, "reactions.$[el].at": new Date() } },
      { arrayFilters: [{ "el.user": oid(userId) }] }
    );
    action = "changed";
  } else {
    await MessageModel.updateOne(
      { _id: id },
      { $push: { reactions: { user: oid(userId), emoji, at: new Date() } } }
    );
    action = "added";
  }

  const fresh = await MessageModel.findById(id).lean();
  const summary = shapeReactions(fresh, userId);

  const convo = await conversationOf(id);
  emit(await audienceOf(convo), "messageReaction", {
    messageId: id, userId, emoji, action, ...summary,
  });

  ok(res, { message: `Reaction ${action}`, action, ...summary });
});

export const listReactions = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid message id is required");

  const msg = await MessageModel.findById(id).populate("reactions.user", "name image").lean();
  if (!msg) return fail(res, 404, "Message not found");

  ok(res, {
    total: (msg.reactions || []).length,
    reactions: (msg.reactions || []).map((r) => ({ user: r.user, emoji: r.emoji, at: r.at })),
  });
});

/* ------------------------------------------------------------------ */
/* 2. Edit & Delete Messages                                           */
/* ------------------------------------------------------------------ */

// How long after sending a message can still be edited.
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const editMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const text = String(req.body?.text || "").trim();

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid message id and userId are required");
  if (!text) return fail(res, 400, "text is required");

  const msg = await MessageModel.findById(id).lean();
  if (!msg) return fail(res, 404, "Message not found");
  if (!sameId(msg.msgByUserId, userId)) return fail(res, 403, "You can only edit your own message");
  if (msg.deleted) return fail(res, 410, "That message was deleted");
  if (msg.encrypted) return fail(res, 422, "An encrypted message cannot be edited on the server");

  const age = Date.now() - new Date(msg.createdAt).getTime();
  if (age > EDIT_WINDOW_MS) {
    return fail(res, 403, `Messages can only be edited within ${EDIT_WINDOW_MS / 60000} minutes of sending`);
  }

  await MessageModel.updateOne({ _id: id }, {
    $set: { text, editedAt: new Date() },
    // Keeping the previous text means "edited" is auditable rather than a
    // claim the reader has to take on trust.
    $push: { editHistory: { text: msg.text, at: new Date() } },
  });

  const convo = await conversationOf(id);
  emit(await audienceOf(convo), "messageEdited", { messageId: id, text, editedAt: new Date() });

  ok(res, { message: "Message edited", text, editedAt: new Date() });
});

/*
  scope "me" hides it for the caller only; "everyone" replaces it with a
  tombstone for the whole conversation. Only the sender can do the latter, and
  a group admin can remove anyone's message from their group.
*/
export const deleteMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const scope = req.body?.scope === "everyone" ? "everyone" : "me";

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid message id and userId are required");

  const msg = await MessageModel.findById(id).lean();
  if (!msg) return fail(res, 404, "Message not found");

  const convo = await conversationOf(id);

  if (scope === "me") {
    await MessageModel.updateOne({ _id: id }, { $addToSet: { deletedFor: oid(userId) } });
    return ok(res, { message: "Message removed for you", scope: "me" });
  }

  let allowed = sameId(msg.msgByUserId, userId);
  if (!allowed && convo?.type === "group" && convo.group) {
    const group = await GroupChat.findById(convo.group).select("createdBy admins").lean();
    allowed = sameId(group?.createdBy, userId) ||
      (group?.admins || []).some((a) => sameId(a, userId));
  }
  if (!allowed) return fail(res, 403, "You can only delete your own message for everyone");

  await MessageModel.updateOne({ _id: id }, {
    $set: {
      deleted: true, deletedAt: new Date(),
      text: "", imageUrl: [], videoUrl: "", audioUrl: "",
      attachments: [], sticker: undefined, reactions: [],
    },
  });

  emit(await audienceOf(convo), "messageDeleted", { messageId: id, scope: "everyone", by: userId });

  ok(res, { message: "Message deleted for everyone", scope: "everyone" });
});

/* ------------------------------------------------------------------ */
/* 3. File Sharing / Send Videos / Voice Messages                      */
/* ------------------------------------------------------------------ */

const KIND_BY_MIME = (mime = "", name = "") => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(mp4|mov|mkv|webm|avi)$/i.test(name)) return "video";
  if (/\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(name)) return "audio";
  if (/\.(jpe?g|png|gif|webp|heic)$/i.test(name)) return "image";
  return "document";
};

// Per-kind size ceilings, in bytes.
const SIZE_LIMITS = {
  image: 25 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

/*
  Takes what multer wrote to uploads/chat and returns typed attachments the
  client attaches to a message. Anything over its per-kind ceiling is rejected
  and its file removed, rather than being stored and failing later on send.
*/
export const uploadAttachments = wrap(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return fail(res, 400, "No files uploaded");

  const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const durations = asArray(req.body?.duration);
  const thumbs = asArray(req.body?.thumbnail);
  const widths = asArray(req.body?.width);
  const heights = asArray(req.body?.height);
  let waveforms = [];
  try {
    waveforms = req.body?.waveform ? JSON.parse(req.body.waveform) : [];
  } catch { waveforms = []; }

  const attachments = [];
  const rejected = [];

  files.forEach((f, i) => {
    const kind = KIND_BY_MIME(f.mimetype, f.originalname);
    if (f.size > SIZE_LIMITS[kind]) {
      rejected.push({
        name: f.originalname, kind, size: f.size,
        limit: SIZE_LIMITS[kind],
        reason: `${kind} files are limited to ${Math.round(SIZE_LIMITS[kind] / 1024 / 1024)} MB`,
      });
      try { fs.unlinkSync(f.path); } catch { /* already gone */ }
      return;
    }
    attachments.push({
      url: `/uploads/chat/${f.filename}`,
      name: f.originalname,
      mime: f.mimetype,
      size: f.size,
      kind,
      thumbnail: thumbs[i] || undefined,
      width: widths[i] ? Number(widths[i]) : undefined,
      height: heights[i] ? Number(heights[i]) : undefined,
      duration: durations[i] ? Number(durations[i]) : undefined,
      waveform: Array.isArray(waveforms[i]) ? waveforms[i].slice(0, 200).map(Number) : undefined,
    });
  });

  if (attachments.length === 0) {
    return fail(res, 413, rejected[0]?.reason || "Every file was rejected");
  }

  ok(res, {
    message: `${attachments.length} file(s) ready`,
    count: attachments.length,
    attachments,
    rejected,
  });
});

/* Every file shared in one conversation, newest first, filterable by kind. */
export const conversationMedia = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { page, limit, skip } = paging(req, 40);
  const kind = req.query.kind;

  if (!isId(id)) return fail(res, 400, "Valid conversation id is required");

  const convo = await ConversationModel.findById(id).lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  const members = await audienceOf(convo);
  if (isId(userId) && !members.some((m) => sameId(m, userId))) {
    return fail(res, 403, "You are not in this conversation");
  }

  const match = {
    _id: { $in: convo.messages || [] },
    deleted: { $ne: true },
    attachments: { $exists: true, $ne: [] },
  };
  if (kind) match["attachments.kind"] = String(kind);

  const [rows, total] = await Promise.all([
    MessageModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .select("attachments msgByUserId createdAt").lean(),
    MessageModel.countDocuments(match),
  ]);

  const items = [];
  for (const m of rows) {
    for (const a of m.attachments || []) {
      if (kind && a.kind !== kind) continue;
      items.push({ ...a, messageId: m._id, sender: m.msgByUserId, at: m.createdAt });
    }
  }

  ok(res, { page, limit, total, items });
});

/* Marks a voice note as played — distinct from the message being read. */
export const markPlayed = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid message id and userId are required");

  const msg = await MessageModel.findById(id).lean();
  if (!msg) return fail(res, 404, "Message not found");

  await MessageModel.updateOne({ _id: id }, { $addToSet: { playedBy: oid(userId) } });
  emit([msg.msgByUserId], "messagePlayed", { messageId: id, userId });

  ok(res, { message: "Marked as played" });
});

/* ------------------------------------------------------------------ */
/* 4. Disappearing Messages                                            */
/* ------------------------------------------------------------------ */

// The durations the UI offers, in seconds.
export const TTL_PRESETS = [0, 300, 3600, 86400, 604800, 2592000];

export const setDisappearing = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const seconds = parseInt(req.body?.seconds, 10);

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid conversation id and userId are required");
  if (!Number.isFinite(seconds) || seconds < 0) return fail(res, 400, "seconds must be 0 or more");
  if (seconds > 31536000) return fail(res, 400, "Maximum is one year");

  const convo = await ConversationModel.findById(id).lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  const members = await audienceOf(convo);
  if (!members.some((m) => sameId(m, userId))) return fail(res, 403, "You are not in this conversation");

  await ConversationModel.updateOne({ _id: id }, {
    $set: {
      disappearingSeconds: seconds || null,
      disappearingSetBy: oid(userId),
      disappearingSetAt: new Date(),
    },
  });

  emit(members, "disappearingChanged", { conversationId: id, seconds, by: userId });

  ok(res, {
    message: seconds ? `Messages will disappear after ${seconds} seconds` : "Disappearing messages off",
    // Existing messages deliberately keep their original expiry: changing the
    // setting must not retroactively destroy history someone already has.
    appliesTo: "new messages only",
    seconds: seconds || null,
  });
});

export const getDisappearing = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid conversation id is required");

  const convo = await ConversationModel.findById(id)
    .select("disappearingSeconds disappearingSetBy disappearingSetAt").lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  ok(res, {
    seconds: convo.disappearingSeconds || null,
    enabled: !!convo.disappearingSeconds,
    setBy: convo.disappearingSetBy,
    setAt: convo.disappearingSetAt,
    presets: TTL_PRESETS,
  });
});

/*
  Opening a view-once message. The caller is recorded as having seen it, which
  removes it from their view on the next read; the sender keeps their copy.
*/
export const openViewOnce = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid message id and userId are required");

  const msg = await MessageModel.findById(id).lean();
  if (!msg) return fail(res, 404, "Message not found");
  if (!msg.viewOnce) return fail(res, 400, "That message is not view-once");
  if ((msg.viewedBy || []).some((u) => sameId(u, userId))) {
    return fail(res, 410, "You have already opened this message");
  }

  await MessageModel.updateOne({ _id: id }, { $addToSet: { viewedBy: oid(userId) } });
  emit([msg.msgByUserId], "viewOnceOpened", { messageId: id, userId });

  ok(res, { message: "Opened", content: shapeMessage(msg, userId) });
});

/* ------------------------------------------------------------------ */
/* 5. Read Receipts & Typing Indicator                                 */
/* ------------------------------------------------------------------ */

/*
  Read receipts are reciprocal: someone who has turned their own receipts off
  does not get to see everyone else's. That is the rule every chat app uses,
  and without it the setting is worth nothing.
*/
export const markRead = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid conversation id and userId are required");

  const convo = await ConversationModel.findById(id).lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  const members = await audienceOf(convo);
  if (!members.some((m) => sameId(m, userId))) return fail(res, 403, "You are not in this conversation");

  const me = await User.findById(userId).select("privacySettings").lean();
  const sendReceipts = me?.privacySettings?.readReceipts !== false;

  const unread = await MessageModel.find({
    _id: { $in: convo.messages || [] },
    msgByUserId: { $ne: oid(userId) },
    seenBy: { $ne: String(userId) },
  }).select("_id msgByUserId").lean();

  if (unread.length === 0) return ok(res, { message: "Nothing new", updated: 0 });

  const ids = unread.map((m) => m._id);
  await MessageModel.updateMany(
    { _id: { $in: ids } },
    { $set: { seen: true }, $addToSet: { seenBy: String(userId) } }
  );

  // The counterpart only hears about it if this user shares receipts.
  if (sendReceipts) {
    emit(members, "messagesSeen", { conversationId: id, messageIds: ids, by: userId });
  }

  ok(res, { message: "Marked as read", updated: ids.length, receiptsShared: sendReceipts });
});

export const readReceipts = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid message id is required");

  const msg = await MessageModel.findById(id).select("seenBy deliveredTo msgByUserId").lean();
  if (!msg) return fail(res, 404, "Message not found");

  if (isId(viewerId)) {
    const me = await User.findById(viewerId).select("privacySettings").lean();
    if (me?.privacySettings?.readReceipts === false) {
      return ok(res, {
        hidden: true,
        message: "You have read receipts turned off, so you cannot see others'",
        delivered: (msg.deliveredTo || []).length,
      });
    }
  }

  const seen = await User.find({ _id: { $in: (msg.seenBy || []).filter(isId) } })
    .select("name image").lean();

  ok(res, {
    hidden: false,
    delivered: (msg.deliveredTo || []).length,
    seenCount: seen.length,
    seenBy: seen,
  });
});

/*
  Typing over REST for clients that are not holding a socket. `ttl` tells the
  receiver when to clear the indicator on its own, so a sender that goes away
  mid-word does not leave "typing…" on screen forever.
*/
export const setTyping = wrap(async (req, res) => {
  const userId = actorId(req);
  const { to, conversationId, typing = true } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  let targets = [];
  if (isId(conversationId)) {
    const convo = await ConversationModel.findById(conversationId).lean();
    if (!convo) return fail(res, 404, "Conversation not found");
    targets = (await audienceOf(convo)).filter((m) => !sameId(m, userId));
  } else if (isId(to)) {
    targets = [String(to)];
  } else {
    return fail(res, 400, "Supply conversationId or to");
  }

  emit(targets, typing ? "typing" : "stopTyping", { from: userId, conversationId, ttl: 5000 });
  ok(res, { message: typing ? "Typing sent" : "Stopped typing", to: targets, ttl: 5000 });
});

/* ------------------------------------------------------------------ */
/* 6. Stickers, GIFs & Emojis                                          */
/* ------------------------------------------------------------------ */

export const listStickerPacks = wrap(async (req, res) => {
  const filter = { status: "active" };
  if (req.query.kind) filter.kind = String(req.query.kind);

  const packs = await StickerPack.find(filter).sort({ order: 1, name: 1 }).lean();
  ok(res, {
    total: packs.length,
    packs: packs.map((p) => ({
      _id: p._id, name: p.name, slug: p.slug, kind: p.kind,
      thumbnail: p.thumbnail, author: p.author, premium: !!p.premium,
      count: (p.stickers || []).length,
      usageCount: p.usageCount || 0,
    })),
  });
});

export const getStickerPack = wrap(async (req, res) => {
  const { id } = req.params;
  const pack = isId(id)
    ? await StickerPack.findById(id).lean()
    : await StickerPack.findOne({ slug: String(id).toLowerCase() }).lean();
  if (!pack) return fail(res, 404, "Sticker pack not found");
  ok(res, { pack });
});

/*
  Search across every pack by keyword or by the emoji a sticker stands for, so
  typing "😂" and typing "laugh" both land on the same stickers.
*/
export const searchStickers = wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const kind = req.query.kind;
  if (!q) return fail(res, 400, "q is required");

  const filter = { status: "active" };
  if (kind) filter.kind = String(kind);

  const packs = await StickerPack.find(filter).lean();
  const hits = [];
  for (const p of packs) {
    for (const st of p.stickers || []) {
      const match =
        st.emoji === q ||
        (st.keywords || []).some((k) => String(k).toLowerCase().includes(q)) ||
        String(st.stickerId).toLowerCase().includes(q);
      if (match) {
        hits.push({ ...st, pack: { _id: p._id, name: p.name, slug: p.slug, kind: p.kind } });
        if (hits.length >= limit) break;
      }
    }
    if (hits.length >= limit) break;
  }

  ok(res, { total: hits.length, results: hits });
});

/* Bumps the pack's counter — what "recent" and "popular" are built from. */
export const useSticker = wrap(async (req, res) => {
  const { packId, stickerId } = req.body || {};
  if (!isId(packId)) return fail(res, 400, "Valid packId is required");

  const pack = await StickerPack.findById(packId).lean();
  if (!pack) return fail(res, 404, "Sticker pack not found");

  const sticker = (pack.stickers || []).find((s) => s.stickerId === String(stickerId));
  if (!sticker) return fail(res, 404, "Sticker not found in that pack");

  await StickerPack.updateOne({ _id: packId }, { $inc: { usageCount: 1 } });

  ok(res, {
    message: "Ready to send",
    // Hand back exactly the shape messageSchema.sticker expects.
    sticker: {
      pack: pack._id,
      stickerId: sticker.stickerId,
      url: sticker.url,
      emoji: sticker.emoji,
      animated: !!sticker.animated,
    },
  });
});

/* ------------------------------------------------------------------ */
/* messages, with every rule above applied                             */
/* ------------------------------------------------------------------ */

/*
  Paginated history for one conversation. This is the read path that actually
  honours deletion, view-once and expiry — the socket handler returns raw rows.
*/
export const listMessages = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { page, limit, skip } = paging(req);

  if (!isId(id)) return fail(res, 400, "Valid conversation id is required");

  const convo = await ConversationModel.findById(id).lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  const members = await audienceOf(convo);
  if (isId(userId) && !members.some((m) => sameId(m, userId))) {
    return fail(res, 403, "You are not in this conversation");
  }

  const match = {
    _id: { $in: convo.messages || [] },
    // An expired message may still be present until the TTL sweep runs.
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  };
  if (isId(userId)) match.deletedFor = { $ne: oid(userId) };

  const [rows, total] = await Promise.all([
    MessageModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("replyTo", "text msgByUserId messagetype createdAt")
      .lean(),
    MessageModel.countDocuments(match),
  ]);

  ok(res, {
    page, limit, total,
    hasMore: skip + rows.length < total,
    disappearingSeconds: convo.disappearingSeconds || null,
    encryptionEnabled: !!convo.encryptionEnabled,
    messages: rows.filter((m) => visibleTo(m, userId)).map((m) => shapeMessage(m, userId)),
  });
});

/*
  Applies the conversation's TTL to a message that has just been created. The
  socket send path calls this so disappearing works no matter which transport
  the message arrived on.
*/
export const applyDisappearing = async (conversationId, messageId) => {
  const convo = await ConversationModel.findById(conversationId).select("disappearingSeconds").lean();
  if (!convo?.disappearingSeconds) return null;

  const expiresAt = new Date(Date.now() + convo.disappearingSeconds * 1000);
  await MessageModel.updateOne({ _id: messageId }, { $set: { expiresAt } });
  return expiresAt;
};
