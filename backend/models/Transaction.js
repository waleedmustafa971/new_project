import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentType: { type: String, enum: ['googlepay', 'applepay', 'card'], required: true },
  currency: { type: String, required: true },
  amount: { type: Number, required: true }, // smallest currency unit, e.g. cents
  coins: { type: Number, required: true }, // smallest currency unit, e.g. cents
  date: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['pending', 'approved', 'failed'], default: 'approved' },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
