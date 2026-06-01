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
}, {
    timestamps: true
});

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
    ]
}, {
    timestamps: true
});

const MessageModel = mongoose.model('Message', messageSchema);
const ConversationModel = mongoose.model('Conversation', conversationSchema);

export { MessageModel, ConversationModel };
