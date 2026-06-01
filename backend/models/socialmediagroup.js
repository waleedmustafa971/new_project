import mongoose from "mongoose";

const { Schema, model } = mongoose;

const groupSchema = new Schema({
 name: { type: String, required: true, trim: true },
  logo: { type: String }, // URL to S3/Cloudinary
  description: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const SocialgroupModal = model("socialgroup", groupSchema);
export default SocialgroupModal;

//socialmediagroupRoute
