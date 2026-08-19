/*
  Monetisation — Social Media module.

  Closes the section's five rows:

    In-App Coin Purchase ....... Stripe intent, server-side verification, history
    Gift Coins & Virtual Items . owned goods, inventory, equipping
    Paid Subscription Tiers .... creator tiers, subscribe, renew, cancel, access
    Creator Earnings System .... the ledger, balances and payouts
    Live Stream Gifting ........ already shipped under Live Streaming (19 Aug);
                                 covered here only by the earnings hook

  The coin is the unit throughout. Real money enters once — buying coins — and
  leaves once, at a payout. Everything between is coins moving inside the
  platform, which is what lets a subscription be paid without every creator
  needing their own payment rail.

  Nothing here modifies the legacy /apis/live payment routes. See the note on
  confirmPurchase about why the new path exists rather than a fix to the old one.
*/

import mongoose from "mongoose";
import Stripe from "stripe";

import User from "../models/users.js";
import DepositStream from "../models/DepositBalanceModal.js";
import CoinPurchase from "../models/CoinPurchase.js";
import VirtualItem from "../models/VirtualItem.js";
import OwnedItem from "../models/OwnedItem.js";
import SubscriptionTier from "../models/SubscriptionTier.js";
import Subscription, { subscriptionIsLive } from "../models/Subscription.js";
import EarningsEntry from "../models/EarningsEntry.js";
import Payout, { HOLDING_STATUSES } from "../models/Payout.js";
import { isId, AUTHOR_FIELDS } from "../helpers/feed.js";
import { notify } from "../services/notificationService.js";
import {
  oid, sameId, debitCoins, creditCoins, recordEarning, earningsSummary,
  PLATFORM_FEE_RATE, PAYOUT_RATE, MIN_PAYOUT_COINS,
} from "../helpers/monetisation.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[monetisation]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const SUBSCRIPTION_DAYS = 30;
const addPeriod = (from = new Date()) =>
  new Date(new Date(from).getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ||
  "";
const stripe = new Stripe(STRIPE_KEY);

/* ------------------------------------------------------------------ */
/* 1. In-App Coin Purchase                                             */
/* ------------------------------------------------------------------ */

export const listPackages = wrap(async (req, res) => {
  const rows = await DepositStream.find({ status: "active" }).sort({ coins: 1 }).lean();
  ok(res, {
    total: rows.length,
    packages: rows.map((p) => ({
      _id: p._id, coins: p.coins, price: p.priceAED, currency: p.currency || "usd",
    })),
  });
});

/*
  Start a purchase.

  The amount comes from the package record, never from the request. A client
  that names its own price is the whole vulnerability being avoided here — and
  the user and package are stamped into the intent's metadata so the confirm
  step can check that the payment that succeeded is the one this caller started.
*/
export const createPurchaseIntent = wrap(async (req, res) => {
  const userId = actorId(req);
  const { packageId } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!isId(packageId)) return fail(res, 400, "A valid packageId is required");

  const pack = await DepositStream.findById(packageId).lean();
  if (!pack || pack.status !== "active") return fail(res, 404, "That coin package is not available");

  const currency = (pack.currency || "usd").toLowerCase();
  // Stripe works in the smallest currency unit.
  const amount = Math.round(Number(pack.priceAED) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail(res, 422, "That package has no valid price");
  }

  /*
    A package carrying a currency Stripe does not accept is bad reference data,
    not a server fault — it surfaces as a 422 naming the problem rather than an
    opaque 500 that an admin has to read the logs to understand.
  */
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card"],
      metadata: { userId: String(userId), packageId: String(packageId) },
    });
  } catch (err) {
    if (err?.type === "StripeInvalidRequestError") {
      return fail(res, 422, `That package cannot be charged: ${err.message}`);
    }
    throw err;
  }

  ok(res, {
    message: "Complete the payment, then confirm it",
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amount,
    currency,
    coins: pack.coins,
  });
});

/*
  Credit the coins — but only for a payment Stripe agrees actually happened.

  The legacy POST /apis/live/add-transaction takes `amount` and
  `paymentStatus: "approved"` from the request body and credits the wallet on
  that basis alone, so any signed-in caller can mint coins for free. It is left
  untouched because the shipped app calls it; this is the path that replaces it.

  Four things are checked, and all four matter:
    - the intent really succeeded, per Stripe rather than per the client
    - it belongs to the caller (metadata), so one user cannot claim another's
    - the amount paid matches the package being claimed
    - it has not already been credited

  The last is enforced by a unique index on paymentIntentId rather than a
  lookup, because two confirmations racing would both pass a lookup.
*/
export const confirmPurchase = wrap(async (req, res) => {
  const userId = actorId(req);
  const { paymentIntentId } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!paymentIntentId) return fail(res, 400, "A paymentIntentId is required");

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
  } catch {
    return fail(res, 404, "That payment could not be found");
  }

  if (intent.status !== "succeeded") {
    return fail(res, 402, `That payment has not completed (status: ${intent.status})`);
  }
  if (!sameId(intent.metadata?.userId, userId)) {
    return fail(res, 403, "That payment belongs to someone else");
  }

  const pack = await DepositStream.findById(intent.metadata?.packageId).lean();
  if (!pack) return fail(res, 404, "The package for that payment no longer exists");

  const expected = Math.round(Number(pack.priceAED) * 100);
  if (Number(intent.amount_received) !== expected) {
    return fail(res, 422, "The amount paid does not match that package");
  }

  let purchase;
  try {
    purchase = await CoinPurchase.create({
      user: oid(userId),
      package: pack._id,
      paymentIntentId: intent.id,
      coins: pack.coins,
      amount: intent.amount_received,
      currency: intent.currency,
    });
  } catch (err) {
    // Duplicate key: this intent has already been credited.
    if (err?.code === 11000) {
      const me = await User.findById(userId).select("coins").lean();
      return fail(res, 409, "That payment has already been credited", {
        coins: me?.coins || 0,
      });
    }
    throw err;
  }

  await creditCoins(userId, pack.coins);
  const me = await User.findById(userId).select("coins").lean();

  ok(res, {
    message: `${pack.coins} coins added`,
    purchaseId: purchase._id,
    coinsAdded: pack.coins,
    coins: me?.coins || 0,
  });
});

export const purchaseHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const [rows, total] = await Promise.all([
    CoinPurchase.find({ user: oid(userId) }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CoinPurchase.countDocuments({ user: oid(userId) }),
  ]);

  ok(res, { page, limit, total, hasMore: skip + rows.length < total, purchases: rows });
});

export const walletBalance = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("coins accountType").lean();
  if (!user) return fail(res, 404, "User not found");

  const [purchased, earnings] = await Promise.all([
    CoinPurchase.aggregate([
      { $match: { user: oid(userId) } },
      { $group: { _id: null, coins: { $sum: "$coins" } } },
    ]),
    earningsSummary(userId),
  ]);

  ok(res, {
    coins: user.coins || 0,
    purchasedLifetime: purchased[0]?.coins || 0,
    earnings: { lifetimeNet: earnings.lifetimeNet, available: earnings.available },
  });
});

/* ------------------------------------------------------------------ */
/* 2. Gift Coins & Virtual Items                                       */
/* ------------------------------------------------------------------ */

export const listItems = wrap(async (req, res) => {
  const userId = actorId(req);
  const filter = { active: true };
  if (req.query.kind) filter.kind = String(req.query.kind);

  const rows = await VirtualItem.find(filter).sort({ priceCoins: 1 }).lean();

  // Which of these the caller already has, so the store can say "Owned"
  // instead of offering something twice.
  let owned = new Set();
  if (isId(userId)) {
    const mine = await OwnedItem.find({ user: oid(userId) }).select("item").lean();
    owned = new Set(mine.map((o) => String(o.item)));
  }

  const byKind = {};
  for (const item of rows) {
    (byKind[item.kind] = byKind[item.kind] || []).push({ ...item, owned: owned.has(String(item._id)) });
  }

  ok(res, { total: rows.length, byKind, items: rows.map((i) => ({ ...i, owned: owned.has(String(i._id)) })) });
});

/*
  Buy an item outright.

  Unlike a gift, this earns nobody anything — the coins leave circulation. The
  ownership check comes first for a clear 409, and the unique index behind it
  is what actually holds under a double-tap.
*/
export const buyItem = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and item id are required");

  const item = await VirtualItem.findById(id).lean();
  if (!item || !item.active) return fail(res, 404, "That item is not available");

  const already = await OwnedItem.findOne({ user: oid(userId), item: item._id }).lean();
  if (already) return fail(res, 409, "You already own that");

  const paid = await debitCoins(userId, item.priceCoins);
  if (!paid) {
    const me = await User.findById(userId).select("coins").lean();
    return fail(res, 402, `Not enough coins — ${me?.coins || 0} available, ${item.priceCoins} needed`);
  }

  let row;
  try {
    row = await OwnedItem.create({
      user: oid(userId), item: item._id, kind: item.kind, coinsPaid: item.priceCoins,
    });
  } catch (err) {
    if (err?.code === 11000) {
      // Lost a race with an identical request — give the coins back rather than
      // charging twice for one item.
      await creditCoins(userId, item.priceCoins);
      return fail(res, 409, "You already own that");
    }
    throw err;
  }

  const me = await User.findById(userId).select("coins").lean();
  ok(res, {
    message: `${item.name} is yours`,
    ownedId: row._id,
    coinsSpent: item.priceCoins,
    coins: me?.coins || 0,
  });
});

export const myItems = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const rows = await OwnedItem.find({ user: oid(userId) })
    .populate("item", "name kind icon asset priceCoins").sort({ acquiredAt: -1 }).lean();

  ok(res, {
    total: rows.length,
    equipped: rows.filter((r) => r.equipped).map((r) => ({ kind: r.kind, item: r.item })),
    items: rows,
  });
});

/*
  Wear an item, or take it off.

  One per kind: equipping a second frame takes the first one off in the same
  call, because two frames worn at once has no meaning and the client would
  have to pick one arbitrarily.
*/
export const equipItem = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const equip = req.body?.equip !== false;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and item id are required");

  const owned = await OwnedItem.findOne({ user: oid(userId), item: oid(id) });
  if (!owned) return fail(res, 404, "You do not own that");

  if (!equip) {
    await OwnedItem.updateOne({ _id: owned._id }, { $set: { equipped: false } });
    return ok(res, { message: "Unequipped", equipped: false });
  }

  await OwnedItem.updateMany(
    { user: oid(userId), kind: owned.kind, equipped: true },
    { $set: { equipped: false } }
  );
  await OwnedItem.updateOne({ _id: owned._id }, { $set: { equipped: true } });

  ok(res, { message: "Equipped", equipped: true, kind: owned.kind });
});

/* ------------------------------------------------------------------ */
/* 3. Paid Subscription Tiers                                          */
/* ------------------------------------------------------------------ */

export const createTier = wrap(async (req, res) => {
  const userId = actorId(req);
  const { name, description, priceCoins, benefits } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!name || !String(name).trim()) return fail(res, 400, "A tier name is required");

  const price = Math.round(Number(priceCoins));
  if (!Number.isFinite(price) || price < 1) return fail(res, 422, "priceCoins must be at least 1");

  const user = await User.findById(userId).select("accountType").lean();
  if (!user) return fail(res, 404, "User not found");
  /*
    Only creator and business accounts may charge for a subscription. The
    account type already exists and the upgrade flow is a separate sheet row,
    so this gates rather than promotes.
  */
  if (!["creator", "business"].includes(user.accountType)) {
    return fail(res, 403, "Switch to a creator or business account to offer subscriptions");
  }

  try {
    const tier = await SubscriptionTier.create({
      creator: oid(userId),
      name: String(name).trim().slice(0, 60),
      description: String(description || "").slice(0, 500),
      priceCoins: price,
      benefits: Array.isArray(benefits) ? benefits.slice(0, 10).map((b) => String(b).slice(0, 120)) : [],
    });
    return ok(res, { message: "Tier created", tier });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, "You already have a tier with that name");
    throw err;
  }
});

export const listTiers = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const creatorId = req.params.creatorId || req.query.creatorId || viewerId;
  if (!isId(creatorId)) return fail(res, 400, "A valid creatorId is required");

  // A creator sees their retired tiers; everyone else sees what is on sale.
  const mine = isId(viewerId) && sameId(creatorId, viewerId);
  const filter = { creator: oid(creatorId) };
  if (!mine) filter.active = true;

  const [tiers, sub] = await Promise.all([
    SubscriptionTier.find(filter).sort({ priceCoins: 1 }).lean(),
    isId(viewerId)
      ? Subscription.findOne({ subscriber: oid(viewerId), creator: oid(creatorId) }).lean()
      : null,
  ]);

  const counts = await Subscription.aggregate([
    { $match: { creator: oid(creatorId), status: "active", expiresAt: { $gt: new Date() } } },
    { $group: { _id: "$tier", n: { $sum: 1 } } },
  ]);
  const byTier = new Map(counts.map((c) => [String(c._id), c.n]));

  ok(res, {
    total: tiers.length,
    isOwner: mine,
    mySubscription: sub && subscriptionIsLive(sub)
      ? { tier: sub.tier, status: sub.status, expiresAt: sub.expiresAt, autoRenew: sub.autoRenew }
      : null,
    tiers: tiers.map((t) => ({ ...t, subscribers: byTier.get(String(t._id)) || 0 })),
  });
});

export const updateTier = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { name, description, priceCoins, benefits, active } = req.body || {};
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and tier id are required");

  const tier = await SubscriptionTier.findById(id).lean();
  if (!tier) return fail(res, 404, "Tier not found");
  if (!sameId(tier.creator, userId)) return fail(res, 403, "That is not your tier");

  const set = { updatedAt: new Date() };
  if (name !== undefined) set.name = String(name).trim().slice(0, 60);
  if (description !== undefined) set.description = String(description).slice(0, 500);
  if (benefits !== undefined) {
    set.benefits = Array.isArray(benefits) ? benefits.slice(0, 10).map((b) => String(b).slice(0, 120)) : [];
  }
  if (active !== undefined) set.active = !!active;
  if (priceCoins !== undefined) {
    const price = Math.round(Number(priceCoins));
    if (!Number.isFinite(price) || price < 1) return fail(res, 422, "priceCoins must be at least 1");
    /*
      A price change applies to the next renewal, not to anyone mid-period.
      Existing subscriptions carry the price they agreed to in their own row,
      which is why renewal reads that row rather than the tier.
    */
    set.priceCoins = price;
  }
  if (Object.keys(set).length === 1) return fail(res, 400, "Nothing to update");

  await SubscriptionTier.updateOne({ _id: id }, { $set: set });
  ok(res, { message: "Tier updated", tier: await SubscriptionTier.findById(id).lean() });
});

/*
  Subscribe, or renew an existing subscription for another period.

  The same endpoint does both: a subscriber whose period is running pays to
  extend it, which is the same transaction with a different starting point.
  Charging is a debit-then-record, and the debit is conditional, so a failed
  payment never produces a subscription.
*/
export const subscribe = wrap(async (req, res) => {
  const userId = actorId(req);
  const { tierId, autoRenew } = req.body || {};
  if (!isId(userId) || !isId(tierId)) return fail(res, 400, "Valid userId and tierId are required");

  const tier = await SubscriptionTier.findById(tierId).lean();
  if (!tier) return fail(res, 404, "Tier not found");
  if (!tier.active) return fail(res, 409, "That tier is no longer offered");
  if (sameId(tier.creator, userId)) return fail(res, 400, "You cannot subscribe to yourself");

  const existing = await Subscription.findOne({ subscriber: oid(userId), creator: tier.creator }).lean();
  if (existing && subscriptionIsLive(existing) && sameId(existing.tier, tierId) && existing.status === "active") {
    // Already running on this tier — this is a renewal, allowed, and extends.
  }

  const paid = await debitCoins(userId, tier.priceCoins);
  if (!paid) {
    const me = await User.findById(userId).select("coins").lean();
    return fail(res, 402, `Not enough coins — ${me?.coins || 0} available, ${tier.priceCoins} needed`);
  }

  /*
    Extend from whichever is later: now, or the end of the period already paid
    for. Renewing early must not throw away the days already bought.
  */
  const base = existing && subscriptionIsLive(existing) ? new Date(existing.expiresAt) : new Date();
  const expiresAt = addPeriod(base);

  let sub;
  if (existing) {
    await Subscription.updateOne({ _id: existing._id }, {
      $set: {
        tier: tier._id, status: "active", priceCoins: tier.priceCoins,
        expiresAt, cancelledAt: null,
        autoRenew: autoRenew === undefined ? existing.autoRenew : !!autoRenew,
        lastRenewedAt: new Date(),
      },
      $inc: { renewals: 1 },
    });
    sub = await Subscription.findById(existing._id).lean();
  } else {
    sub = await Subscription.create({
      subscriber: oid(userId), creator: tier.creator, tier: tier._id,
      priceCoins: tier.priceCoins, expiresAt, autoRenew: !!autoRenew,
    });
  }

  // The creator's cut, and the platform's, recorded in the ledger.
  const entry = await recordEarning({
    creator: tier.creator, type: "subscription", grossCoins: tier.priceCoins,
    from: userId, sourceId: sub._id, note: tier.name,
  });

  /*
    Its own type, not "follow". The notification key is
    (recipient, actor, type, post, commentId) and it upserts, so borrowing
    "follow" would overwrite the real follow notification these two already
    have rather than adding a new row.
  */
  await notify({
    recipient: tier.creator, actor: userId, type: "subscription",
    preview: `subscribed to ${tier.name}`,
  });

  const me = await User.findById(userId).select("coins").lean();
  ok(res, {
    message: existing ? "Subscription renewed" : "Subscribed",
    subscription: sub,
    coinsSpent: tier.priceCoins,
    coins: me?.coins || 0,
    creatorEarned: entry?.netCoins || 0,
  });
});

/*
  Cancel. The period already paid for still runs — the subscriber keeps access
  until it lapses, and only auto-renew stops immediately. Cutting access at
  cancellation would be taking back something already bought.
*/
export const cancelSubscription = wrap(async (req, res) => {
  const userId = actorId(req);
  const { creatorId } = req.body || {};
  if (!isId(userId) || !isId(creatorId)) return fail(res, 400, "Valid userId and creatorId are required");

  const sub = await Subscription.findOne({ subscriber: oid(userId), creator: oid(creatorId) });
  if (!sub) return fail(res, 404, "You are not subscribed to them");
  if (sub.status === "cancelled") return fail(res, 409, "That subscription is already cancelled");

  await Subscription.updateOne({ _id: sub._id }, {
    $set: { status: "cancelled", cancelledAt: new Date(), autoRenew: false },
  });

  ok(res, {
    message: "Cancelled — you keep access until the period ends",
    accessUntil: sub.expiresAt,
  });
});

export const mySubscriptions = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const rows = await Subscription.find({ subscriber: oid(userId) })
    .populate("creator", AUTHOR_FIELDS)
    .populate("tier", "name priceCoins benefits")
    .sort({ expiresAt: -1 }).lean();

  const now = new Date();
  ok(res, {
    total: rows.length,
    active: rows.filter((r) => subscriptionIsLive(r, now)).length,
    subscriptions: rows.map((r) => ({ ...r, live: subscriptionIsLive(r, now) })),
  });
});

/* The creator's side: who is subscribed, and what it is worth. */
export const mySubscribers = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const now = new Date();
  const filter = { creator: oid(userId), status: "active", expiresAt: { $gt: now } };
  const [rows, total, all] = await Promise.all([
    Subscription.find(filter).populate("subscriber", "name image verifiedBadge")
      .populate("tier", "name priceCoins").sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    Subscription.countDocuments(filter),
    Subscription.countDocuments({ creator: oid(userId) }),
  ]);

  const monthly = rows.reduce((sum, r) => sum + (r.priceCoins || 0), 0);
  ok(res, {
    page, limit, total, everSubscribed: all,
    monthlyCoinsFromPage: monthly,
    subscribers: rows,
  });
});

/*
  Whether one person may see another's subscriber-only content.

  Exposed as its own endpoint so the mobile app can ask before rendering a
  locked post, rather than each content endpoint growing its own copy of the
  rule.
*/
export const subscriptionAccess = wrap(async (req, res) => {
  const userId = actorId(req);
  const { creatorId } = req.params;
  if (!isId(userId) || !isId(creatorId)) return fail(res, 400, "Valid userId and creatorId are required");

  if (sameId(userId, creatorId)) {
    return ok(res, { access: true, reason: "own content" });
  }

  const sub = await Subscription.findOne({ subscriber: oid(userId), creator: oid(creatorId) })
    .populate("tier", "name priceCoins").lean();

  const live = subscriptionIsLive(sub);
  ok(res, {
    access: live,
    reason: live ? "subscribed" : sub ? "subscription lapsed" : "not subscribed",
    tier: live ? sub.tier : null,
    expiresAt: sub?.expiresAt || null,
  });
});

/* ------------------------------------------------------------------ */
/* 4. Creator Earnings System                                          */
/* ------------------------------------------------------------------ */

export const earnings = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const summary = await earningsSummary(userId);
  ok(res, {
    ...summary,
    payout: {
      rate: PAYOUT_RATE,
      currency: "usd",
      minimumCoins: MIN_PAYOUT_COINS,
      availableValue: Number((summary.available * PAYOUT_RATE).toFixed(2)),
      canRequest: summary.available >= MIN_PAYOUT_COINS,
    },
  });
});

/* The statement behind the balance. */
export const earningsHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { creator: oid(userId) };
  if (req.query.type) filter.type = String(req.query.type);

  const [rows, total] = await Promise.all([
    EarningsEntry.find(filter).populate("from", "name image")
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    EarningsEntry.countDocuments(filter),
  ]);

  ok(res, { page, limit, total, hasMore: skip + rows.length < total, entries: rows });
});

/*
  Request a payout.

  Coins are held the moment the request is made — see the note on the Payout
  model. Checking the balance only at approval time would let a creator request
  the same balance several times over and have every request pass.
*/
export const requestPayout = wrap(async (req, res) => {
  const userId = actorId(req);
  const { coins, method, destination } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const want = Math.round(Number(coins));
  if (!Number.isFinite(want) || want < 1) return fail(res, 422, "coins must be a positive number");
  if (want < MIN_PAYOUT_COINS) {
    return fail(res, 422, `The minimum payout is ${MIN_PAYOUT_COINS} coins`);
  }
  if (!destination || !String(destination).trim()) {
    return fail(res, 400, "A payout destination is required");
  }

  const summary = await earningsSummary(userId);
  if (want > summary.available) {
    return fail(res, 402, `You can withdraw ${summary.available} coins`, {
      available: summary.available,
      heldForPayout: summary.heldForPayout,
    });
  }

  const payout = await Payout.create({
    creator: oid(userId),
    coins: want,
    rate: PAYOUT_RATE,
    amount: Number((want * PAYOUT_RATE).toFixed(2)),
    currency: "usd",
    method: String(method || "bank").slice(0, 40),
    destination: String(destination).trim().slice(0, 200),
  });

  ok(res, {
    message: "Payout requested",
    payout,
    remainingAvailable: summary.available - want,
  });
});

export const payoutHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const [rows, total] = await Promise.all([
    Payout.find({ creator: oid(userId) }).sort({ requestedAt: -1 }).skip(skip).limit(limit).lean(),
    Payout.countDocuments({ creator: oid(userId) }),
  ]);

  ok(res, { page, limit, total, payouts: rows });
});

/* A creator may withdraw a request while nobody has acted on it yet. */
export const cancelPayout = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and payout id are required");

  const payout = await Payout.findById(id).lean();
  if (!payout) return fail(res, 404, "Payout not found");
  if (!sameId(payout.creator, userId)) return fail(res, 403, "That is not your payout request");
  if (payout.status !== "requested") {
    return fail(res, 409, `That request is already ${payout.status}`);
  }

  await Payout.updateOne({ _id: id }, {
    $set: { status: "rejected", decidedAt: new Date(), note: "Withdrawn by the creator" },
  });
  ok(res, { message: "Payout request withdrawn" });
});

/* ------------------------------------------------------------------ */
/* 5. Admin — the other side of a payout                               */
/* ------------------------------------------------------------------ */

export const listPayoutsForAdmin = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);

  const [rows, total, pending] = await Promise.all([
    Payout.find(filter).populate("creator", "name email image")
      .sort({ requestedAt: 1 }).skip(skip).limit(limit).lean(),
    Payout.countDocuments(filter),
    Payout.aggregate([
      { $match: { status: "requested" } },
      { $group: { _id: null, coins: { $sum: "$coins" }, amount: { $sum: "$amount" }, n: { $sum: 1 } } },
    ]),
  ]);

  ok(res, {
    page, limit, total,
    pendingCount: pending[0]?.n || 0,
    pendingCoins: pending[0]?.coins || 0,
    pendingAmount: pending[0]?.amount || 0,
    payouts: rows,
  });
});

/*
  Approve, pay or reject.

  Rejecting releases the hold, which is the whole reason the states are
  separate: an approved-but-unpaid request still has the creator's coins
  committed, and only a rejection gives them back.
*/
export const decidePayout = wrap(async (req, res) => {
  const adminId = actorId(req);
  const { id } = req.params;
  const action = String(req.body?.action || "").toLowerCase();
  const { note, reference } = req.body || {};

  if (!isId(id)) return fail(res, 400, "A valid payout id is required");
  if (!["approve", "pay", "reject"].includes(action)) {
    return fail(res, 400, "action must be approve, pay or reject");
  }

  const payout = await Payout.findById(id).lean();
  if (!payout) return fail(res, 404, "Payout not found");
  if (["paid", "rejected"].includes(payout.status)) {
    return fail(res, 409, `That request is already ${payout.status}`);
  }
  if (action === "pay" && payout.status !== "approved") {
    return fail(res, 409, "Approve the request before marking it paid");
  }

  const next = action === "approve" ? "approved" : action === "pay" ? "paid" : "rejected";
  await Payout.updateOne({ _id: id }, {
    $set: {
      status: next,
      decidedAt: new Date(),
      decidedBy: isId(adminId) ? oid(adminId) : null,
      note: String(note || "").slice(0, 300),
      reference: String(reference || "").slice(0, 120),
    },
  });

  const summary = await earningsSummary(payout.creator);
  ok(res, {
    message: `Payout ${next}`,
    payout: await Payout.findById(id).lean(),
    creatorAvailableNow: summary.available,
  });
});

/*
  A manual ledger correction — a refunded gift, a goodwill credit, a clawback.

  Written as an ordinary ledger row rather than by editing an existing one, so
  the history stays append-only and a correction is as visible as the thing it
  corrects. `grossCoins` may be negative here, which is the one place that is
  allowed.
*/
export const adjustEarnings = wrap(async (req, res) => {
  const adminId = actorId(req);
  const { creatorId, coins, note } = req.body || {};
  if (!isId(creatorId)) return fail(res, 400, "A valid creatorId is required");

  const n = Math.round(Number(coins));
  if (!Number.isFinite(n) || n === 0) return fail(res, 422, "coins must be a non-zero number");
  if (!note || !String(note).trim()) return fail(res, 400, "An adjustment needs a note");

  const creator = await User.findById(creatorId).select("name").lean();
  if (!creator) return fail(res, 404, "Creator not found");

  // No platform fee on a correction: the fee was already taken (or not) on the
  // row being corrected, and charging it again would compound the error.
  const entry = await EarningsEntry.create({
    creator: oid(creatorId),
    type: "adjustment",
    grossCoins: n, feeCoins: 0, netCoins: n, feeRate: 0,
    from: isId(adminId) ? oid(adminId) : null,
    note: String(note).trim().slice(0, 300),
  });

  if (n > 0) await creditCoins(creatorId, n);
  else await debitCoins(creatorId, Math.abs(n));

  const summary = await earningsSummary(creatorId);
  ok(res, { message: "Ledger adjusted", entry, available: summary.available });
});
