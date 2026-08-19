// models/AdCampaign.js

import mongoose from "mongoose";

/*
  Paid distribution — both a one-tap post boost and a full ad campaign.

  One collection rather than two, because they are the same object with
  different amounts of ceremony: something to show, a budget, a schedule, some
  targeting, and a spend that has to stop when the budget runs out. Splitting
  them means writing the budget-exhaustion logic twice and having it drift.

  `kind` is what differs: a "boost" points at an existing post and takes its
  creative from it; an "ad" carries its own. Everything below applies to both.

  Budgets are in coins, like the rest of the platform. Real money entered when
  the coins were bought, so an advertiser spends the same currency a viewer
  gifts with and no second payment rail is needed.
*/

export const CAMPAIGN_KINDS = ["boost", "ad"];

/*
  Status is a lifecycle, not a flag.

    draft     → advertiser is still editing; nothing reserved
    pending   → submitted, waiting on review; coins already held
    active    → running and spending
    paused    → advertiser stopped it; remaining budget still held
    completed → budget exhausted or the end date passed
    rejected  → review refused it; the hold is released
    cancelled → advertiser withdrew it; the unspent hold is released
*/
export const CAMPAIGN_STATUSES = [
  "draft", "pending", "active", "paused", "completed", "rejected", "cancelled",
];

const targetingSchema = new mongoose.Schema({
  interests: { type: [String], default: [] },
  cities: { type: [String], default: [] },
  countries: { type: [String], default: [] },
  minAge: { type: Number, default: null },
  maxAge: { type: Number, default: null },
}, { _id: false });

const adCampaignSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  kind: { type: String, enum: CAMPAIGN_KINDS, required: true },
  name: { type: String, default: "", maxlength: 120 },

  // Boosts point at a post; ads carry their own creative.
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Reels", default: null },
  creative: {
    headline: { type: String, default: "", maxlength: 120 },
    body: { type: String, default: "", maxlength: 400 },
    image: { type: String, default: "" },
    linkUrl: { type: String, default: "" },
    callToAction: { type: String, default: "Learn more", maxlength: 40 },
  },

  /*
    The whole budget is debited from the advertiser's wallet when the campaign
    is submitted, not drawn down as it spends. Charging per impression would
    mean a campaign can overdraw between two impressions arriving together;
    holding the budget up front makes running out a bookkeeping fact rather
    than a race. Whatever is unspent is refunded when it stops.
  */
  budgetCoins: { type: Number, required: true, min: 1 },
  spentCoins: { type: Number, default: 0, min: 0 },
  refundedCoins: { type: Number, default: 0, min: 0 },

  // What one impression costs. Fixed per campaign so a rate change cannot
  // retroactively alter what an already-running campaign was promised.
  costPerImpression: { type: Number, default: 1, min: 0 },

  status: { type: String, enum: CAMPAIGN_STATUSES, default: "draft" },

  targeting: { type: targetingSchema, default: () => ({}) },

  startAt: { type: Date, default: Date.now },
  endAt: { type: Date, default: null },

  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
  },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

adCampaignSchema.index({ advertiser: 1, createdAt: -1 });
adCampaignSchema.index({ status: 1, startAt: 1 });
adCampaignSchema.index({ post: 1, status: 1 });

/* Whether a campaign should be serving right now. */
export const campaignIsLive = (c, now = new Date()) =>
  !!c && c.status === "active" &&
  c.spentCoins < c.budgetCoins &&
  new Date(c.startAt) <= now &&
  (!c.endAt || new Date(c.endAt) > now);

// Statuses where the advertiser's coins are still committed to the campaign.
export const HOLDING_STATUSES = ["pending", "active", "paused", "completed"];

const AdCampaign = mongoose.model("adcampaign", adCampaignSchema);

export default AdCampaign;
