import mongoose from "mongoose";
import slugify from "slugify"; // install with: npm install slugify

const { Schema, model } = mongoose;

const groupSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      unique: true,
      minlength: [2, "Title must be at least 2 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    icon: {
      type: String
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "jobcategory", default: null } // Reference to parent category

  },
  { timestamps: true }
);

// ✅ Pre-save middleware to auto-generate slug from title
groupSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const JobCategory = model("jobcategory", groupSchema);
export default JobCategory;
