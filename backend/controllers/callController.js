/*
  Voice & Video Calling — 1:1 and group.

  The media path is Agora; this is the signalling and history the app needs
  around it: place a call, ring the other side, accept or decline, join and
  leave, end, and a call log afterwards.

  One model covers both cases — a 1:1 call is a group call with two
  participants — so ringing, joining and ending behave identically and there is
  only one place for that logic to be wrong.

  Every state change is pushed over the socket, because a ringing call that
  waits for the callee to poll is not a ringing call.
*/

import mongoose from "mongoose";
import crypto from "crypto";
import pkg from "agora-access-token";

import CallSession, { CALL_KIND } from "../models/CallSession.js";
import { MessageModel, ConversationModel } from "../models/ConversationModel.js";
import { GroupChat } from "../models/Groupchat.js";
import User from "../models/users.js";
import { getIO } from "../socket/socket.js";
import { isBlockedEither } from "../helpers/privacy.js";
import { notify } from "../services/notificationService.js";

const { RtcTokenBuilder, RtcRole } = pkg;

// Same credentials the live-stream controller uses.
const APP_ID = process.env.AGORA_APP_ID || "141ea750fc7847129f58316d5c4f6b79";
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "05b116941e164bdd8dbdd99cd01b3deb";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[calls]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const sameId = (a, b) => String(a) === String(b);
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const emit = (userIds, event, payload) => {
  try {
    const io = getIO();
    if (!io) return;
    for (const uid of new Set(userIds.filter(Boolean).map(String))) io.to(uid).emit(event, payload);
  } catch (err) {
    console.error("[calls] emit failed", event, err.message);
  }
};

// How long an unanswered call rings before it counts as missed.
export const RING_TIMEOUT_MS = 45 * 1000;

/*
  Agora publishes with a numeric uid. Deriving it from the ObjectId keeps it
  stable for a given user without a second lookup table; the high bit is
  cleared because Agora treats uid as an unsigned 32-bit value.
*/
const agoraUid = (userId) => {
  const h = crypto.createHash("md5").update(String(userId)).digest();
  return h.readUInt32BE(0) & 0x7fffffff;
};

const tokenFor = (channelName, userId, ttlSeconds = 3600) => {
  const uid = agoraUid(userId);
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return {
    uid,
    token: RtcTokenBuilder.buildTokenWithUid(
      APP_ID, APP_CERTIFICATE, channelName, uid, RtcRole.PUBLISHER, expires
    ),
    appId: APP_ID,
    expiresAt: new Date(expires * 1000),
  };
};

const shapeCall = (call) => ({
  _id: call._id,
  channelName: call.channelName,
  kind: call.kind,
  isGroup: call.isGroup,
  status: call.status,
  caller: call.caller,
  participants: call.participants,
  group: call.group || null,
  conversation: call.conversation || null,
  startedAt: call.startedAt,
  answeredAt: call.answeredAt || null,
  endedAt: call.endedAt || null,
  duration: call.duration || 0,
  endReason: call.endReason,
});

const participantIds = (call) => (call.participants || []).map((p) => String(p.user));

/*
  Writes the call into the conversation as a message, so the call log lives in
  the thread where it happened rather than in a separate screen the user has to
  go looking for.
*/
const logCallMessage = async (call) => {
  try {
    if (!call.conversation) return;
    const msg = await MessageModel.create({
      clientMessageId: `call-${call._id}`,
      text: "",
      messagetype: "call",
      msgByUserId: call.caller,
      call: call._id,
    });
    await ConversationModel.updateOne(
      { _id: call.conversation },
      { $push: { messages: msg._id }, $set: { lastMessageAt: new Date() } }
    );
    return msg;
  } catch (err) {
    console.error("[calls] could not log call message", err.message);
  }
};

/* ------------------------------------------------------------------ */
/* 1. Place a call (1:1 and group)                                     */
/* ------------------------------------------------------------------ */

export const startCall = wrap(async (req, res) => {
  const callerId = actorId(req);
  const { to, groupId, conversationId } = req.body || {};
  const kind = CALL_KIND.includes(req.body?.kind) ? req.body.kind : "audio";

  if (!isId(callerId)) return fail(res, 400, "A valid userId is required");

  let callees = [];
  let isGroup = false;
  let group = null;

  if (isId(groupId)) {
    group = await GroupChat.findById(groupId).select("members groupName").lean();
    if (!group) return fail(res, 404, "Group not found");
    if (!(group.members || []).some((m) => sameId(m, callerId))) {
      return fail(res, 403, "You are not a member of that group");
    }
    callees = (group.members || []).map(String).filter((m) => !sameId(m, callerId));
    isGroup = true;
  } else if (Array.isArray(to) && to.length > 0) {
    callees = to.filter(isId).map(String).filter((t) => !sameId(t, callerId));
    isGroup = callees.length > 1;
  } else if (isId(to)) {
    callees = [String(to)];
  } else {
    return fail(res, 400, "Supply `to` (a user id or list) or `groupId`");
  }

  if (callees.length === 0) return fail(res, 400, "A call needs at least one other person");
  if (callees.length > 15) return fail(res, 400, "A group call is limited to 16 participants");

  // Blocking applies to calls exactly as it does to messages.
  if (!isGroup) {
    if (await isBlockedEither(callerId, callees[0])) {
      return fail(res, 403, "You can't call this person");
    }
  }

  /*
    One live call per person. Without this a second call places the callee in
    two channels at once and the first is never cleaned up.
  */
  const busy = await CallSession.findOne({
    status: { $in: ["ringing", "ongoing"] },
    "participants.user": oid(callerId),
  }).lean();
  if (busy) return fail(res, 409, "You are already on a call");

  const channelName = `call-${crypto.randomBytes(8).toString("hex")}`;

  const call = await CallSession.create({
    channelName,
    kind,
    isGroup,
    caller: oid(callerId),
    group: isGroup && group ? group._id : undefined,
    conversation: isId(conversationId) ? oid(conversationId) : undefined,
    status: "ringing",
    startedAt: new Date(),
    participants: [
      { user: oid(callerId), status: "joined", joinedAt: new Date() },
      ...callees.map((c) => ({ user: oid(c), status: "ringing" })),
    ],
  });

  const caller = await User.findById(callerId).select("name image").lean();
  const creds = tokenFor(channelName, callerId);

  emit(callees, "incomingCall", {
    callId: call._id,
    channelName,
    kind,
    isGroup,
    from: { _id: caller?._id, name: caller?.name, image: caller?.image },
    group: group ? { _id: group._id, name: group.groupName } : null,
    ringTimeoutMs: RING_TIMEOUT_MS,
  });

  // A push covers the callee having the app closed, where a socket cannot land.
  for (const c of callees) {
    await notify({
      recipient: c, actor: callerId, type: "live_request",
      preview: `is calling you${kind === "video" ? " (video)" : ""}`,
    });
  }

  ok(res, {
    message: "Ringing",
    call: shapeCall(call),
    ...creds,
    ringTimeoutMs: RING_TIMEOUT_MS,
  });
});

/* ------------------------------------------------------------------ */
/* 2. Answer, decline, join, leave, end                                */
/* ------------------------------------------------------------------ */

export const answerCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (["ended", "declined", "missed", "cancelled"].includes(call.status)) {
    return fail(res, 409, `This call already ${call.status}`);
  }

  const seat = (call.participants || []).find((p) => sameId(p.user, userId));
  if (!seat) return fail(res, 403, "You were not invited to this call");
  if (seat.status === "joined") return fail(res, 409, "You are already on this call");

  const now = new Date();
  await CallSession.updateOne(
    { _id: id, "participants.user": oid(userId) },
    {
      $set: {
        "participants.$.status": "joined",
        "participants.$.joinedAt": now,
        status: "ongoing",
        // Only the first answer starts the clock.
        ...(call.answeredAt ? {} : { answeredAt: now }),
      },
    }
  );

  const fresh = await CallSession.findById(id).lean();
  emit(participantIds(fresh), "callAnswered", { callId: id, userId, at: now });

  ok(res, { message: "Joined the call", call: shapeCall(fresh), ...tokenFor(call.channelName, userId) });
});

export const declineCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (!(call.participants || []).some((p) => sameId(p.user, userId))) {
    return fail(res, 403, "You were not invited to this call");
  }

  await CallSession.updateOne(
    { _id: id, "participants.user": oid(userId) },
    { $set: { "participants.$.status": "declined" } }
  );

  const fresh = await CallSession.findById(id).lean();

  /*
    A 1:1 decline ends the call. In a group it does not — the others may still
    be talking — unless nobody is left who could answer.
  */
  const stillPossible = (fresh.participants || []).some(
    (p) => ["ringing", "invited", "joined"].includes(p.status) && !sameId(p.user, fresh.caller)
  );

  if (!fresh.isGroup || !stillPossible) {
    await CallSession.updateOne({ _id: id }, {
      $set: { status: "declined", endedAt: new Date(), endedBy: oid(userId), endReason: "declined" },
    });
    const done = await CallSession.findById(id).lean();
    await logCallMessage(done);
    emit(participantIds(done), "callEnded", { callId: id, status: "declined", by: userId });
    return ok(res, { message: "Call declined", call: shapeCall(done) });
  }

  emit(participantIds(fresh), "callParticipantDeclined", { callId: id, userId });
  ok(res, { message: "You declined", call: shapeCall(fresh) });
});

/* Join a group call already in progress. */
export const joinCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (!["ringing", "ongoing"].includes(call.status)) return fail(res, 409, "This call has ended");
  if (!call.isGroup) return fail(res, 400, "Only a group call can be joined");

  if (call.group) {
    const group = await GroupChat.findById(call.group).select("members").lean();
    if (!(group?.members || []).some((m) => sameId(m, userId))) {
      return fail(res, 403, "You are not a member of that group");
    }
  }

  const joined = (call.participants || []).filter((p) => p.status === "joined").length;
  if (joined >= 16) return fail(res, 409, "This call is full (16 participants)");

  const now = new Date();
  const seat = (call.participants || []).find((p) => sameId(p.user, userId));
  if (seat?.status === "joined") return fail(res, 409, "You are already on this call");

  if (seat) {
    await CallSession.updateOne(
      { _id: id, "participants.user": oid(userId) },
      { $set: { "participants.$.status": "joined", "participants.$.joinedAt": now, "participants.$.leftAt": null } }
    );
  } else {
    await CallSession.updateOne({ _id: id }, {
      $push: { participants: { user: oid(userId), status: "joined", joinedAt: now } },
    });
  }
  await CallSession.updateOne({ _id: id }, { $set: { status: "ongoing", ...(call.answeredAt ? {} : { answeredAt: now }) } });

  const fresh = await CallSession.findById(id).lean();
  emit(participantIds(fresh), "callParticipantJoined", { callId: id, userId, at: now });

  ok(res, { message: "Joined", call: shapeCall(fresh), ...tokenFor(call.channelName, userId) });
});

export const leaveCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");

  const seat = (call.participants || []).find((p) => sameId(p.user, userId) && p.status === "joined");
  if (!seat) return fail(res, 404, "You are not on this call");

  const now = new Date();
  const seconds = seat.joinedAt ? Math.round((now - new Date(seat.joinedAt)) / 1000) : 0;

  await CallSession.updateOne(
    { _id: id, "participants.user": oid(userId) },
    { $set: { "participants.$.status": "left", "participants.$.leftAt": now, "participants.$.duration": seconds } }
  );

  const fresh = await CallSession.findById(id).lean();
  const remaining = (fresh.participants || []).filter((p) => p.status === "joined").length;

  // A call with one person left is over.
  if (remaining <= 1) {
    return endCallInternal(fresh, userId, "everyone left", res);
  }

  emit(participantIds(fresh), "callParticipantLeft", { callId: id, userId, duration: seconds });
  ok(res, { message: "You left the call", duration: seconds, remaining });
});

const endCallInternal = async (call, byUserId, reason, res) => {
  const now = new Date();
  const duration = call.answeredAt ? Math.round((now - new Date(call.answeredAt)) / 1000) : 0;

  await CallSession.updateOne({ _id: call._id }, {
    $set: {
      status: call.answeredAt ? "ended" : "cancelled",
      endedAt: now,
      endedBy: byUserId ? oid(byUserId) : undefined,
      endReason: reason,
      duration,
      "participants.$[j].status": "left",
      "participants.$[j].leftAt": now,
    },
  }, { arrayFilters: [{ "j.status": "joined" }] });

  const done = await CallSession.findById(call._id).lean();
  await logCallMessage(done);

  emit(participantIds(done), "callEnded", {
    callId: call._id, status: done.status, duration, by: byUserId, reason,
  });

  if (res) ok(res, { message: "Call ended", call: shapeCall(done), duration });
  return done;
};

export const endCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (["ended", "declined", "missed", "cancelled"].includes(call.status)) {
    return fail(res, 409, `This call already ${call.status}`);
  }
  if (!(call.participants || []).some((p) => sameId(p.user, userId))) {
    return fail(res, 403, "You are not on this call");
  }

  await endCallInternal(call, userId, req.body?.reason || "ended by participant", res);
});

/*
  Marks a call nobody answered. Called by the caller's client when its ring
  timer runs out — the server does not hold a timer per call, which would not
  survive a restart.
*/
export const timeoutCall = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (call.status !== "ringing") return fail(res, 409, "That call is no longer ringing");
  if (!sameId(call.caller, userId)) return fail(res, 403, "Only the caller can time out a call");

  const now = new Date();
  await CallSession.updateOne({ _id: id }, {
    $set: {
      status: "missed", endedAt: now, endReason: "no answer",
      "participants.$[r].status": "missed",
    },
  }, { arrayFilters: [{ "r.status": { $in: ["ringing", "invited"] } }] });

  const done = await CallSession.findById(id).lean();
  await logCallMessage(done);

  emit(participantIds(done), "callMissed", { callId: id });
  for (const p of done.participants || []) {
    if (sameId(p.user, done.caller)) continue;
    await notify({
      recipient: p.user, actor: done.caller, type: "live_request",
      preview: `missed call${done.kind === "video" ? " (video)" : ""}`,
    });
  }

  ok(res, { message: "Marked as missed", call: shapeCall(done) });
});

/* ------------------------------------------------------------------ */
/* 3. In-call controls and state                                       */
/* ------------------------------------------------------------------ */

export const setCallMedia = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { micOn, cameraOn } = req.body || {};

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");
  if (micOn === undefined && cameraOn === undefined) {
    return fail(res, 400, "Supply micOn and/or cameraOn");
  }

  const set = {};
  if (micOn !== undefined) set["participants.$.micOn"] = !!micOn;
  if (cameraOn !== undefined) set["participants.$.cameraOn"] = !!cameraOn;

  const r = await CallSession.updateOne(
    { _id: id, participants: { $elemMatch: { user: oid(userId), status: "joined" } } },
    { $set: set }
  );
  if (r.matchedCount === 0) return fail(res, 404, "You are not on this call");

  const fresh = await CallSession.findById(id).lean();
  emit(participantIds(fresh), "callMediaChanged", { callId: id, userId, micOn, cameraOn });

  ok(res, { message: "Updated", micOn, cameraOn });
});

export const getCall = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid call id is required");

  const call = await CallSession.findById(id)
    .populate("caller", "name image")
    .populate("participants.user", "name image")
    .lean();
  if (!call) return fail(res, 404, "Call not found");

  ok(res, { call: shapeCall(call) });
});

/* A fresh Agora token, for a call that outlives the first one. */
export const refreshCallToken = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).select("channelName status participants").lean();
  if (!call) return fail(res, 404, "Call not found");
  if (!["ringing", "ongoing"].includes(call.status)) return fail(res, 409, "This call has ended");
  if (!(call.participants || []).some((p) => sameId(p.user, userId))) {
    return fail(res, 403, "You are not on this call");
  }

  ok(res, { ...tokenFor(call.channelName, userId) });
});

/* Whatever call this user is currently in, for reconnecting after a crash. */
export const activeCall = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const call = await CallSession.findOne({
    status: { $in: ["ringing", "ongoing"] },
    "participants.user": oid(userId),
  }).populate("caller", "name image").populate("participants.user", "name image").lean();

  if (!call) return ok(res, { active: false, call: null });

  ok(res, { active: true, call: shapeCall(call), ...tokenFor(call.channelName, userId) });
});

/* ------------------------------------------------------------------ */
/* 4. Call history                                                     */
/* ------------------------------------------------------------------ */

export const callHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { "participants.user": oid(userId) };
  if (req.query.kind) filter.kind = String(req.query.kind);
  if (req.query.missed === "true") filter.status = "missed";

  const [rows, total, missed] = await Promise.all([
    CallSession.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit)
      .populate("caller", "name image")
      .populate("participants.user", "name image")
      .populate("group", "groupName groupimage")
      .lean(),
    CallSession.countDocuments(filter),
    CallSession.countDocuments({
      "participants.user": oid(userId), status: "missed", caller: { $ne: oid(userId) },
    }),
  ]);

  ok(res, {
    page, limit, total, missed,
    hasMore: skip + rows.length < total,
    calls: rows.map((c) => ({
      ...shapeCall(c),
      // Which way the call went, from this user's point of view.
      direction: sameId(c.caller?._id || c.caller, userId) ? "outgoing" : "incoming",
    })),
  });
});

export const deleteCallRecord = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid call id and userId are required");

  const call = await CallSession.findById(id).lean();
  if (!call) return fail(res, 404, "Call not found");
  if (!(call.participants || []).some((p) => sameId(p.user, userId))) {
    return fail(res, 403, "That call is not yours");
  }
  if (["ringing", "ongoing"].includes(call.status)) return fail(res, 409, "That call is still live");

  await CallSession.deleteOne({ _id: id });
  ok(res, { message: "Call record deleted" });
});
