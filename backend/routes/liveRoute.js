import express from "express";
import {
  streamDetail, joinStream, leaveStream, listViewers, endStream,
  requestSeat, listSeatRequests, respondToSeat, leaveSeat, removeSeat, toggleSeatMedia,
  coinBalance, listGiftCatalogue, sendGift, giftLeaderboard, giftHistory,
} from "../controllers/liveController.js";

const router = express.Router();

/* gifting — static paths first so they are not read as a stream id */
router.get("/gifts", listGiftCatalogue);
router.get("/coins", coinBalance);
router.get("/gifts/history", giftHistory);

/* a stream room */
router.get("/streams/:id", streamDetail);
router.post("/streams/:id/join", joinStream);
router.post("/streams/:id/leave", leaveStream);
router.get("/streams/:id/viewers", listViewers);
router.post("/streams/:id/end", endStream);

/* co-host seats and guest seats share one queue */
router.post("/streams/:id/seats/request", requestSeat);
router.get("/streams/:id/seats/requests", listSeatRequests);
router.post("/streams/:id/seats/respond", respondToSeat);
router.post("/streams/:id/seats/leave", leaveSeat);
router.post("/streams/:id/seats/remove", removeSeat);
router.post("/streams/:id/seats/media", toggleSeatMedia);

/* gift coins during live */
router.post("/streams/:id/gift", sendGift);
router.get("/streams/:id/gifts/leaderboard", giftLeaderboard);

export default router;
