import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, 
    image : {type : String},
    type : {type : String},
    icon: { type: String }, 
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Ecomcategory", default: null } 
  },
  { timestamps: true }
);

export default mongoose.model("Ecomcategory", categorySchema);
