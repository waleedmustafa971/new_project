import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    created_by: {
      type: Number,
      default: 1,
      required: true,
    },

    category_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    category_image: {
      type: String,
      required: true,
      maxlength: 500,
    },

    status: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      default: null,
    },

    category_name_ar: {
      type: String,
      default: null,
      maxlength: 250,
    },

    description_ar: {
      type: String,
      default: null,
    },

    recommended_by_admin: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // automatically creates createdAt & updatedAt
  }
);

export default mongoose.model("Foodcategory", categorySchema);
