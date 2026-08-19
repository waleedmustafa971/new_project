// models/OwnedItem.js

import mongoose from "mongoose";

/*
  What a user owns, and what they are currently wearing.

  One row per (user, item) with a unique index: buying something twice should
  cost nothing the second time and must not produce a duplicate in the
  inventory. The buy endpoint checks ownership first, but the index is what
  makes that true under a double-tap.

  `equipped` is scoped per kind — one frame and one badge can be worn at once,
  two frames cannot. That rule lives in the controller, since it needs to unset
  the sibling of the same kind in the same operation.
*/

const ownedItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: "virtualitem", required: true },

  // Denormalised so "unequip whatever frame is on" does not need a lookup
  // through the catalogue first.
  kind: { type: String, required: true },

  equipped: { type: Boolean, default: false },

  coinsPaid: { type: Number, default: 0 },
  acquiredAt: { type: Date, default: Date.now },
});

ownedItemSchema.index({ user: 1, item: 1 }, { unique: true });
ownedItemSchema.index({ user: 1, kind: 1, equipped: 1 });

const OwnedItem = mongoose.model("owneditem", ownedItemSchema);

export default OwnedItem;
