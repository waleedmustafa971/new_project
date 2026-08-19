import express from "express";
import {
  blockUser, unblockUser, listBlocked, blockStatus, blockedIds,
  submitReport, myReports, reportStatus, reportReasons,
  restrictUser, unrestrictUser, listRestricted, restrictStatus,
  pendingRestrictedComments, decideRestrictedComment,
  hidePost, unhidePost, listHiddenPosts,
  loginHistory, trustDevice,
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

/* restrict — the quiet alternative to blocking */
router.post("/restrict", restrictUser);
router.post("/unrestrict", unrestrictUser);
router.get("/restricted", listRestricted);
router.get("/restrict-status/:targetId", restrictStatus);
router.get("/restricted-comments", pendingRestrictedComments);
router.post("/restricted-comments/decide", decideRestrictedComment);

/* hide a post from your own feed */
router.post("/hide-post", hidePost);
router.post("/unhide-post", unhidePost);
router.get("/hidden-posts", listHiddenPosts);

/* login alerts */
router.get("/login-history", loginHistory);
router.post("/trust-device", trustDevice);

export default router;
