import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
    unique: true, // Prevent duplicates
  },
  hasThumbnail: {
    type: Boolean,
    default: false,
  },
  thumbnailPath: {
    type: String,
    default: null,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
