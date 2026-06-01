import express from "express";
import { 
  getDashboard
} from "../controllers/userdashboardController.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../config/multer.js";

const router = express.Router();
// List supports
router.get("/:id/userdashboard", authMiddleware, getDashboard);


export default router;
