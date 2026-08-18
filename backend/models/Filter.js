import mongoose from "mongoose";

/*
  Camera filter / beauty effect catalogue.

  The effect itself is applied on the device — the server cannot run a GPU
  shader on a live camera feed. What the backend owes is the catalogue the
  capture screen reads (which filters exist, their order, their thumbnails and
  default parameters) and a record of what was applied to a given post, so a
  post can be re-rendered, audited or reported with its treatment intact.
*/

export const FILTER_KINDS = ["filter", "beauty", "effect"];

const filterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  kind: { type: String, enum: FILTER_KINDS, default: "filter" },
  category: { type: String, default: "General" },

  thumbnail: { type: String },
  // Colour lookup table the client samples. Absent for a pure parameter preset.
  lutUrl: { type: String },

  /*
    Default parameters. Deliberately a loose object: a colour filter carries
    contrast/saturation/temperature, a beauty preset carries smooth/slim, and
    an AR effect carries whatever its own renderer needs. Validating a union of
    all three here would only get in the way of adding the next effect type.
  */
  params: { type: Object, default: {} },

  premium: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },

  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

filterSchema.index({ status: 1, kind: 1, order: 1 });
filterSchema.index({ usageCount: -1 });

const Filter = mongoose.model("filters", filterSchema);
export default Filter;
