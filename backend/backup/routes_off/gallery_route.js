import express from "express";
import { getGallery, addGallery, deleteGallery } from "../controllers/gallery_controller.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()

router.post("/add-gallery", addGallery)
router.delete("/delete-gallery", deleteGallery)
router.get("/get-gallery", getGallery)


export default router