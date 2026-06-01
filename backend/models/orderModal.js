import mongoose from "mongoose";
const { Schema } = mongoose;

const ProductSchema = new Schema({
   productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor"
    },
    qty: Number,
    price: Number,
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      reviewedAt: Date
    }
});

const PaymentSchema = new Schema({
  paymentid: { type: String },
  payment_type: { type: String, enum: ["COD", "Card", "BKash", "Nagad", "Rocket"], default: "COD" },
  payment_amount: { type: Number, default: 0 },
  payment_date: { type: String },
  payment_time: { type: String }
});

const AddressSchema = new Schema({
  name: String,
  phone: String,
  email: String,
  street: String,
  city: String,
  country: String,
  zipcode: String
});

const OrderTrackingSchema = new Schema({
  status: {
    type: String,
    enum: ["Order Placed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"],
    default: "Order Placed"
  },
  message: { type: String },
  datetime: { type: Date, default: Date.now }
});

const VendorSchema = new Schema({
  vendorid: { type: String, required: true },
  vendorname: { type: String },
  commission: { type: Number, default: 0 },
  vendor_amount: { type: Number, default: 0 }
});

const orderSchema = new Schema(
  {
    orderid: { type: String, required: true, unique: true },
    orderdate: {
      type: Date,
      required: true,
      index: true
    },
    ordertime: { type: String, required: true },
    products: [ProductSchema],
   // products: { type: Object },
    promocode: { type: String, default: null },
    //payment: PaymentSchema,
    payment: { type: Object },
    //   address: AddressSchema,
    address: { type: Object },
    deliveryfee: { type: Number, default: 0 },
    // vendorid: [VendorSchema],
    vendorid: { type: Object },
    userid: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderstatus: {
      type: String,
      enum: ["Order Placed", "Processing", "Packed","Shiped","Out for Delivery","Reject","Delivered"],
      default: "Order Placed"
    },
    orderTracking: [OrderTrackingSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
