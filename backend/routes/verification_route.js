import express from "express";
import { addData, updateData, getList, updateStatus, deleteData
 } from "../controllers/verification_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';

router.post('/add', upload.array('images', 2), addData);
router.post('/update', upload.array('images', 2), updateData);
router.post('/update-status', authMiddleware, updateStatus);
router.post('/delete-data', authMiddleware, deleteData);
router.get('/list', authMiddleware, getList); 


export default router