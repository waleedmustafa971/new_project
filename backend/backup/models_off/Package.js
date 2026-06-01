import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  productid: { type: String },
  verientid: { type: String },
  point: { type: Number },
  name: { type: String, required: true },
  currency: { type: String, required: true },
  price: { type: Number, required: true }, // USD
  description: { type: String },
  status: { type: String }, //active, Inactive
  add_user: { type: String }, 
  update_user: { type: String }, 
  enteredby: { type : Date, default: Date.now },
  updateby: { type : Date, default: Date.now },
  xtime: { type : Date, default: Date.now }

});

const Package = mongoose.model("Package", packageSchema);
export default Package;


