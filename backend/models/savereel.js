import mongoose from "mongoose";

const saveSchema = new mongoose.Schema({
  reels: { type: mongoose.Schema.Types.ObjectId, ref: "Reels", required: true },
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  xtime: { type: Date, default: Date.now }
});

// Create Model
const saveReels = mongoose.model("saveReels", saveSchema);
export default saveReels;
