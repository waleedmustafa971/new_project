import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    userid: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "users", // The model name for your users collection
      required: true 
    },
    property_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Propertyads", // The model name for your property ads collection
      required: true 
    },
    details: { type: Object }, // Use Object instead of object
  },
  { timestamps: true }
);

export default mongoose.model("propertyfavourite", categorySchema);

