import mongoose from "mongoose";

const sliderSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    image: [{ type: String }],  // ← MULTIPLE IMAGES
    title: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("ecommerceslider", sliderSchema);
