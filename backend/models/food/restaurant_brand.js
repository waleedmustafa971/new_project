import mongoose from "mongoose";

const restaurantCategorySchema = new mongoose.Schema(
    {
        restaurant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant", // linked with Restaurant Model
            required: true,
        },
        brand_name: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ecombrand", // linked with Restaurant Model
            required: true,
        },
        offer_discount: {
            type: Number,
            default: 0
        },
        status: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true, // creates createdAt & updatedAt
    }
);

export default mongoose.model(
    "Restaurantbrand",
    restaurantCategorySchema
);
