import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  designation: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  status: { type: Boolean, default: true },
  permissions: { type: Object },
  enteredby: { type: String },
  updateby: { type: String },

  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
