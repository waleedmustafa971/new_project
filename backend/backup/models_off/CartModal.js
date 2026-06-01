import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, 
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },   
    price: { type: Number, default: 0 },  // Single product price
    qty: { type: Number, default: 0 },  // Single product price
    status: { type: String, enum: ["not yet submit", "submit"], default: "not yet submit" },  // product type - Single, Variant
    sizes: {type : Object}
  },
  { timestamps: true }
);

export default mongoose.model("cart", cartSchema);
