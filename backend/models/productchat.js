import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });


const ProductChatSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Propertyads",
    required: true,
  },

  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  ],

  messages: [MessageSchema],

  lastMessage: String,
  lastMessageAt: Date,

}, { timestamps: true });

export default mongoose.model("ProductChat", ProductChatSchema);