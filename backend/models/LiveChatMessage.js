// models/LiveChatMessage.js

import mongoose from "mongoose";

/*
  Live chat during a stream.

  A separate collection rather than the `messages[]` array already sitting on
  LiveStream: a busy room writes thousands of lines, and pushing every one into
  a subdocument array grows a single document without bound and rewrites it on
  each send. The legacy array stays where it is, unused by this path.

  Deletion is a tombstone, not a removal. A moderator deleting a line needs the
  row to survive so the moderation log can show what was said and who removed
  it; the read path filters tombstones out for everyone but the staff view.
*/

const KINDS = ["message", "system", "gift", "join"];

const liveChatMessageSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: "livestreamtbl", required: true },

  // Denormalised so the socket layer, which knows the channel and not the id,
  // can read the same rows without a lookup first.
  channelName: { type: String },

  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  text: { type: String, required: true, maxlength: 500 },

  // "message" is a person talking; the rest are generated lines the room shows
  // inline (a gift, someone arriving) and which moderation deliberately ignores.
  kind: { type: String, enum: KINDS, default: "message" },

  pinned: { type: Boolean, default: false },

  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },

  createdAt: { type: Date, default: Date.now },
});

// The room read: newest lines of one stream.
liveChatMessageSchema.index({ stream: 1, createdAt: -1 });
// Slow mode asks "when did this person last speak here?".
liveChatMessageSchema.index({ stream: 1, user: 1, createdAt: -1 });

const LiveChatMessage = mongoose.model("livechatmessage", liveChatMessageSchema);

export { KINDS as CHAT_KINDS };
export default LiveChatMessage;
