import mongoose from "mongoose";

const { Schema } = mongoose;

const ImageSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  image: { type: String, required: true },
}); 


const SupportSchema = new Schema(
  {
   // user: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "users", required: true },
    departmenttype: { type: String, required: true },
    subject: { type: String },
    images: [ImageSchema],
    status: { type: String, default: "Pending" },
    message: { type: String },
    createBy: { type: String },
    updateBy: { type: String },
  },
  { timestamps: true } 
);

const Support = mongoose.model("Support", SupportSchema);
export default Support;
