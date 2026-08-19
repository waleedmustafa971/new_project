// models/LoginEvent.js

import mongoose from "mongoose";

/*
  Sign-in history, and the basis for login alerts.

  A row per successful sign-in, recording the device it came from. The point is
  not the log itself but the comparison: a sign-in from a device fingerprint
  this account has never used before is what an alert is for, and answering
  "have we seen this device?" needs the history to exist first.

  The fingerprint is derived from what the client sends (user agent, an optional
  device id) rather than being a real attestation. It is good enough to notice a
  new phone and useless as a security boundary on its own — which is why an
  alert is a notification, not a block.
*/

const loginEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  // Stable hash of the device signals below, used for the "seen before?" test.
  fingerprint: { type: String, required: true },

  deviceId: { type: String, default: "" },
  deviceName: { type: String, default: "" },
  platform: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  ip: { type: String, default: "" },
  location: { type: String, default: "" },

  // How the session was obtained, so the history distinguishes a password
  // login from a Google sign-in or a mobile-number verification.
  method: { type: String, default: "password" },

  // Whether this sign-in was the first from this fingerprint.
  isNewDevice: { type: Boolean, default: false },
  alerted: { type: Boolean, default: false },

  // The owner can mark a device as theirs, which stops future alerts for it.
  trusted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// The history read, and the "have we seen this device?" lookup.
loginEventSchema.index({ user: 1, createdAt: -1 });
loginEventSchema.index({ user: 1, fingerprint: 1 });

const LoginEvent = mongoose.model("loginevent", loginEventSchema);

export default LoginEvent;
