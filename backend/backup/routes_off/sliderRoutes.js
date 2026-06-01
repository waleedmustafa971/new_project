import express from "express";
import upload from "../middleware/sliderupload.js";
import {
  addSlider,
  updateSlider,
  listSliders, deleteSlider
} from "../controllers/sliderController.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router();

// Multi-image upload
router.post("/add", upload.array("image", 10), addSlider);

router.post("/update/:id", upload.array("image", 10), updateSlider);
router.delete("/delete/:id", deleteSlider);

router.get("/list", listSliders);

export default router;
