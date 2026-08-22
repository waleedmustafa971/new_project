import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
     clientMessageId: {
        type: String,
        required: true,
        unique: true
    },
    localSqliteId: {
        type: String
    },
    text: {
        type: String,
        default: ""
    },
    messagetype: {
        type: String
    },
  /*   imageUrl: {
        type: String,
        default: ""
    }, */
    imageUrl: {
        type: [String], // Array of strings
        default: []      // Default to an empty array
    },
    videoUrl: {
        type: String,
        default: ""
    },
    audioUrl: {
        type: String,
        default: ""
    },
    seen: {
        type: Boolean,
        default: false
    },
    msgByUserId: {
        type: mongoose.Schema.ObjectId,
        //required: true,
        ref: 'User'
    },
    deliveredTo: [String], // ✅ NEW for track offline and online
    seenBy: [String],      // ✅ NEW for track offline and online

    /* ================================================================
       Messaging module additions.

       replyTo / forwardedFrom / isForwarded were already being written by
       socket/messageHandler.js but were never declared here, so strict mode
       dropped them on every save — every reply and forward silently lost its
       link. Declaring them is the fix.
       ================================================================ */
    replyTo: { type: mongoose.Schema.ObjectId, ref: 'Message', default: null },
    forwardedFrom: { type: mongoose.Schema.ObjectId, ref: 'users', default: null },
    isForwarded: { type: Boolean, default: false },

    /*
      A reply sent from the story viewer.

      Story replies are ordinary direct messages -- same delivery, same privacy
      rules, same thread -- but arriving without any trace of what was being
      replied to, they read as a stray remark about nothing. `story` is the id
      so the bubble can open it while it is still live; `mediaUrl` is copied at
      send time so the thumbnail survives the story expiring, which it will in
      under a day.

      `default: undefined` keeps the key off every other message rather than
      writing a null onto all of them.
    */
    storyReply: {
        type: {
            story: { type: mongoose.Schema.ObjectId, ref: 'Reels' },
            mediaUrl: { type: String, default: '' },
        },
        default: undefined,
    },

    // Structured file sharing. imageUrl/videoUrl/audioUrl above stay for the
    // current screens; anything with a real filename lands here.
    attachments: {
        type: [{
            url: { type: String, required: true },
            name: { type: String },
            mime: { type: String },
            size: { type: Number },        // bytes
            kind: { type: String, enum: ['image', 'video', 'audio', 'document'], default: 'document' },
            thumbnail: { type: String },
            width: Number,
            height: Number,
            duration: Number,              // seconds, audio/video
            // Peak samples for a voice note, so the bubble can draw a waveform
            // without downloading and decoding the audio first.
            waveform: { type: [Number], default: undefined },
        }],
        default: []
    },

    // One emoji per person per message; a second tap replaces or clears it.
    reactions: {
        type: [{
            user: { type: mongoose.Schema.ObjectId, ref: 'users', required: true },
            emoji: { type: String, required: true },
            at: { type: Date, default: Date.now },
        }],
        default: []
    },

    sticker: {
        type: {
            pack: { type: mongoose.Schema.ObjectId, ref: 'stickerpacks' },
            stickerId: String,
            url: String,
            emoji: String,
            animated: { type: Boolean, default: false },
        },
        default: undefined
    },

    /* ---- edit / delete ---- */
    editedAt: { type: Date, default: null },
    editHistory: {
        type: [{ text: String, at: { type: Date, default: Date.now } }],
        default: []
    },
    // Deleted for everyone: the row survives as a tombstone so the thread and
    // any replies pointing at it stay intact.
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    // Deleted only for these users — everyone else still sees it.
    deletedFor: [{ type: mongoose.Schema.ObjectId, ref: 'users' }],

    /* ---- disappearing messages ---- */
    // Set from the conversation's TTL at send time. Filtered on read and swept
    // by the TTL index below.
    expiresAt: { type: Date, default: null },
    // View-once media: cleared for the viewer as soon as they open it.
    viewOnce: { type: Boolean, default: false },
    viewedBy: [{ type: mongoose.Schema.ObjectId, ref: 'users' }],

    /* ---- end-to-end encryption ---- */
    // When set, `text` holds ciphertext and the server cannot read it. The
    // envelope carries what each recipient device needs to decrypt.
    encrypted: { type: Boolean, default: false },
    encryption: {
        type: {
            algorithm: { type: String },     // e.g. "xchacha20-poly1305"
            iv: { type: String },            // base64 nonce
            senderKeyId: { type: String },   // which device key signed it
            // Per-recipient wrapped content keys: { deviceId: wrappedKey }
            keys: { type: Object },
        },
        default: undefined
    },

    // Voice-message playback state, separate from `seen` (a message can be
    // read without the audio having been played).
    playedBy: [{ type: mongoose.Schema.ObjectId, ref: 'users' }],

    // Set when this message records a call rather than carrying text.
    call: { type: mongoose.Schema.ObjectId, ref: 'callsessions', default: null },
}, {
    timestamps: true
});

/*
  Mongo removes a document once `expiresAt` passes. expireAfterSeconds: 0 means
  "at the time in the field", and a null value is simply never indexed, so
  ordinary messages are untouched.
*/
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ msgByUserId: 1, createdAt: -1 });
messageSchema.index({ 'attachments.kind': 1 });

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["private", "group"],
    default: "private"
  },
  group: {
    type: mongoose.Schema.ObjectId,
    ref: "GroupChat",
  },
    sender: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'users'
    },
    receiver: {
        type: mongoose.Schema.ObjectId,
      //  required: true,
        ref: 'users'
    },
    messages: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Message'
        }
    ],

    /* ---- Messaging module: per-conversation settings ---- */
    // Seconds after which a new message self-destructs. 0 or null is off.
    disappearingSeconds: { type: Number, default: null },
    disappearingSetBy: { type: mongoose.Schema.ObjectId, ref: 'users', default: null },
    disappearingSetAt: { type: Date, default: null },

    // Turned on once both sides have published a device key.
    encryptionEnabled: { type: Boolean, default: false },

    // Per-user mute and pin, so one side muting does not affect the other.
    mutedBy: [{ type: mongoose.Schema.ObjectId, ref: 'users' }],
    pinnedBy: [{ type: mongoose.Schema.ObjectId, ref: 'users' }],

    lastMessageAt: { type: Date, default: null },
}, {
    timestamps: true
});

conversationSchema.index({ sender: 1, receiver: 1 });
conversationSchema.index({ group: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const MessageModel = mongoose.model('Message', messageSchema);
const ConversationModel = mongoose.model('Conversation', conversationSchema);

export { MessageModel, ConversationModel };
