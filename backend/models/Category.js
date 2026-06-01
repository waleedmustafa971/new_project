import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Category name
    icon: { type: String }, // Category name
    type: { type: String },
    image: { type: String },  // can be for any level
    selecttype: { type: String },  // this is for property only
    propertytype: { type: String },  // this is for property only
    url: { type: String }, 
     slug: { type: String }, 
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null } // Reference to parent category
  },
  { timestamps: true }
);
// ✅ ADD INDEX HERE (after schema, before export)
//categorySchema.index({ name: 1, parentId: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
