import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// Memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Folder
const logoDir = "uploads/groupimage";
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

// Optimize Logo
export const processLogo = async (file) => {
  if (!file) return null;

  const fileName = Date.now() + ".webp";
  const filePath = path.join(logoDir, fileName);

  await sharp(file.buffer)
    .resize(500, 500, { fit: "inside" })
    .webp({ quality: 80 })
    .toFile(filePath);

  return fileName;
};
