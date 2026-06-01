import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  comment: String,
  rating: Number,
  createdAt: { type: Date, default: Date.now },
});

const vendorSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    logo: { type: String },
    addresses: [addressSchema],
    mobileno: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    url: { type: String },
    fcmid: { type: String },
    location: {
      mapLocation: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    balance: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["approved", "pending", "suspended"],
      default: "pending",
    },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

// Hash password before save if modified
vendorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Allow comparing password
vendorSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Vendor", vendorSchema);
