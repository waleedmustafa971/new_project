import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  /*
    The users model is registered as 'users' (models/users.js), not 'User'. With
    the wrong name any .populate("userId") throws "Schema hasn't been registered
    for model User" — which stayed hidden only because this collection was empty,
    so populate never had a document to resolve.
  */
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  paymentType: { type: String, enum: ['googlepay', 'applepay', 'card'], required: true },
  currency: { type: String, required: true },
  amount: { type: Number, required: true }, // smallest currency unit, e.g. cents
  coins: { type: Number, required: true }, // smallest currency unit, e.g. cents
  date: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['pending', 'approved', 'failed'], default: 'approved' },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
