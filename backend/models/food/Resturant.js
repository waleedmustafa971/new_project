import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    restaurant_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    first_name: {
      type: String
    },
    last_name: {
      type: String
    },
    restaurant_name_ar: {
      type: String,
      default: null,
      maxlength: 250,
    },

    restaurant_image: {
      type: String,
      default: "static_images/restaurant.jpg",
      maxlength: 500,
    },

    manual_address: {
      type: String
    },

    contact_person_name: {
      type: String,
      maxlength: 150,
    },

    restaurant_phone_number: {
      type: String,
      required: true,
      maxlength: 150,
    },

    phone_with_code: {
      type: String
    },

    google_address: {
      type: String,
      default: null,
    },

    zip_code: {
      type: String
    },

    is_open: {
      type: Number,
      default: 0,
    },

    password: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      default: null,
      lowercase: true,
    },
    url: {
      type: String,
      default: null,
    },
    fcm_token: {
      type: String,
      default: "0",
    },
    username: {
      type: String,
      required: true,
      maxlength: 150,
    },

    licence_no: {
      type: String,
      default: null,
      maxlength: 150,
    },

    lat: {
      type: String,
      default: null,
    },

    lng: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
    },
    number_of_rating: {
      type: String,
      default: "0",
    },

    overall_rating: {
      type: String,
      default: "5",
    },

    certificate: {
      type: String,
      default: null,
      maxlength: 500,
    },

    admin_user_id: {
      type: String,
      required: true,
    },

    wallet: {
      type: Number,
      default: 0,
    },

    order_id: {
      type: Number,
      default: 0,
    },

    order_status: {
      type: Number,
      default: 0,
    },

    license_no: {
      type: String,
      default: null,
      maxlength: 250,
    },
    status: {
      type: Number,
      enum: [0, 1, 2], // ✅ numbers 0-pending, 1-approved, 2-suspend
      default: 0
    },
    shoptype: {
      type: String,
      required: true, //restaurant or shop
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
    balance: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    foodcuisine: { type: [String] },
    offerpercent: { type: Number } // resturant wise discount
  },
  {
    timestamps: true
  }
);
/* ⭐ GEO INDEX (MUST BE BEFORE EXPORT) */
restaurantSchema.index({ location: "2dsphere" });
export default mongoose.model("Restaurant", restaurantSchema);
