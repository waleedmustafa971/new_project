import mongoose from "mongoose";

const foodCuisineSchema = new mongoose.Schema(
  {
    cuisine_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    cuisine_name_ar: {
      type: String,
      default: null,
      maxlength: 250,
    },

    cuisine_image: {
      type: String,
      required: true,
      maxlength: 500,
    },

    status: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true, // creates createdAt & updatedAt
  }
);

export default mongoose.model("FoodCuisine", foodCuisineSchema);
