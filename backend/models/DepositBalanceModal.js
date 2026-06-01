
import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
    priceAED: { type: Number },
    coins: { type: Number, default: 0 },
    currency: { type: String },
    status: { type: String, enum: ['active', 'Inactive'], default: 'active' },
    xtime: { type: Date, default: Date.now },
});

const DepositStream = mongoose.model('depositscoins', depositSchema);

export default DepositStream;
