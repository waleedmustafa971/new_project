/*
  Live chat, reactions and moderation — Social Media module (Live Streaming).

  Completes the three rows the section still owed:

    Live Chat During Stream ..... persisted messages, slow mode, followers-only,
                                  pinning, moderator deletion
    Live Reactions .............. batched floating-emoji taps with running totals
    Moderation Tools ............ moderators, kick, ban, chat mute, and the log

  Chat already existed as a socket broadcast in index.js: `send-live-message`
  fans a payload out to the room and keeps nothing. That is fine for a message
  in flight and useless for everything else — a viewer arriving mid-stream sees
  an empty room, a moderator cannot delete what was never stored, and a report
  about what someone said has no record behind it. This module persists the
  messages; the socket broadcast is left exactly as it is so the shipped app
  keeps working, and a client can call this in addition to emitting.
*/

import mongoose from "mongoose";

import LiveStream from "../models/LiveStream.js";
import LiveChatMessage from "../models/LiveChatMessage.js";
import LiveReaction, { REACTION_TYPES } from "../models/LiveReaction.js";
import User from "../models/users.js";
import { isId } from "../helpers/feed.js";
import {
  oid, sameId, canModerate, isModerator, isHost, outranks,
  isBanned, isMuted, findRestriction, shapeRestriction, untilFrom,
  activeSeats, liveViewers, CHAT_MAX_LENGTH,
} from "../helpers/live.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[live-chat]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 30) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

/*
  Load the fields every handler in this file needs. Selected rather than whole
  documents because `viewers` and `cohoster` on a busy stream are long arrays
  and none of these handlers touch the gift totals.
*/
const loadRoom = (id) =>
  LiveStream.findById(id)
    .select("hoster status channelName cohoster viewers moderators restrictions chatSettings pinnedMessage")
    .lean();

// Is this person actually in the room? Host, seat holder or live viewer.
const inRoom = (stream, userId) =>
  isHost(stream, userId) ||
  activeSeats(stream).some((c) => sameId(c.user, userId)) ||
  liveViewers(stream).some((v) => sameId(v.user, userId));

/* ------------------------------------------------------------------ */
/* 1. Live Chat During Stream                                          */
/* ------------------------------------------------------------------ */

/*
  Send a line.

  The order of the checks matters and is deliberate: room state first (has this
  ended?), then standing (banned, muted), then the room's own rules (chat off,
  followers-only, slow mode). A muted user hitting a slow-mode wait should be
  told they are muted, not handed a countdown that will never let them through.
*/
export const sendChatMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const text = String(req.body?.text ?? "").trim();

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");
  if (!text) return fail(res, 400, "A message is required");
  if (text.length > CHAT_MAX_LENGTH) {
    return fail(res, 422, `A message cannot be longer than ${CHAT_MAX_LENGTH} characters`);
  }

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");

  if (isBanned(stream, userId)) return fail(res, 403, "You are banned from this stream");

  const mute = findRestriction(stream, userId, "mute");
  if (mute) {
    return fail(res, 403, "You are muted in this chat", {
      mutedUntil: mute.until || null,
      permanent: !mute.until,
      reason: mute.reason || "",
    });
  }

  const staff = canModerate(stream, userId);

  // Chat closed, followers-only and slow mode are audience rules; the host and
  // their moderators still have to be able to talk to the room.
  if (!staff) {
    if (!inRoom(stream, userId)) return fail(res, 403, "Join the stream before chatting");
    if (stream.chatSettings?.enabled === false) return fail(res, 403, "Chat is turned off for this stream");

    if (stream.chatSettings?.followersOnly) {
      const host = await User.findById(stream.hoster).select("followers").lean();
      const follows = (host?.followers || []).some((f) => sameId(f, userId));
      if (!follows) return fail(res, 403, "Only followers can chat on this stream");
    }

    const wait = Number(stream.chatSettings?.slowModeSeconds || 0);
    if (wait > 0) {
      const last = await LiveChatMessage.findOne({
        stream: oid(id), user: oid(userId), kind: "message", deleted: false,
      }).sort({ createdAt: -1 }).select("createdAt").lean();

      if (last) {
        const elapsed = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
        if (elapsed < wait) {
          return fail(res, 429, `Slow mode is on — wait ${Math.ceil(wait - elapsed)}s`, {
            retryAfterSeconds: Math.ceil(wait - elapsed),
          });
        }
      }
    }
  }

  const message = await LiveChatMessage.create({
    stream: oid(id),
    channelName: stream.channelName,
    user: oid(userId),
    text,
    kind: "message",
  });

  const author = await User.findById(userId).select("name image verifiedBadge").lean();

  ok(res, {
    message: "Sent",
    chatMessage: {
      _id: message._id,
      text: message.text,
      kind: message.kind,
      createdAt: message.createdAt,
      user: author,
    },
  });
});

/*
  The room's backlog, newest first.

  Tombstones are filtered out for the audience but kept for the host and their
  moderators, who need to see that a line was removed — and by whom — rather
  than watch it silently disappear from their own view too.
*/
export const listChat = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { page, limit, skip } = paging(req);
  if (!isId(id)) return fail(res, 400, "Valid stream id is required");

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");

  const staff = userId ? canModerate(stream, userId) : false;
  const filter = { stream: oid(id) };
  if (!staff) filter.deleted = false;

  const [rows, total, pinned] = await Promise.all([
    LiveChatMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("user", "name image verifiedBadge")
      .populate("deletedBy", "name")
      .lean(),
    LiveChatMessage.countDocuments(filter),
    stream.pinnedMessage
      ? LiveChatMessage.findById(stream.pinnedMessage)
          .populate("user", "name image verifiedBadge").lean()
      : null,
  ]);

  ok(res, {
    page, limit, total,
    hasMore: skip + rows.length < total,
    chatEnabled: stream.chatSettings?.enabled !== false,
    slowModeSeconds: stream.chatSettings?.slowModeSeconds || 0,
    followersOnly: !!stream.chatSettings?.followersOnly,
    pinned: pinned && !pinned.deleted ? pinned : null,
    messages: rows.map((m) => ({
      _id: m._id,
      text: m.deleted && !staff ? "" : m.text,
      kind: m.kind,
      pinned: !!m.pinned,
      deleted: !!m.deleted,
      deletedBy: m.deletedBy || null,
      createdAt: m.createdAt,
      user: m.user,
    })),
  });
});

/* Remove a line. The author can take back their own; staff can remove any. */
export const deleteChatMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, messageId } = req.params;
  if (!isId(id) || !isId(userId) || !isId(messageId)) {
    return fail(res, 400, "Valid stream id, userId and messageId are required");
  }

  const [stream, message] = await Promise.all([loadRoom(id), LiveChatMessage.findById(messageId).lean()]);
  if (!stream) return fail(res, 404, "Stream not found");
  if (!message || !sameId(message.stream, id)) return fail(res, 404, "Message not found");
  if (message.deleted) return fail(res, 409, "That message is already deleted");

  const mine = sameId(message.user, userId);
  if (!mine && !canModerate(stream, userId)) {
    return fail(res, 403, "Only the author, the host or a moderator can delete this");
  }
  // A moderator cannot delete the host's messages, matching the rank rule
  // everywhere else in this module.
  if (!mine && isHost(stream, message.user) && !isHost(stream, userId)) {
    return fail(res, 403, "You cannot delete the host's messages");
  }

  await LiveChatMessage.updateOne({ _id: messageId }, {
    $set: { deleted: true, deletedAt: new Date(), deletedBy: oid(userId), pinned: false },
  });
  // A deleted message cannot stay pinned to the top of the room.
  if (sameId(stream.pinnedMessage || "", messageId)) {
    await LiveStream.updateOne({ _id: id }, { $set: { pinnedMessage: null } });
  }

  ok(res, { message: "Message deleted", messageId });
});

/*
  Pin one message. Capped at one per stream — a pin is the room's single
  "read this" slot, and allowing several turns it back into a list nobody reads.
*/
export const pinChatMessage = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, messageId } = req.params;
  const action = String(req.body?.action || "pin").toLowerCase();

  if (!isId(id) || !isId(userId) || !isId(messageId)) {
    return fail(res, 400, "Valid stream id, userId and messageId are required");
  }
  if (!["pin", "unpin"].includes(action)) return fail(res, 400, "action must be pin or unpin");

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (!canModerate(stream, userId)) return fail(res, 403, "Only the host or a moderator can pin");

  const message = await LiveChatMessage.findById(messageId).lean();
  if (!message || !sameId(message.stream, id)) return fail(res, 404, "Message not found");
  if (message.deleted) return fail(res, 409, "That message has been deleted");

  if (action === "unpin") {
    await LiveChatMessage.updateOne({ _id: messageId }, { $set: { pinned: false } });
    await LiveStream.updateOne({ _id: id }, { $set: { pinnedMessage: null } });
    return ok(res, { message: "Unpinned", pinnedMessage: null });
  }

  await LiveChatMessage.updateMany({ stream: oid(id), pinned: true }, { $set: { pinned: false } });
  await LiveChatMessage.updateOne({ _id: messageId }, { $set: { pinned: true } });
  await LiveStream.updateOne({ _id: id }, { $set: { pinnedMessage: oid(messageId) } });

  ok(res, { message: "Pinned", pinnedMessage: messageId });
});

/* Slow mode, followers-only and the on/off switch. Host only. */
export const updateChatSettings = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { enabled, slowModeSeconds, followersOnly } = req.body || {};

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (!isHost(stream, userId)) return fail(res, 403, "Only the host can change chat settings");

  const set = {};
  if (enabled !== undefined) set["chatSettings.enabled"] = !!enabled;
  if (followersOnly !== undefined) set["chatSettings.followersOnly"] = !!followersOnly;
  if (slowModeSeconds !== undefined) {
    const n = Number(slowModeSeconds);
    if (!Number.isFinite(n) || n < 0 || n > 300) {
      return fail(res, 422, "slowModeSeconds must be between 0 and 300");
    }
    set["chatSettings.slowModeSeconds"] = Math.round(n);
  }
  if (!Object.keys(set).length) {
    return fail(res, 400, "Supply enabled, slowModeSeconds or followersOnly");
  }

  await LiveStream.updateOne({ _id: id }, { $set: set });
  const fresh = await LiveStream.findById(id).select("chatSettings").lean();
  ok(res, { message: "Chat settings updated", chat: fresh.chatSettings });
});

/* ------------------------------------------------------------------ */
/* 2. Live Reactions                                                   */
/* ------------------------------------------------------------------ */

/*
  Send a burst of taps.

  Clients batch: holding the heart button for a second is one call carrying a
  count, not thirty calls carrying one each. The write is a single upsert with
  $inc, so two bursts arriving together cannot lose one another the way a
  read-then-write would.
*/
export const sendReaction = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const type = String(req.body?.type || "heart").toLowerCase();
  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 50);

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");
  if (!REACTION_TYPES.includes(type)) {
    return fail(res, 422, `type must be one of: ${REACTION_TYPES.join(", ")}`);
  }

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");
  if (isBanned(stream, userId)) return fail(res, 403, "You are banned from this stream");

  const now = new Date();
  await LiveReaction.updateOne(
    { stream: oid(id), user: oid(userId), type },
    { $inc: { count }, $set: { lastAt: now }, $setOnInsert: { firstAt: now } },
    { upsert: true }
  );

  const totals = await LiveReaction.aggregate([
    { $match: { stream: oid(id) } },
    { $group: { _id: "$type", count: { $sum: "$count" } } },
  ]);

  const byType = {};
  let total = 0;
  for (const t of totals) { byType[t._id] = t.count; total += t.count; }

  ok(res, {
    message: "Reaction sent",
    type, added: count,
    total,
    byType,
    // What the animation layer draws for this burst.
    burst: { type, count, at: now },
  });
});

/*
  Totals for the room, and — with `since` — just the bursts a client has not
  drawn yet, so a late-joining viewer does not get every heart of the stream
  raining down at once.
*/
export const reactionTotals = wrap(async (req, res) => {
  const { id } = req.params;
  const { since } = req.query;
  if (!isId(id)) return fail(res, 400, "Valid stream id is required");

  const stream = await LiveStream.findById(id).select("_id").lean();
  if (!stream) return fail(res, 404, "Stream not found");

  const match = { stream: oid(id) };
  const [totals, top] = await Promise.all([
    LiveReaction.aggregate([
      { $match: match },
      { $group: { _id: "$type", count: { $sum: "$count" }, people: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    LiveReaction.aggregate([
      { $match: match },
      { $group: { _id: "$user", count: { $sum: "$count" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  let recent = [];
  if (since) {
    const cutoff = new Date(since);
    if (!Number.isNaN(cutoff.getTime())) {
      recent = await LiveReaction.find({ stream: oid(id), lastAt: { $gt: cutoff } })
        .sort({ lastAt: -1 }).limit(50)
        .select("type count lastAt user").lean();
    }
  }

  const users = await User.find({ _id: { $in: top.map((t) => t._id) } })
    .select("name image").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const byType = {};
  let total = 0;
  for (const t of totals) { byType[t._id] = t.count; total += t.count; }

  ok(res, {
    total,
    byType,
    breakdown: totals.map((t) => ({ type: t._id, count: t.count, people: t.people })),
    topReactors: top.map((t, i) => ({
      rank: i + 1, user: byId.get(String(t._id)) || { _id: t._id }, count: t.count,
    })),
    recent,
    serverTime: new Date(),
  });
});

/* ------------------------------------------------------------------ */
/* 3. Moderation Tools                                                 */
/* ------------------------------------------------------------------ */

/* Appoint or stand down a moderator. Host only — a moderator cannot recruit. */
export const setModerator = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId } = req.body || {};
  const action = String(req.body?.action || "add").toLowerCase();

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }
  if (!["add", "remove"].includes(action)) return fail(res, 400, "action must be add or remove");

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (!isHost(stream, userId)) return fail(res, 403, "Only the host can appoint moderators");
  if (sameId(stream.hoster, targetId)) return fail(res, 400, "You are the host of this stream");

  const already = isModerator(stream, targetId);

  if (action === "add") {
    if (already) return fail(res, 409, "That user is already a moderator");
    const target = await User.findById(targetId).select("name").lean();
    if (!target) return fail(res, 404, "That user does not exist");
    await LiveStream.updateOne({ _id: id }, {
      $push: { moderators: { user: oid(targetId), addedBy: oid(userId), addedAt: new Date() } },
    });
    return ok(res, { message: `${target.name || "They"} can now moderate this stream`, targetId });
  }

  if (!already) return fail(res, 404, "That user is not a moderator");
  await LiveStream.updateOne({ _id: id }, { $pull: { moderators: { user: oid(targetId) } } });
  ok(res, { message: "Moderator removed", targetId });
});

export const listModerators = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid stream id is required");

  const stream = await LiveStream.findById(id).select("hoster moderators")
    .populate("moderators.user", "name image verifiedBadge").lean();
  if (!stream) return fail(res, 404, "Stream not found");

  ok(res, {
    total: (stream.moderators || []).length,
    moderators: (stream.moderators || []).filter((m) => m.user).map((m) => ({
      user: m.user, addedAt: m.addedAt,
    })),
  });
});

/*
  Remove someone from the room.

  A kick that does not also ban is theatre: the viewer taps back into the stream
  before the moderator has put their phone down. So this closes their viewer
  row, releases any seat they held, and writes a ban — `minutes` bounds it, and
  no duration means for the rest of this broadcast.
*/
export const kickViewer = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId, minutes, reason } = req.body || {};

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");
  if (!canModerate(stream, userId)) return fail(res, 403, "Only the host or a moderator can do that");
  if (isHost(stream, targetId)) return fail(res, 400, "You cannot remove the host from their own stream");
  if (!outranks(stream, userId, targetId)) {
    return fail(res, 403, sameId(userId, targetId)
      ? "You cannot remove yourself"
      : "You cannot act on another moderator");
  }

  const now = new Date();
  const until = untilFrom(minutes);

  // Close the viewer row and release any seat in one write.
  await LiveStream.updateOne({ _id: id }, {
    $set: {
      "viewers.$[v].leftAt": now,
      "cohoster.$[c].status": "removed",
      "cohoster.$[c].leftAt": now,
    },
  }, {
    arrayFilters: [
      { "v.user": oid(targetId), "v.leftAt": null },
      { "c.user": oid(targetId), "c.status": "approved" },
    ],
  });

  /*
    Lift any ban already standing before writing the new one, so the list holds
    one active ban per person rather than a stack that has to be unwound one row
    at a time to actually let someone back in.
  */
  await LiveStream.updateOne({ _id: id }, {
    $set: { "restrictions.$[r].liftedAt": now, "restrictions.$[r].liftedBy": oid(userId) },
  }, {
    arrayFilters: [{ "r.user": oid(targetId), "r.type": "ban", "r.liftedAt": null }],
  });

  await LiveStream.updateOne({ _id: id }, {
    $push: { restrictions: {
      user: oid(targetId), type: "ban", until,
      reason: String(reason || "").slice(0, 200), by: oid(userId), at: now,
    } },
  });

  const fresh = await LiveStream.findById(id).select("viewers").lean();
  ok(res, {
    message: until ? "Removed and banned until further notice" : "Removed from the stream",
    targetId,
    bannedUntil: until,
    permanent: !until,
    viewers: liveViewers(fresh).length,
  });
});

/* Silence someone in chat without removing them from the room. */
export const muteViewer = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId, minutes, reason } = req.body || {};

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");
  if (!canModerate(stream, userId)) return fail(res, 403, "Only the host or a moderator can do that");
  if (!outranks(stream, userId, targetId)) {
    return fail(res, 403, sameId(userId, targetId)
      ? "You cannot mute yourself"
      : isHost(stream, targetId)
        ? "You cannot mute the host"
        : "You cannot act on another moderator");
  }
  if (isMuted(stream, targetId)) return fail(res, 409, "That user is already muted");

  const now = new Date();
  const until = untilFrom(minutes);

  await LiveStream.updateOne({ _id: id }, {
    $push: { restrictions: {
      user: oid(targetId), type: "mute", until,
      reason: String(reason || "").slice(0, 200), by: oid(userId), at: now,
    } },
  });

  ok(res, {
    message: until ? "Muted" : "Muted for the rest of the stream",
    targetId, mutedUntil: until, permanent: !until,
  });
});

/*
  Lift a ban or a mute. Marks the row lifted rather than pulling it — the log is
  the point of keeping restrictions as rows, and a removed row cannot answer
  "who unbanned this person, and when?".
*/
export const liftRestriction = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId } = req.body || {};
  const type = String(req.body?.type || "").toLowerCase();

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }
  if (!["ban", "mute"].includes(type)) return fail(res, 400, "type must be ban or mute");

  const stream = await loadRoom(id);
  if (!stream) return fail(res, 404, "Stream not found");
  if (!canModerate(stream, userId)) return fail(res, 403, "Only the host or a moderator can do that");

  const standing = findRestriction(stream, targetId, type);
  if (!standing) return fail(res, 404, `That user has no active ${type}`);

  const now = new Date();
  await LiveStream.updateOne({ _id: id }, {
    $set: { "restrictions.$[r].liftedAt": now, "restrictions.$[r].liftedBy": oid(userId) },
  }, {
    arrayFilters: [{ "r.user": oid(targetId), "r.type": type, "r.liftedAt": null }],
  });

  ok(res, { message: type === "ban" ? "Unbanned" : "Unmuted", targetId, type });
});

/*
  The moderation log. Active restrictions first, then what has already lapsed or
  been lifted — a moderator arriving mid-stream needs both: who is silenced now,
  and what has already been dealt with so they do not re-litigate it.
*/
export const listModeration = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await LiveStream.findById(id)
    .select("hoster moderators restrictions")
    .populate("restrictions.user", "name image")
    .populate("moderators.user", "name image")
    .lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (!canModerate(stream, userId)) {
    return fail(res, 403, "Only the host or a moderator can see the moderation log");
  }

  const rows = (stream.restrictions || []).map(shapeRestriction);
  const active = rows.filter((r) => r.active);

  ok(res, {
    moderators: (stream.moderators || []).filter((m) => m.user).map((m) => m.user),
    activeBans: active.filter((r) => r.type === "ban").length,
    activeMutes: active.filter((r) => r.type === "mute").length,
    active,
    history: rows.filter((r) => !r.active)
      .sort((a, b) => new Date(b.at) - new Date(a.at)),
  });
});
