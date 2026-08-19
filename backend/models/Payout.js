// models/Payout.js

import mongoose from "mongoose";

/*
  A creator cashing earnings out.

  Coins are held against the request the moment it is made, not when an admin
  approves it. The alternative — checking the balance at approval time — lets a
  creator request their whole balance several times over and have each request
  pass its own check, because nothing was ever reserved.

  A rejected request releases the hold; a paid one keeps it. Either way the row
  survives, because "why was this rejected?" is a question that gets asked.
*/

export const PAYOUT_STATUSES = ["requested", "approved", "paid", "rejected"];

const payoutSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  coins: { type: Number, required: true, min: 1 },
  // What those coins are worth, at the rate applied when the request was made.
  amount: { type: Number, required: true },
  currency: { type: String, default: "usd" },
  rate: { type: Number, required: true },

  status: { type: String, enum: PAYOUT_STATUSES, default: "requested" },

  method: { type: String, default: "bank" },
  // Free text — an IBAN, a PayPal address. Never a full card number.
  destination: { type: String, default: "" },

  requestedAt: { type: Date, default: Date.now },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  note: { type: String, default: "" },
  reference: { type: String, default: "" },
});

payoutSchema.index({ creator: 1, requestedAt: -1 });
payoutSchema.index({ status: 1, requestedAt: 1 });

const Payout = mongoose.model("payout", payoutSchema);

/* Requests that still have coins held against them. */
export const HOLDING_STATUSES = ["requested", "approved", "paid"];

export default Payout;
