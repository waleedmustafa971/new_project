import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // Category name
    icon: { type: String }, // Category name
    image: { type: String },  // can be for any level
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null } // Reference to parent category
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
