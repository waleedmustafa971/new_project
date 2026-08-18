import mongoose from "mongoose";

/*
  Admin audit trail.

  Every state-changing action an admin takes on a user is recorded here. An
  admin panel that can ban an account, adjust its coin balance or delete it
  outright without leaving a record is not something you can operate a real
  moderation team on — this is what answers "who suspended this account, when,
  and why" three weeks later.

  `before` / `after` hold only the fields the action touched, so a log entry
  stays readable and never becomes a second copy of the user document.
*/

export const ADMIN_ACTIONS = [
  "user.update",
  "user.ban",
  "user.suspend",
  "user.activate",
  "user.verify",
  "user.unverify",
  "user.coins",
  "user.delete",
  "user.restore",
  "user.password_reset",
  "user.sessions_revoked",
  "user.bulk",
];

const adminLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  adminName: { type: String },
  action: { type: String, enum: ADMIN_ACTIONS, required: true },

  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  targetName: { type: String },
  // Set instead of targetUser when one action covered many accounts.
  targetCount: { type: Number },

  reason: { type: String, trim: true },
  before: { type: Object },
  after: { type: Object },

  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
});

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ targetUser: 1, createdAt: -1 });
adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });

const AdminLog = mongoose.model("adminlogs", adminLogSchema);
export default AdminLog;
