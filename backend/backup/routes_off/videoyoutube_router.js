import express from "express";
import { addVideoData, getVideodata } from "../controllers/videoyoutube_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import uploadvideo from '../config/video_multer.js';

//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/upload-yuvideo', uploadvideo.array('images', 1), addVideoData);
router.get("/getvideo", getVideodata)


export default router