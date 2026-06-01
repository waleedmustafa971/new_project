import express from "express";
import { updateOwnMusic, getMusic } from "../controllers/music_controller.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/updateOwnMusic",updateOwnMusic) //updateOwnMusic
router.get("/getMusic", getMusic)


export default router