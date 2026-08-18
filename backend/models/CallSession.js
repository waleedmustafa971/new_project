import mongoose from "mongoose";

/*
  Voice / video call session — 1:1 and group.

  The media itself runs over Agora; this is the signalling and history record
  that says a call happened, who was on it, and how it ended. One model covers
  both cases: a 1:1 call is a group call with two participants, and keeping
  them together means ringing, accepting and ending behave identically.
*/

export const CALL_STATUS = ["ringing", "ongoing", "ended", "missed", "declined", "cancelled", "failed"];
export const CALL_KIND = ["audio", "video"];

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "users", required: true },
  status: {
    type: String,
    enum: ["invited", "ringing", "joined", "left", "declined", "missed"],
    default: "invited",
  },
  joinedAt: { type: Date },
  leftAt: { type: Date },
  micOn: { type: Boolean, default: true },
  cameraOn: { type: Boolean, default: true },
  // Seconds this person was actually connected.
  duration: { type: Number, default: 0 },
}, { _id: false });

const callSessionSchema = new mongoose.Schema({
  // Agora channel. Unique so two callers cannot collide on one room.
  channelName: { type: String, required: true, unique: true },
  kind: { type: String, enum: CALL_KIND, default: "audio" },
  isGroup: { type: Boolean, default: false },

  caller: { type: mongoose.Schema.ObjectId, ref: "users", required: true },
  participants: { type: [participantSchema], default: [] },

  conversation: { type: mongoose.Schema.ObjectId, ref: "Conversation" },
  group: { type: mongoose.Schema.ObjectId, ref: "GroupChat" },

  status: { type: String, enum: CALL_STATUS, default: "ringing" },

  startedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date },
  endedAt: { type: Date },
  // Whole-call duration in seconds, measured from the first answer.
  duration: { type: Number, default: 0 },
  endedBy: { type: mongoose.Schema.ObjectId, ref: "users" },
  endReason: { type: String },
}, { timestamps: true });

callSessionSchema.index({ caller: 1, createdAt: -1 });
callSessionSchema.index({ "participants.user": 1, createdAt: -1 });
callSessionSchema.index({ status: 1, startedAt: -1 });

const CallSession = mongoose.model("callsessions", callSessionSchema);
export default CallSession;
