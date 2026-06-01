import mongoose from "mongoose";

const restaurantCategorySchema = new mongoose.Schema(
  {
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant", // linked with Restaurant Model
      required: true,
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Foodcategory", // linked with Food Category Model
      required: true,
    },
  },
  {
    timestamps: true, // creates createdAt & updatedAt
  }
);

export default mongoose.model(
  "RestaurantCategory",
  restaurantCategorySchema
);
