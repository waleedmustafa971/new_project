// models/VirtualItem.js

import mongoose from "mongoose";

/*
  Virtual goods bought with coins and kept, as opposed to gifts, which are
  bought and spent on someone else in the same motion.

  Gifts already live in the `gifts` collection and are consumed on send. These
  are owned: a profile frame, a badge, a chat effect. The distinction matters
  for the wallet — a gift leaves the buyer's balance and lands in a creator's
  earnings, while an item leaves the balance and lands in an inventory, earning
  nobody anything.
*/

export const ITEM_KINDS = ["frame", "badge", "effect", "theme"];

const virtualItemSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  kind: { type: String, enum: ITEM_KINDS, required: true },
  description: { type: String, default: "", maxlength: 300 },

  priceCoins: { type: Number, required: true, min: 0 },
  icon: { type: String, default: "" },
  asset: { type: String, default: "" },

  // Items can be retired from sale without disturbing anyone who owns one.
  active: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

virtualItemSchema.index({ kind: 1, active: 1 });

const VirtualItem = mongoose.model("virtualitem", virtualItemSchema);

export default VirtualItem;
