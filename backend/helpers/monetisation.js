// helpers/monetisation.js

/*
  Shared money rules for the Monetisation section.

  Two things live here because more than one caller needs them and they must not
  drift: how a payment is split between the platform and the creator, and how
  coins move. Gifting, subscriptions and payouts all touch the same wallet, and
  three separate implementations of "take coins from A" is how a balance goes
  negative.
*/

import mongoose from "mongoose";

import User from "../models/users.js";
import EarningsEntry from "../models/EarningsEntry.js";
import Payout, { HOLDING_STATUSES } from "../models/Payout.js";

export const oid = (v) => new mongoose.Types.ObjectId(String(v));
export const sameId = (a, b) => String(a) === String(b);

/*
  The platform's cut. Env-overridable because it is a commercial decision, not a
  technical one, and it is recorded on every ledger row so changing it later
  does not rewrite what past earnings were worth.
*/
export const PLATFORM_FEE_RATE = (() => {
  const raw = Number(process.env.PLATFORM_FEE_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw < 1 ? raw : 0.3;
})();

/* Coins to currency when cashing out. */
export const PAYOUT_RATE = (() => {
  const raw = Number(process.env.PAYOUT_COIN_RATE);
  return Number.isFinite(raw) && raw > 0 ? raw : 0.01;
})();

export const MIN_PAYOUT_COINS = (() => {
  const raw = Number(process.env.MIN_PAYOUT_COINS);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 1000;
})();

/*
  Split a gross amount.

  The fee is rounded and the creator takes the remainder, rather than both being
  rounded independently — otherwise gross, fee and net stop adding up and the
  ledger's own invariant (gross = fee + net) fails on odd numbers.
*/
export const splitEarning = (grossCoins, rate = PLATFORM_FEE_RATE) => {
  const gross = Math.max(Math.round(Number(grossCoins) || 0), 0);
  const fee = Math.round(gross * rate);
  return { grossCoins: gross, feeCoins: fee, netCoins: gross - fee, feeRate: rate };
};

/* ------------------------------------------------------------------ */
/* the wallet                                                          */
/* ------------------------------------------------------------------ */

/*
  Take coins from a wallet.

  A conditional update, never read-then-write: matching on `coins: { $gte: n }`
  and decrementing in the same operation means two spends racing cannot both
  pass the balance check and overdraw. Returns false when the balance could not
  cover it, and nothing has moved.
*/
export const debitCoins = async (userId, amount) => {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return true;
  const r = await User.updateOne(
    { _id: oid(userId), coins: { $gte: n } },
    { $inc: { coins: -n } }
  );
  return r.matchedCount > 0;
};

export const creditCoins = async (userId, amount) => {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return;
  await User.updateOne({ _id: oid(userId) }, { $inc: { coins: n } });
};

/* ------------------------------------------------------------------ */
/* the ledger                                                          */
/* ------------------------------------------------------------------ */

/*
  Record what a creator earned, and pay the net into their wallet.

  Both halves belong together: an earnings row without the credit means a
  creator is owed coins they cannot see, and a credit without the row means a
  balance nobody can explain. Callers that already moved coins themselves pass
  `credit: false` — gifting does, because it pays the host as part of its own
  atomic debit.
*/
export const recordEarning = async ({
  creator, type, grossCoins, from = null, sourceId = null, note = "", credit = true,
}) => {
  const split = splitEarning(grossCoins);
  if (split.grossCoins <= 0) return null;

  const entry = await EarningsEntry.create({
    creator: oid(creator),
    type,
    ...split,
    from: from ? oid(from) : null,
    sourceId: sourceId ? oid(sourceId) : null,
    note,
  });

  if (credit) await creditCoins(creator, split.netCoins);
  return entry;
};

/*
  What a creator may actually withdraw.

  Lifetime earnings minus everything already committed to a payout. Reading the
  wallet balance instead would be wrong in both directions: it includes coins
  they bought with real money (not earnings, and cashing those out is a refund
  route, not a payout) and it excludes coins already held against a pending
  request.
*/
export const earningsSummary = async (creatorId) => {
  const [totals, held, paid] = await Promise.all([
    EarningsEntry.aggregate([
      { $match: { creator: oid(creatorId) } },
      { $group: { _id: "$type", net: { $sum: "$netCoins" }, gross: { $sum: "$grossCoins" }, fee: { $sum: "$feeCoins" }, n: { $sum: 1 } } },
    ]),
    Payout.aggregate([
      { $match: { creator: oid(creatorId), status: { $in: HOLDING_STATUSES } } },
      { $group: { _id: null, coins: { $sum: "$coins" } } },
    ]),
    Payout.aggregate([
      { $match: { creator: oid(creatorId), status: "paid" } },
      { $group: { _id: null, coins: { $sum: "$coins" } } },
    ]),
  ]);

  const byType = {};
  let lifetimeNet = 0, lifetimeGross = 0, lifetimeFee = 0;
  for (const row of totals) {
    byType[row._id] = { net: row.net, gross: row.gross, fee: row.fee, entries: row.n };
    lifetimeNet += row.net;
    lifetimeGross += row.gross;
    lifetimeFee += row.fee;
  }

  const heldCoins = held[0]?.coins || 0;
  return {
    lifetimeGross,
    lifetimeFee,
    lifetimeNet,
    byType,
    heldForPayout: heldCoins,
    paidOut: paid[0]?.coins || 0,
    available: Math.max(lifetimeNet - heldCoins, 0),
    feeRate: PLATFORM_FEE_RATE,
  };
};
