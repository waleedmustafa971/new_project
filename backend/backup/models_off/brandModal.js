import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, 
    image : {type : String},
    status : {type : String}
  },
  { timestamps: true }
);

export default mongoose.model("ecombrand", brandSchema);
