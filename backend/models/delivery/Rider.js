import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: {type : String},
    email: { type: String, unique: true },
    password: { type: String, required: true },

    phone: { type: String, required: true },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // 🚴 Rider vehicle info
    vehicleType: {
      type: String,
      enum: ["bike", "car", "bicycle", "scooter"],
      default: "bike",
    },
    licenseNumber: String,
    // 📍 Current live location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // 💰 Earnings
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDeliveries: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 5,
    },

    // 🔐 Auth / device
    fcm_token: String,

    // 📦 optional
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      default: null,
    },
  },
  { timestamps: true }
);

// 📍 Important for geo queries (delivery apps need this)
RiderSchema.index({ location: "2dsphere" });

const Rider = mongoose.model("riders", RiderSchema);

export default Rider;