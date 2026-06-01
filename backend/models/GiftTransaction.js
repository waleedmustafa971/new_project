import mongoose from 'mongoose';

const giftTransSchema = new mongoose.Schema({
  sender : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // MUST match model name
      required: true,
      },
  receiver : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // MUST match model name
      required: true,
      },
  gift : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "gifts", // MUST match model name
      required: true,
      },
  channelName : { type: String },
  coins : { type: Number, default: 0},
  createdAt : { type: Date, default: Date.now }
});

const GiftTransaction = mongoose.model('giftstransaction', giftTransSchema);

export default GiftTransaction;
