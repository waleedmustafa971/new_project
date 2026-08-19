// models/LiveReaction.js

import mongoose from "mongoose";

/*
  Floating-emoji reactions on a live stream.

  One row per (stream, user, type) carrying a count, not one row per tap. A
  viewer holding the heart button generates dozens of taps a second; a row per
  tap would write more documents than the chat does and make "how many hearts
  has this stream had?" a collection scan. Clients batch their taps and post a
  count, which is incremented onto the existing row.

  `lastAt` is what the animation layer polls: anything newer than the client's
  last poll is a burst it has not drawn yet.
*/

export const REACTION_TYPES = ["heart", "like", "laugh", "wow", "clap", "fire"];

const liveReactionSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: "livestreamtbl", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  type: { type: String, enum: REACTION_TYPES, required: true },

  count: { type: Number, default: 0, min: 0 },
  firstAt: { type: Date, default: Date.now },
  lastAt: { type: Date, default: Date.now },
});

// One row per person per emoji per stream — the upsert key.
liveReactionSchema.index({ stream: 1, user: 1, type: 1 }, { unique: true });
// The animation poll: recent activity on a stream.
liveReactionSchema.index({ stream: 1, lastAt: -1 });

const LiveReaction = mongoose.model("livereaction", liveReactionSchema);

export default LiveReaction;
