
import mongoose from 'mongoose';

/*
  Coin packages — the catalogue the app actually sells from.

  `groupname` and `thumbnail` are presentation only, added so the admin panel can
  label and illustrate a package. Nothing in the purchase path reads them: the
  price comes from priceAED and the currency from `currency`, which is passed
  straight to Stripe.
*/
const depositSchema = new mongoose.Schema({
    groupname: { type: String },
    thumbnail: { type: String },
    priceAED: { type: Number },
    coins: { type: Number, default: 0 },
    currency: { type: String },
    status: { type: String, enum: ['active', 'Inactive'], default: 'active' },
    xtime: { type: Date, default: Date.now },
});

const DepositStream = mongoose.model('depositscoins', depositSchema);

export default DepositStream;
