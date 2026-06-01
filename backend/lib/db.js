import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI, {
   // useNewUrlParser: true,
   // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,  // Add a timeout (5s)
  });
  console.log("✅ MongoDB Connected");
};
