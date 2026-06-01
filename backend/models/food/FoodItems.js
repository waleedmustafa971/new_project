import mongoose from "mongoose";

/**
 * Optional / Addon Items Schema
 */
const foodOptionalItemSchema = new mongoose.Schema(
  {
    parent_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fooditems",
      required: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    product_image: {
      type: String,
      default: null,
    },
    status: {
      type: Number,
      default: 1, // 1 = active
    },
  },
  { timestamps: true }
);

/**
 * Main Food Item Schema
 */
const foodItemSchema = new mongoose.Schema(
  {
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Foodcategory",
      required: true,
    },

    item_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    cuisines: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    item_name_ar: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    price: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    final_price: {
      type: Number,
      required: true,
    },

    item_image: {
      type: String,
      default: "uploads/food/default.png",
    },

    is_veg: {
      type: Boolean,
      default: false,
    },

    status: {
      type: Number,
      default: 1, // 1 = active, 0 = inactive
    },

    optional_items: [foodOptionalItemSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Fooditems", foodItemSchema);
