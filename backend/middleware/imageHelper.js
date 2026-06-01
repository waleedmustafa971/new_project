import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

// Multer setup
const storage = multer.memoryStorage(); // store files in memory for sharp processing
export const upload = multer({ storage });

// Directory for optimized product images
const uploadDir = "uploads/products/optimized";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Function to process and save images with Sharp
export const processImages = async (files) => {
  const fileNames = [];

  for (let file of files) {
    const fileName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    const outputPath = path.join(uploadDir, fileName);

    await sharp(file.buffer)
      .resize(800, 800, { fit: "inside" }) // resize to max 800x800
      .webp({ quality: 80 })              // convert to WebP for optimization
      .toFile(outputPath);

    fileNames.push(fileName);
  }

  return fileNames;
};
