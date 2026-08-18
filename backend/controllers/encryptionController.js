/*
  Encrypted Messages — key directory and envelope handling.

  What the server does: hold public keys, hand them out, and store ciphertext.
  What the server never does: hold a private key, or see plaintext. Those two
  sentences are the whole design — a server that could decrypt would not be
  offering end-to-end encryption, whatever the marketing said.

  The flow a client follows:
    1. On install, generate a key pair and POST /keys with the public half.
    2. Before the first message, GET /keys/:userId for every recipient device
       and take one one-time pre-key each.
    3. Encrypt the message body once, wrap the content key for each device, and
       send the ciphertext with the envelope.
    4. Recipients unwrap with their private key. The server routes bytes it
       cannot read.

  Storage: `text` carries the ciphertext and `encryption` the envelope. Because
  the server cannot read the body, encrypted messages are excluded from search
  and cannot be edited server-side — both are enforced elsewhere and are the
  honest consequence of the guarantee, not an oversight.
*/

import mongoose from "mongoose";

import DeviceKey from "../models/DeviceKey.js";
import { MessageModel, ConversationModel } from "../models/ConversationModel.js";
import { GroupChat } from "../models/Groupchat.js";
import { getIO } from "../socket/socket.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[e2e]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const sameId = (a, b) => String(a) === String(b);
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

// Public keys are base64 and bounded — this rejects junk before it is stored.
const isKey = (v) =>
  typeof v === "string" && v.length >= 32 && v.length <= 2048 && /^[A-Za-z0-9+/=_-]+$/.test(v);

/* ------------------------------------------------------------------ */
/* 1. Publish and manage device keys                                   */
/* ------------------------------------------------------------------ */

export const registerDevice = wrap(async (req, res) => {
  const userId = actorId(req);
  const {
    deviceId, deviceName, platform,
    identityKey, signedPreKey, signedPreKeySignature,
    oneTimePreKeys, algorithm,
  } = req.body || {};

  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!deviceId || String(deviceId).length > 128) return fail(res, 400, "A valid deviceId is required");
  if (!isKey(identityKey)) return fail(res, 400, "identityKey must be a base64 public key");
  if (!isKey(signedPreKey)) return fail(res, 400, "signedPreKey must be a base64 public key");
  if (!isKey(signedPreKeySignature)) return fail(res, 400, "signedPreKeySignature is required");

  const preKeys = Array.isArray(oneTimePreKeys) ? oneTimePreKeys.filter(isKey).slice(0, 200) : [];

  /*
    Anything that looks like a private key is refused outright. Clients should
    never send one, and quietly storing it would turn a client bug into a
    silent compromise of every conversation that device is in.
  */
  const body = JSON.stringify(req.body || {});
  if (/private[_-]?key|"?secretKey"?|BEGIN [A-Z ]*PRIVATE KEY/i.test(body)) {
    return fail(res, 400, "Never send a private key — publish only the public half");
  }

  const doc = await DeviceKey.findOneAndUpdate(
    { user: oid(userId), deviceId: String(deviceId) },
    {
      $set: {
        deviceName, platform: platform || "unknown",
        identityKey, signedPreKey, signedPreKeySignature,
        algorithm: algorithm || "x25519-xchacha20-poly1305",
        active: true, lastSeenAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  /*
    Pre-keys are replaced wholesale rather than appended: re-registering means
    the client regenerated its bundle, so the old ones no longer have a private
    half and handing one out would break the session it was used for.
  */
  if (preKeys.length) {
    await DeviceKey.updateOne({ _id: doc._id }, { $set: { oneTimePreKeys: preKeys } });
  }

  ok(res, {
    message: "Device key published",
    deviceId: doc.deviceId,
    preKeysAvailable: preKeys.length || (doc.oneTimePreKeys || []).length,
  });
});

/* Top up one-time pre-keys as they get consumed. */
export const addPreKeys = wrap(async (req, res) => {
  const userId = actorId(req);
  const { deviceId, oneTimePreKeys } = req.body || {};
  if (!isId(userId) || !deviceId) return fail(res, 400, "userId and deviceId are required");

  const keys = Array.isArray(oneTimePreKeys) ? oneTimePreKeys.filter(isKey) : [];
  if (keys.length === 0) return fail(res, 400, "Supply at least one valid pre-key");

  const doc = await DeviceKey.findOne({ user: oid(userId), deviceId: String(deviceId) });
  if (!doc) return fail(res, 404, "Device not registered");

  const room = Math.max(200 - (doc.oneTimePreKeys || []).length, 0);
  if (room === 0) return fail(res, 409, "This device already holds the maximum of 200 pre-keys");

  await DeviceKey.updateOne(
    { _id: doc._id },
    { $push: { oneTimePreKeys: { $each: keys.slice(0, room) } }, $set: { lastSeenAt: new Date() } }
  );

  const fresh = await DeviceKey.findById(doc._id).select("oneTimePreKeys").lean();
  ok(res, { message: "Pre-keys added", available: (fresh.oneTimePreKeys || []).length });
});

/*
  The key bundle for a user's devices.

  Each device hands out one one-time pre-key and immediately drops it, so two
  senders never build a session against the same one. Running out is not fatal
  — the client falls back to the signed pre-key — but `preKeysLow` tells the
  owner's client to top up.
*/
export const getKeys = wrap(async (req, res) => {
  const { userId } = req.params;
  if (!isId(userId)) return fail(res, 400, "Valid userId is required");

  const devices = await DeviceKey.find({ user: oid(userId), active: true }).lean();
  if (devices.length === 0) return fail(res, 404, "That user has not set up encryption yet");

  const bundle = [];
  for (const d of devices) {
    const preKey = (d.oneTimePreKeys || [])[0] || null;
    if (preKey) {
      await DeviceKey.updateOne({ _id: d._id }, { $pull: { oneTimePreKeys: preKey } });
    }
    bundle.push({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      platform: d.platform,
      identityKey: d.identityKey,
      signedPreKey: d.signedPreKey,
      signedPreKeySignature: d.signedPreKeySignature,
      oneTimePreKey: preKey,
      algorithm: d.algorithm,
    });
  }

  ok(res, { userId, devices: bundle, deviceCount: bundle.length });
});

/* My own devices, so a user can see and revoke where they are signed in. */
export const myDevices = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const devices = await DeviceKey.find({ user: oid(userId) })
    .select("deviceId deviceName platform active lastSeenAt createdAt oneTimePreKeys algorithm").lean();

  ok(res, {
    total: devices.length,
    devices: devices.map((d) => ({
      deviceId: d.deviceId, deviceName: d.deviceName, platform: d.platform,
      active: d.active, lastSeenAt: d.lastSeenAt, createdAt: d.createdAt,
      algorithm: d.algorithm,
      preKeysAvailable: (d.oneTimePreKeys || []).length,
      preKeysLow: (d.oneTimePreKeys || []).length < 10,
    })),
  });
});

export const revokeDevice = wrap(async (req, res) => {
  const userId = actorId(req);
  const { deviceId } = req.params;
  if (!isId(userId) || !deviceId) return fail(res, 400, "userId and deviceId are required");

  const r = await DeviceKey.deleteOne({ user: oid(userId), deviceId: String(deviceId) });
  if (r.deletedCount === 0) return fail(res, 404, "Device not found");

  ok(res, {
    message: "Device revoked",
    // Past messages stay unreadable-by-server but are also now unrecoverable on
    // that device, which is the point of revoking it.
    note: "Messages already delivered to that device cannot be recovered",
  });
});

/*
  The fingerprint two people compare out of band to be sure no one is sitting
  in the middle. Derived from both identity keys in a fixed order, so both
  sides compute the same string.
*/
export const safetyNumber = wrap(async (req, res) => {
  const userId = actorId(req);
  const { otherId } = req.params;
  if (!isId(userId) || !isId(otherId)) return fail(res, 400, "Valid userId and otherId are required");

  const [mine, theirs] = await Promise.all([
    DeviceKey.find({ user: oid(userId), active: true }).select("identityKey").lean(),
    DeviceKey.find({ user: oid(otherId), active: true }).select("identityKey").lean(),
  ]);
  if (mine.length === 0 || theirs.length === 0) {
    return fail(res, 404, "Both people need encryption set up before a safety number exists");
  }

  const { createHash } = await import("crypto");
  const a = mine.map((d) => d.identityKey).sort().join("");
  const b = theirs.map((d) => d.identityKey).sort().join("");
  // Sorted so both sides hash the same input regardless of who asks.
  const digest = createHash("sha256").update([a, b].sort().join("|")).digest("hex");

  ok(res, {
    safetyNumber: (digest.match(/.{1,5}/g) || []).slice(0, 12).join(" "),
    note: "Compare this with the other person in a call or in person",
  });
});

/* ------------------------------------------------------------------ */
/* 2. Turn encryption on for a conversation                            */
/* ------------------------------------------------------------------ */

export const enableEncryption = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid conversation id and userId are required");

  const convo = await ConversationModel.findById(id).lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  let members = [String(convo.sender), String(convo.receiver)].filter(Boolean);
  if (convo.type === "group" && convo.group) {
    const group = await GroupChat.findById(convo.group).select("members").lean();
    members = (group?.members || []).map(String);
  }
  if (!members.some((m) => sameId(m, userId))) return fail(res, 403, "You are not in this conversation");

  // Everyone needs a published key, or their messages would be undeliverable.
  const withKeys = await DeviceKey.distinct("user", {
    user: { $in: members.map(oid) }, active: true,
  });
  const missing = members.filter((m) => !withKeys.some((w) => sameId(w, m)));
  if (missing.length > 0) {
    return fail(res, 409, `${missing.length} participant(s) have not set up encryption yet`);
  }

  await ConversationModel.updateOne({ _id: id }, { $set: { encryptionEnabled: true } });

  try {
    const io = getIO();
    if (io) for (const m of members) io.to(m).emit("encryptionEnabled", { conversationId: id, by: userId });
  } catch { /* socket optional */ }

  ok(res, { message: "Encryption enabled", conversationId: id, participants: members.length });
});

export const encryptionStatus = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Valid conversation id is required");

  const convo = await ConversationModel.findById(id).select("encryptionEnabled type group sender receiver").lean();
  if (!convo) return fail(res, 404, "Conversation not found");

  let members = [String(convo.sender), String(convo.receiver)].filter(Boolean);
  if (convo.type === "group" && convo.group) {
    const group = await GroupChat.findById(convo.group).select("members").lean();
    members = (group?.members || []).map(String);
  }

  const devices = await DeviceKey.find({ user: { $in: members.map(oid) }, active: true })
    .select("user deviceId").lean();

  const ready = new Set(devices.map((d) => String(d.user)));
  ok(res, {
    enabled: !!convo.encryptionEnabled,
    participants: members.length,
    withKeys: ready.size,
    devices: devices.length,
    readyToEnable: members.every((m) => ready.has(m)),
  });
});

/*
  Store an already-encrypted message. The body arrives as ciphertext with the
  envelope; the server validates the shape and routes it, and at no point holds
  anything it could decrypt.
*/
export const storeEncrypted = wrap(async (req, res) => {
  const userId = actorId(req);
  const { conversationId, clientMessageId, ciphertext, encryption } = req.body || {};

  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!isId(conversationId)) return fail(res, 400, "Valid conversationId is required");
  if (!clientMessageId) return fail(res, 400, "clientMessageId is required");
  if (typeof ciphertext !== "string" || ciphertext.length === 0) {
    return fail(res, 400, "ciphertext is required");
  }
  if (!encryption?.iv || !encryption?.algorithm || !encryption?.keys) {
    return fail(res, 400, "encryption must carry algorithm, iv and per-device keys");
  }

  const convo = await ConversationModel.findById(conversationId).lean();
  if (!convo) return fail(res, 404, "Conversation not found");
  if (!convo.encryptionEnabled) return fail(res, 409, "Encryption is not enabled for this conversation");

  let members = [String(convo.sender), String(convo.receiver)].filter(Boolean);
  if (convo.type === "group" && convo.group) {
    const group = await GroupChat.findById(convo.group).select("members").lean();
    members = (group?.members || []).map(String);
  }
  if (!members.some((m) => sameId(m, userId))) return fail(res, 403, "You are not in this conversation");

  const msg = await MessageModel.create({
    clientMessageId,
    text: ciphertext,
    messagetype: "encrypted",
    msgByUserId: oid(userId),
    encrypted: true,
    encryption: {
      algorithm: encryption.algorithm,
      iv: encryption.iv,
      senderKeyId: encryption.senderKeyId,
      keys: encryption.keys,
    },
  });

  await ConversationModel.updateOne(
    { _id: conversationId },
    { $push: { messages: msg._id }, $set: { lastMessageAt: new Date() } }
  );

  // Disappearing applies to encrypted messages exactly as to plain ones.
  if (convo.disappearingSeconds) {
    await MessageModel.updateOne(
      { _id: msg._id },
      { $set: { expiresAt: new Date(Date.now() + convo.disappearingSeconds * 1000) } }
    );
  }

  try {
    const io = getIO();
    if (io) {
      for (const m of members) {
        io.to(m).emit("receiveMessage", { conversationId, messages: msg });
      }
    }
  } catch { /* socket optional */ }

  ok(res, { message: "Stored", messageId: msg._id, encrypted: true });
});
