import express from "express";
import {
  blockUser, unblockUser, listBlocked, blockStatus, blockedIds,
  submitReport, myReports, reportStatus, reportReasons,
} from "../controllers/safetyController.js";

const router = express.Router();

/* block */
router.post("/block", blockUser);
router.post("/unblock", unblockUser);
router.get("/blocked", listBlocked);
router.get("/block-status", blockStatus);
router.get("/blocked-ids", blockedIds);

/* report */
router.get("/report-reasons", reportReasons);
router.post("/report", submitReport);
router.get("/my-reports", myReports);
router.get("/report-status", reportStatus);

export default router;
