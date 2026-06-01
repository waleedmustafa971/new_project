import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, 
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Fooditems", required: true },   
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },   
    productname: {type: String},
    currency: {type: String},
    images: {type: String},
    date_and_time: {type: Date},
    price: { type: Number, default: 0 },  // Single product price
    discount: { type: Number, default: 0 },  // Single product price
    finalamount: { type: Number, default: 0 },  // Single product price
    qty: { type: Number, default: 0 },  // Single product price
    status: { type: String, enum: ["not yet submit", "submit"], default: "not yet submit" },
    orderid: { type: String} // after update order it will add here

  },
  { timestamps: true }
);

export default mongoose.model("foodcarts", cartSchema);
