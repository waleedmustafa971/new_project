import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  mobileno: { type: String, required: true },
  otp: { type: String, required: true },
  status: { type: String, default: "Not Verify" },
  datetime: { type: Date, default: Date.now, expires: 300 }, // ⏱ auto delete in 5 min
}, { timestamps: true });

export default mongoose.model("Otptbl", otpSchema);