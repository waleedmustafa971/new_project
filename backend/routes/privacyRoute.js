import express from "express";
import {
  getSettings, updateSettings,
  getVisibility, getMaskedProfile,
  requestFollow, cancelFollowRequest, listFollowRequests,
  listSentRequests, respondFollowRequest,
  listCloseFriends, updateCloseFriends,
} from "../controllers/privacyController.js";

const router = express.Router();

/* settings screen */
router.get("/settings", getSettings);
router.post("/settings", updateSettings);

/* visibility checks used before rendering a profile */
router.get("/visibility", getVisibility);
router.get("/profile", getMaskedProfile);

/* follow requests for approval-gated accounts */
router.post("/follow", requestFollow);
router.post("/follow/cancel", cancelFollowRequest);
router.get("/follow-requests", listFollowRequests);
router.get("/follow-requests/sent", listSentRequests);
router.post("/follow-requests/respond", respondFollowRequest);

/* close friends allow list */
router.get("/close-friends", listCloseFriends);
router.post("/close-friends", updateCloseFriends);

export default router;
