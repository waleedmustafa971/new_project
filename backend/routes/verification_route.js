import express from "express";
import { addData, updateData, getList, updateStatus, deleteData,
  applyForBadge, getBadgeStatus, withdrawBadgeRequest, getBadges
 } from "../controllers/verification_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';

router.post('/add', upload.array('images', 2), addData);
router.post('/update', upload.array('images', 2), updateData);
router.post('/update-status', authMiddleware, updateStatus);
router.post('/delete-data', authMiddleware, deleteData);
router.get('/list', authMiddleware, getList);

/* Verified Badge (blue tick) — social verification from the app */
router.post('/apply', upload.array('images', 3), applyForBadge);
router.get('/my-status', getBadgeStatus);
router.post('/withdraw', withdrawBadgeRequest);
router.get('/badge', getBadges); // bulk lookup for feeds and comment lists


export default router