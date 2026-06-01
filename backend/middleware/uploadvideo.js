import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/tempvideo');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadFiles = multer({ storage }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]);

export default uploadFiles;
