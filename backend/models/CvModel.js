import mongoose from "mongoose";

const cvSchema = new mongoose.Schema(
  {
    // Core info
    name: { type: String, required: true, unique: true }, // Category name
    category: { type: String, required: true },
    subcategory: { type: String },

    // Candidate details
    headline: { type: String },
    phoneno: { type: String, match: [/^\+?[0-9]{7,15}$/, "Invalid phone number"] },
    coverletter: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    nationality: { type: String },

    // File upload
    uploadcvfile: {
      type: String, // store file path or URL
      validate: {
        validator: function (v) {
          if (!v) return true; // optional
          return /\.(pdf|doc|docx)$/i.test(v);
        },
        message: "File must be PDF, DOC, or DOCX",
      },
    },

    // Professional info
    currentlocation: { type: String },
    currentcompany: { type: String },
    currentposition: { type: String },
    noticeperiod: { type: String },
    visastatus: { type: String },
    expectedsalary: { type: Number },
    workexperience: { type: Object }, // in years
    educationlevel: { type: Object },
    commitment: { type: String }, // full-time, part-time, etc.
    status: {type: String}, 
  // ✅ Reference to users model
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    // Work preferences
    location: {
      type: {
        building: { type: String },
        state: { type: String },
      },
    },
    googlemaplink: { type: String },

    // System fields
    createddatetime: { type: Date, default: Date.now },
  },
  { timestamps: true } // includes createdAt, updatedAt
);

export default mongoose.model("cvtbl", cvSchema);
