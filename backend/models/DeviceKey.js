import mongoose from "mongoose";

/*
  Public key directory for end-to-end encrypted messages.

  The server holds public keys only. It never sees a private key and never sees
  plaintext: clients fetch the recipient's device keys, wrap a content key for
  each, and send the ciphertext. That is the whole point — a server that could
  decrypt is not end-to-end encrypted.

  One row per device, because a user reading on a phone and a tablet needs the
  message wrapped for both.
*/

const deviceKeySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "users", required: true },
  // Client-generated, stable for the life of the install.
  deviceId: { type: String, required: true },
  deviceName: { type: String },
  platform: { type: String, enum: ["ios", "android", "web", "unknown"], default: "unknown" },

  // Long-term identity key (base64). Used to sign the signed pre-key.
  identityKey: { type: String, required: true },
  // Medium-term key clients use to establish a session.
  signedPreKey: { type: String, required: true },
  signedPreKeySignature: { type: String, required: true },
  /*
    Single-use pre-keys. Each is handed out at most once and then removed, so
    two senders never establish a session against the same one. Running out is
    survivable — clients fall back to the signed pre-key — but the client
    should top these up.
  */
  oneTimePreKeys: { type: [String], default: [] },

  algorithm: { type: String, default: "x25519-xchacha20-poly1305" },
  active: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

deviceKeySchema.index({ user: 1, deviceId: 1 }, { unique: true });
deviceKeySchema.index({ user: 1, active: 1 });

const DeviceKey = mongoose.model("devicekeys", deviceKeySchema);
export default DeviceKey;
