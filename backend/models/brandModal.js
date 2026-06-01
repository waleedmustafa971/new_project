import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, 
    image : {type : String},
    status : {type : String},
    modulename : {type : String} // food shopping shop
  }, 
  { timestamps: true }
);

export default mongoose.model("ecombrand", brandSchema);
