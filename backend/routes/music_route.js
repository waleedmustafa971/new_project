import express from "express";
import { updateOwnMusic, getMusic, addMusic } from "../controllers/music_controller.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/addmusic",addMusic) //updateOwnMusic
router.post("/updateOwnMusic",updateOwnMusic) //updateOwnMusic
router.get("/getMusic", getMusic)


export default router