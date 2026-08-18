// models/LiveStream.js

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
 userid: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "users", // MUST match model name
  required: true,
},

 message: { type: String }
});

const hostSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    avatar: { type: String },
    followers_count: { type: Number, default: 0 },
    is_following: { type: Boolean, default: false }
}, { _id: false });

const liveStreamSchema = new mongoose.Schema({
    channelName: { type: String, required: true, unique: true }, // The Agora Channel Name
    hoster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // MUST match model name
    required: true,
    },
    cohoster: [
    {
    user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
    },
    micOn: { type: Boolean, default: true },
    videoOn: { type: Boolean, default: true },
    status: {
    type: String,
    enum: ["requested", "approved", "rejected", "left", "removed"],
    default: "requested"
    },
    // A co-host is invited to share the broadcast; a guest is a viewer who
    // asked to come up. Same seat mechanics, different intent and UI.
    role: {
    type: String,
    enum: ["cohost", "guest"],
    default: "cohost"
    },
    joinedAt: { type: Date },
    leftAt: { type: Date }
    }
    ],

    // Who is currently watching. Kept as rows rather than a bare counter so a
    // reconnect cannot double-count and a viewer list is possible.
    viewers: [
    {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null }
    }
    ],
    peak_viewers: { type: Number, default: 0 },

    // Running total of gift coins received on this stream.
    gift_coins: { type: Number, default: 0 },
    endedAt: { type: Date },
    stream_url: { type: String },
    thumbnail: { type: String },
    title: { type: String },
    location: { type: String },
    coins: { type: Number, default: 0 },
    viewers_count: { type: Number, default: 0 },
   // viewers_count: { type: Number, min: 0, default: 0 }
    request_boxes: { type: Number, default: 5 },
    messages: { type: [messageSchema], default: [] },
    status: { type: String, enum: ['live', 'ended'], default: 'live' },
    enteredby: { type: Date, default: Date.now },
    updateby: { type: Date, default: Date.now },
    xtime: { type: Date, default: Date.now },
});

liveStreamSchema.index({ status: 1, enteredby: -1 });
liveStreamSchema.index({ hoster: 1, status: 1 });
liveStreamSchema.index({ "viewers.user": 1 });

const LiveStream = mongoose.model('livestreamtbl', liveStreamSchema);

export default LiveStream;
