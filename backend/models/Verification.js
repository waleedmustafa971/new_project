
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  image: { type: String, required: true },
}); // _id is automatically generated


/*
  Two kinds of request share this collection:

    kind: "business" - the original flow (company name + trade licence).
    kind: "social"   - blue-tick request for a creator / public figure, which
                       asks for a real name, category and an ID document instead.

  companyName / licenseNumber / telephone were unconditionally required before.
  They are now required only for business requests, so social applications can
  use the same collection and the same admin review queue. Existing business
  documents are unaffected.
*/
const isBusiness = function () { return this.kind === "business"; };

const verifySchema = new mongoose.Schema({
  userid: { type: String, required: true },

  kind: {
    type: String,
    enum: ["business", "social"],
    default: "business",
  },

  /* --- business (trade licence) --- */
  companyName: { type: String, required: isBusiness },
  licenseNumber: { type: String, required: isBusiness },
  telephone: { type: String, required: isBusiness },

  /* --- social (blue tick) --- */
  fullName: { type: String },     // legal name as it appears on the ID
  knownAs: { type: String },      // the name the public knows them by
  category: {
    type: String,
    enum: ["creator", "public_figure", "business", "news", "sports", "entertainment", "other"],
  },
  country: { type: String },
  // Links that prove notability: news coverage, other verified profiles, website
  referenceLinks: [{ type: String }],
  idDocumentType: {
    type: String,
    enum: ["passport", "national_id", "driving_licence", "trade_licence", "other"],
  },
  notes: { type: String },        // applicant's own supporting statement

  images: [ImageSchema],

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewNote: { type: String },   // admin's reason, shown back to the applicant
  reviewedAt: { type: Date },

  createdBy: { type: String },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

verifySchema.index({ userid: 1, kind: 1 });
verifySchema.index({ status: 1, createdAt: -1 });

const Verification = mongoose.model('Verification', verifySchema);

export default Verification;  // Default export
