import mongoose from "mongoose";

const restaurantCategorySchema = new mongoose.Schema(
  {
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant", // linked with Restaurant Model
      required: true,
    },

     cuisine_id : {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodCuisine", // linked with Food Category Model
      required: true,
    },
  },
  {
    timestamps: true, // creates createdAt & updatedAt
  }
);

export default mongoose.model(
  "RestaurantCuisine",
  restaurantCategorySchema
);
