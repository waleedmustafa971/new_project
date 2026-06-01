import mongoose from "mongoose";

var commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

var postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String },
  mediaUrl: { type: String }, // Image or Video URL
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  stars: { type: Number, default: 0, min: 0, max: 5 }, // Star rating (0-5)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);
