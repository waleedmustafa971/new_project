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
    // "requested" is viewer-initiated (they asked to come up); "invited" is
    // host-initiated and waits on the invitee instead of on the host. Keeping
    // both in one enum means a seat is one row whichever direction it started
    // from, so a person cannot hold a pending request and a pending invite at
    // the same time and be approved twice.
    status: {
    type: String,
    enum: ["requested", "invited", "approved", "rejected", "declined", "left", "removed"],
    default: "requested"
    },
    // A co-host is invited to share the broadcast; a guest is a viewer who
    // asked to come up. Same seat mechanics, different intent and UI.
    role: {
    type: String,
    enum: ["cohost", "guest"],
    default: "cohost"
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    invitedAt: { type: Date },
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

    /*
      Moderation.

      Moderators are appointed by the host for the life of one stream — the role
      does not follow anyone to the next broadcast, which is why it lives here
      and not on the user. A moderator can act on viewers but not on another
      moderator; only the host outranks a moderator.
    */
    moderators: [
    {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    addedAt: { type: Date, default: Date.now }
    }
    ],

    /*
      Bans and chat mutes, kept as rows with an expiry rather than two arrays of
      user ids. A timed mute has to lapse on its own — a moderator muting someone
      for five minutes should not have to remember to come back and undo it — so
      `until` is read at enforcement time and a null `until` means indefinite.
      Rows are retained after being lifted (`liftedAt`) so the host can see what
      was done to whom instead of the record vanishing.
    */
    restrictions: [
    {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    type: { type: String, enum: ["ban", "mute"], required: true },
    until: { type: Date, default: null },
    reason: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    at: { type: Date, default: Date.now },
    liftedAt: { type: Date, default: null },
    liftedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }
    }
    ],

    /*
      Chat controls. Slow mode is seconds between messages from one person;
      followersOnly restricts chat to accounts that follow the host, which is the
      usual answer to a raid. `enabled: false` closes chat outright.
    */
    chatSettings: {
    enabled: { type: Boolean, default: true },
    slowModeSeconds: { type: Number, default: 0, min: 0, max: 300 },
    followersOnly: { type: Boolean, default: false }
    },

    // At most one pinned chat message; pinning a second replaces the first.
    pinnedMessage: { type: mongoose.Schema.Types.ObjectId, ref: "livechatmessage", default: null },

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
liveStreamSchema.index({ "restrictions.user": 1 });

const LiveStream = mongoose.model('livestreamtbl', liveStreamSchema);

export default LiveStream;
