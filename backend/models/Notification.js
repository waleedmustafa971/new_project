import mongoose from "mongoose";

/*
  In-app notification record (Engagement module).

  One row per (recipient, actor, type, target). Repeatable actions — liking,
  unliking and liking again — upsert the same row and bump `createdAt` rather
  than stacking duplicates, so a user toggling a like cannot spam the list.
  Actions that are genuinely distinct each time (a comment, a reply) carry a
  `commentId`, which makes the key unique per comment.

  Push delivery is a side effect handled in services/notificationService.js;
  this collection is the source of truth for the in-app list and badge count.
*/

export const NOTIFICATION_TYPES = [
  "like",             // reacted to your post
  "comment",          // commented on your post
  "reply",            // replied to your comment
  "comment_like",     // hearted your comment
  "mention_post",     // @mentioned you in a post
  "mention_comment",  // @mentioned you in a comment
  "tag",              // tagged you in a photo
  "follow",           // started following you
  "share",            // shared your post
  "live_request",     // asked to co-host / join your live as a guest
  "live_gift",        // sent a gift on your live

  /* Groups & Community */
  "group_request",    // asked to join a group you moderate
  "group_approved",   // your request to join was approved
  "group_invite",     // invited you to a group
  "group_role",       // made you an admin / moderator of a group
  "group_post",       // your group post was approved or removed
];

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  actor:     { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  type:      { type: String, enum: NOTIFICATION_TYPES, required: true },

  // Target. `post` is absent for a follow; `commentId` points at a subdocument
  // of Reels.comments, which is why it is a bare ObjectId and not a ref.
  post:      { type: mongoose.Schema.Types.ObjectId, ref: "Reels", default: null },
  commentId: { type: mongoose.Schema.Types.ObjectId, default: null },

  /*
    Which group the notification came from. Context only — deliberately NOT
    part of the upsert key below, because the unique index already deployed
    covers five fields and adding a sixth would make every group notification
    collide with it on insert and be dropped. The cost is that two requests
    from the same person to two groups you moderate collapse into one row.
  */
  group:     { type: mongoose.Schema.Types.ObjectId, ref: "socialgroup", default: null },

  // Denormalised so the list endpoint does not have to re-read the post for
  // every row just to show a line of context.
  preview:      { type: String },
  reactionType: { type: String },
  thumbnail:    { type: String },

  read:   { type: Boolean, default: false },
  readAt: { type: Date, default: null },

  // Whether the push was actually handed to FCM — useful when debugging a
  // "notification never arrived" report.
  pushed: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
// The upsert key. `commentId` is null for post-level actions, which still
// makes the tuple unique for those.
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1, post: 1, commentId: 1 },
  { unique: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
