import express from "express";
import {
  AddAgent,
  updateAgent,
  deleteAgent,
  updateStatus,
  agentList,
} from "../controllers/agent_controller.js";
import upload from "../config/multer.js";

const router = express.Router();

router.post(
  "/add",
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "picture", maxCount: 1 },
  ]),
  AddAgent
);
router.put("/update/:id", upload.array("files", 5), updateAgent);
router.delete("/delete/:id", deleteAgent);
router.patch("/status/:id", updateStatus);
router.get("/list", agentList);

export default router;
