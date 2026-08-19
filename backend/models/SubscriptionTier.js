// models/SubscriptionTier.js

import mongoose from "mongoose";

/*
  A paid tier a creator offers.

  Priced in coins rather than currency, deliberately: coins are what the wallet
  holds and what gifting already spends, so a subscription can be paid for
  without a second payment rail and without every creator needing their own
  Stripe account. Real money enters once, at the coin purchase, and leaves once,
  at the payout.

  Tiers are soft-retired (`active: false`) rather than deleted, because existing
  subscribers still point at them and a deleted tier would leave live
  subscriptions referencing nothing.
*/

const subscriptionTierSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  name: { type: String, required: true, maxlength: 60 },
  description: { type: String, default: "", maxlength: 500 },

  // Per 30-day period.
  priceCoins: { type: Number, required: true, min: 1 },

  benefits: { type: [String], default: [] },

  active: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// A creator's own list, and the subscriber-facing browse.
subscriptionTierSchema.index({ creator: 1, active: 1 });
// One tier name per creator, so a list cannot show two identical-looking tiers.
subscriptionTierSchema.index({ creator: 1, name: 1 }, { unique: true });

const SubscriptionTier = mongoose.model("subscriptiontier", subscriptionTierSchema);

export default SubscriptionTier;
