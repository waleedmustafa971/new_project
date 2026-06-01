import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
  
    logo: {
      type: String,
      default: "static_images/restaurant.jpg",
      maxlength: 500,
    },
    manual_address: {
      type: String
    },
    phone_number: {
      type: String,
      required: true,
      maxlength: 150,
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
    modulename: {
      type: String
    },
   
  },
  {
    timestamps: true
  }
);
/* ⭐ GEO INDEX (MUST BE BEFORE EXPORT) */
companySchema.index({ location: "2dsphere" });
export default mongoose.model("Company", companySchema);
