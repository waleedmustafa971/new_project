import mongoose from "mongoose";

/*
  Moderation queue for the Social Media module.
  Covers: "Report a Post", "Block & Report a User", "Admin - Content Moderation".
*/
const reportSchema = new mongoose.Schema(
  {
    // Who raised the report
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "users" },

    // What is being reported
    targetType: {
      type: String,
      enum: ["post", "reel", "story", "comment", "user", "group", "livestream", "message"],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Owner of the reported content (denormalised so admin can act on the account fast)
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "users" },

    reason: { type: String },
    details: { type: String },

    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
    },
    actionTaken: {
      type: String,
      enum: ["none", "content_hidden", "content_deleted", "user_warned", "user_suspended", "user_banned"],
      default: "none",
    },
    adminNote: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
