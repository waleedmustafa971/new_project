import express from 'express';
import upload from '../middleware/upload.js';
import { applyGreen } from '../controllers/VideoProcessingController.js';

const router = express.Router();

router.post(
  '/applygreenscreen',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'background', maxCount: 1 },
  ]),
  applyGreen
);

export default router;
