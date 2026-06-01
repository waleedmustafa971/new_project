import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Ecomcategory", required: true },
    sucategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Ecomcategory", required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "ecombrand", required: true },
    productname: { type: String, required: true },   
    showcasecategory: { type: String },   
    price: { type: Number, default: 0 },  // Single product price
    producttype: { type: String, enum: ["Single", "Variant"], default: "Single" },  // product type - Single, Variant
    productstatus: { type: String, enum: ["draft", "reject","live","hold","waiting for approval"], default: "waiting for approval" },  // product type - Single, Variant
    // Optional: multi-size pricing
    sizes: [
      {
        size: { type: String, required: false }, // e.g., S, M, L, XL
        price: { type: Number, required: false },
        stock: { type: Number, default: 0 },
      },
    ],
    specialDiscount: {
      isDiscounted: { type: Boolean, default: false },
      discountType: { type: String, enum: ["percentage", "flat"], default: "percentage" },
      value: { type: Number, default: 0 },
      validUntil: { type: Date },
    },
    stock: { type: Number, default: 0 }, // default stock if sizes not used
    images: [String],
    description: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: String,
        rating: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
