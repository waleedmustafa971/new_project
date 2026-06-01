import multer from "multer";
import path from "path";

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

// Filter file types (accept only images & videos)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "video/mov"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit
  fileFilter,
});

// Export uploader
export const uploadSingle = upload.single("file"); // For single file
export const uploadMultiple = upload.array("file", 10); // For multiple files (max 10)
