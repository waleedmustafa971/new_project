// models/Subscription.js

import mongoose from "mongoose";

/*
  One person's paid subscription to one creator.

  A subscription is a row per (subscriber, creator) that changes state, not a
  new row per renewal — otherwise "is this person subscribed?" becomes a scan
  over history, and renewing twice can leave two active rows charging in
  parallel. Renewals push `expiresAt` out and increment `renewals`; the payment
  history lives in the earnings ledger, which is where it belongs.

  Expiry is evaluated at read time rather than swept by a job: `status` says
  "active" until someone cancels, and `isLive()` also checks the clock. That
  way a lapsed subscription stops granting access the moment it lapses, with
  nothing needing to run on a schedule.
*/

const subscriptionSchema = new mongoose.Schema({
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  tier: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptiontier", required: true },

  // "cancelled" still runs to the end of the period already paid for; only the
  // clock passing `expiresAt` actually ends access.
  status: { type: String, enum: ["active", "cancelled", "expired"], default: "active" },

  priceCoins: { type: Number, required: true, min: 0 },

  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },

  autoRenew: { type: Boolean, default: false },
  renewals: { type: Number, default: 0 },
  lastRenewedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
});

/*
  One subscription row per pair. Without this a double-tapped subscribe button
  charges twice and leaves two rows, and cancelling only ends one of them.
*/
subscriptionSchema.index({ subscriber: 1, creator: 1 }, { unique: true });
subscriptionSchema.index({ creator: 1, status: 1 });
subscriptionSchema.index({ expiresAt: 1 });

const Subscription = mongoose.model("subscription", subscriptionSchema);

/* Access is status plus clock — a cancelled subscription still runs its term. */
export const subscriptionIsLive = (sub, now = new Date()) =>
  !!sub && sub.status !== "expired" && new Date(sub.expiresAt) > now;

export default Subscription;
