import mongoose from "mongoose";

/*
  Sticker / GIF catalogue for the chat composer.

  Stickers are stored as a pack of items rather than individual rows: the
  picker loads whole packs at a time, and a pack is the unit a user adds or
  removes. GIFs use the same shape with kind "gif", so one picker and one send
  path cover both.
*/

const stickerSchema = new mongoose.Schema({
  stickerId: { type: String, required: true },
  url: { type: String, required: true },
  // The emoji this sticker stands in for — drives emoji-based search.
  emoji: { type: String },
  keywords: { type: [String], default: [] },
  animated: { type: Boolean, default: false },
  width: Number,
  height: Number,
}, { _id: false });

const stickerPackSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  kind: { type: String, enum: ["sticker", "gif", "emoji"], default: "sticker" },
  author: { type: String },
  thumbnail: { type: String },
  stickers: { type: [stickerSchema], default: [] },

  premium: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

stickerPackSchema.index({ status: 1, kind: 1, order: 1 });
stickerPackSchema.index({ "stickers.keywords": 1 });

const StickerPack = mongoose.model("stickerpacks", stickerPackSchema);
export default StickerPack;
