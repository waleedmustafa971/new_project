// models/StoryStickerResponse.js

import mongoose from "mongoose";

/*
  One person's answer to one story sticker.

  Its own collection rather than an array on the story: a sticker on a popular
  story collects thousands of answers, and pushing each into the story document
  would grow it without bound and rewrite the whole thing on every tap.

  One row per (story, sticker, user), uniquely indexed. Answering again changes
  the existing row rather than adding a second — a poll where one person can
  vote twice is not a poll, and the index is what makes that true under a
  double-tap rather than merely intended.

  `optionIndex` carries a poll or quiz answer, `value` a slider position, and
  `text` a question's free-text reply. Which one is meaningful follows from the
  sticker's kind; storing all three separately keeps each in its natural type
  instead of stringifying numbers into one shared column.
*/

const storyStickerResponseSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: "Reels", required: true },
  sticker: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  kind: { type: String, enum: ["poll", "question", "quiz", "slider"], required: true },

  optionIndex: { type: Number, default: null },
  value: { type: Number, default: null },
  text: { type: String, default: "", maxlength: 300 },

  // Recorded at answer time so a later edit to the sticker cannot retroactively
  // make someone's answer wrong.
  correct: { type: Boolean, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

storyStickerResponseSchema.index({ story: 1, sticker: 1, user: 1 }, { unique: true });
storyStickerResponseSchema.index({ story: 1, sticker: 1 });

const StoryStickerResponse = mongoose.model("storystickerresponse", storyStickerResponseSchema);

export default StoryStickerResponse;
