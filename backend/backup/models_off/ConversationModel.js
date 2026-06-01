import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        default: ""
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
    }
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
