import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema(
  {
    // 💰 delivery fee per KM
    perkilometer: { 
      type: Number, 
      required: true 
    },
    // ✅ status (fixed)
    status: {
      type: Number,
      enum: [0, 1], // 0 = inactive, 1 = active
      default: 1,
    },

    // 🚴 Rider service type
    type: {
      type: String,
      enum: ["shopping", "food"],
      default: "shopping",
    }
  },
  { timestamps: true }
);

// ✅ better model name
const RiderDeliveryFees = mongoose.model("RiderDeliveryFees", RiderSchema);

export default RiderDeliveryFees;