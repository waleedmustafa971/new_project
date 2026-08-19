// models/CoinPurchase.js

import mongoose from "mongoose";

/*
  A coin purchase that has actually been paid for.

  Separate from the existing `Transaction` collection, which is written by the
  legacy /apis/live/add-transaction route. That route takes the amount and the
  payment status straight from the request body and credits the wallet, so it
  records what the client claimed rather than what was paid. This collection
  only ever holds purchases verified against Stripe.

  `paymentIntentId` is uniquely indexed, and that index is the idempotency
  guarantee: confirming the same intent twice — a retry, a double-tap, a
  reconnect replaying the request — inserts once and credits once.
*/

const coinPurchaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  // The package bought, from the `depositscoins` collection.
  package: { type: mongoose.Schema.Types.ObjectId, ref: "depositscoins" },

  paymentIntentId: { type: String, required: true, unique: true },

  coins: { type: Number, required: true, min: 0 },
  // Smallest currency unit, matching how Stripe reports it.
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "usd" },

  status: { type: String, enum: ["credited"], default: "credited" },
  createdAt: { type: Date, default: Date.now },
});

coinPurchaseSchema.index({ user: 1, createdAt: -1 });

const CoinPurchase = mongoose.model("coinpurchase", coinPurchaseSchema);

export default CoinPurchase;
