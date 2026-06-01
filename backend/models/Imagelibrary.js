import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  image_name: { type: String },       // original file name
  image_url: { type: String },        // stored file path / URL
  size: { type: Number },             // file size
  type: { type: String },             // image/jpeg, image/png
  uploaded_by: { type: String },      // optional (user/admin)
}, { timestamps: true });

const Imagelibrary = mongoose.model("Images", imageSchema);
export default Imagelibrary;




