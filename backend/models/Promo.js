import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
 promo_code: { type: String, unique: true },
  message: { type: String, default: '' },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  no_of_users: { type: Number, default: 0 },
  minimum_order_amount: { type: Number, default: 0 },
  discount: { type: Number, required: true },
  discount_type: { type: String, enum: ['percentage', 'amount'], required: true },
  max_discount_amount: { type: Number }, // optional, relevant when discount_type === 'percentage'
  repeat_usage: { type: Boolean, default: false },
  no_of_repeat_usage: { type: Number, default: 0 },
  image: { type: String, default: '' }, // store file URL or path (optional)
  status: { type: Boolean, default: true }, // true => active
  is_cashback: { type: Boolean, default: false },
  list_promocode: { type: Boolean, default: false },
  details: { type: Object },
  xtime: { type : Date, default: Date.now },
   modulename: {
      type: String,
      enum: ["food", "shop", "shopping"], // ✅ numbers 0-pending, 1-approved, 2-suspend
      default: "shopping"
    },

});

const Promo = mongoose.model("Promo", packageSchema);
export default Promo;





