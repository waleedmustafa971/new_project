import express from "express";
import { 
  addData, updateData, updateStatus, getList, deleteAd, replyData,
  getTicketreplydata
} from "../controllers/supportController.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../config/multer.js";

const router = express.Router();

// Create support with file upload
router.post("/add", authMiddleware, upload.array("images", 5), addData);

// Update support
router.post("/update", updateData);

// Delete support
router.post("/delete", deleteAd);

// List supports
router.get("/list", getList);

// (optional) route for updating only status
router.post("/status", authMiddleware, updateStatus);

// Reply to ticket ///:id/replies
router.post("/:id/replies", replyData);

//Get Ticket with Replies
router.get("/:id/tickets", getTicketreplydata);

export default router;
