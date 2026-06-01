import mongoose from 'mongoose';

const giftStreamSchema = new mongoose.Schema({
  groupname: { type: String },
   name: { type: String, required: true, unique: true }, // 👈 unique
  icon: { type: String }, //String, // image or animation URL
  coinCost: { type: Number, default: 0 },
  xtime: { type: Date, default: Date.now }
});

const GiftStream = mongoose.model('gifts', giftStreamSchema);

export default GiftStream;
