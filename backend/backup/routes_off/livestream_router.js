import express from "express";
import { createLiveStream, getStream } from "../controllers/LiveStreamController.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/create-stream",createLiveStream) 
router.get("/get-live-stream", getStream)


export default router