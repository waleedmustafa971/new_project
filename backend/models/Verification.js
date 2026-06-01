
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  image: { type: String, required: true },
}); // _id is automatically generated


const verifySchema = new mongoose.Schema({
  userid: { type: String, required: true },
    companyName: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    images: [ImageSchema],

    telephone: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdBy: {type: String},
    updatedBy: {type: String}
});

const Verification = mongoose.model('Verification', verifySchema);

export default Verification;  // Default export

