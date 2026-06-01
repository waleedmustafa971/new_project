import express from "express";
import { createStm } from "../controllers/video_ivs_controller.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/createStm",createStm) //updateOwnMusic



export default router