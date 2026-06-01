import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: "" },
  image: { type: String, default: "" }, // Image URL
  video: { type: String, default: "" }, // Video URL
  audio: { type: String, default: "" }, // Audio URL
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Message___", messageSchema);
