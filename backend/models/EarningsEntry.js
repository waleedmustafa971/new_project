// models/EarningsEntry.js

import mongoose from "mongoose";

/*
  The creator earnings ledger.

  Append-only, one row per earning event, and it is the source of truth for what
  a creator is owed. A running balance field on the user would be quicker to
  read and impossible to audit: when a payout is disputed, the answer has to be
  reconstructible from the events that produced it, not from a number somebody
  incremented.

  Every row records the split explicitly rather than storing gross and
  recomputing the fee at read time. The platform's cut can change; what a
  creator earned last March cannot.
*/

export const EARNING_TYPES = ["gift", "subscription", "adjustment"];

const earningsEntrySchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  type: { type: String, enum: EARNING_TYPES, required: true },

  // What the payer spent, what the platform kept, what the creator earned.
  // grossCoins = feeCoins + netCoins, always.
  grossCoins: { type: Number, required: true },
  feeCoins: { type: Number, required: true, default: 0 },
  netCoins: { type: Number, required: true },

  // The rate applied at the time, kept so an old row explains its own split.
  feeRate: { type: Number, default: 0 },

  from: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },

  /*
    What produced this row. `sourceId` is a bare ObjectId rather than a ref
    because it points into different collections depending on `type` — a gift
    transaction, a subscription — and mongoose cannot populate a polymorphic
    ref anyway.
  */
  sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  note: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
});

// The balance aggregation and the statement, which are the two hot reads.
earningsEntrySchema.index({ creator: 1, createdAt: -1 });
earningsEntrySchema.index({ creator: 1, type: 1 });

const EarningsEntry = mongoose.model("earningsentry", earningsEntrySchema);

export default EarningsEntry;
