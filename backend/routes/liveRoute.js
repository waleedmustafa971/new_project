import express from "express";
import {
  streamDetail, joinStream, leaveStream, listViewers, endStream,
  requestSeat, listSeatRequests, respondToSeat, leaveSeat, removeSeat, toggleSeatMedia,
  coinBalance, listGiftCatalogue, sendGift, giftLeaderboard, giftHistory,
  startBroadcast, listLiveStreams, updateBroadcast, streamToken,
  inviteToSeat, respondToInvite, myInvites,
} from "../controllers/liveController.js";
import {
  sendChatMessage, listChat, deleteChatMessage, pinChatMessage, updateChatSettings,
  sendReaction, reactionTotals,
  setModerator, listModerators, kickViewer, muteViewer, liftRestriction, listModeration,
} from "../controllers/liveChatController.js";

const router = express.Router();

/* gifting — static paths first so they are not read as a stream id */
router.get("/gifts", listGiftCatalogue);
router.get("/coins", coinBalance);
router.get("/gifts/history", giftHistory);

/* start a live broadcast, and the browse rail
   `/streams/invites` is declared before `/streams/:id` for the same reason the
   gift routes are above: otherwise "invites" is matched as a stream id. */
router.post("/streams", startBroadcast);
router.get("/streams", listLiveStreams);
router.get("/streams/invites", myInvites);

/* a stream room */
router.get("/streams/:id", streamDetail);
router.patch("/streams/:id", updateBroadcast);
router.get("/streams/:id/token", streamToken);
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

/* the other direction: the host invites, the invitee answers */
router.post("/streams/:id/seats/invite", inviteToSeat);
router.post("/streams/:id/seats/invite/respond", respondToInvite);

/* live chat */
router.post("/streams/:id/chat", sendChatMessage);
router.get("/streams/:id/chat", listChat);
router.patch("/streams/:id/chat/settings", updateChatSettings);
router.delete("/streams/:id/chat/:messageId", deleteChatMessage);
router.post("/streams/:id/chat/:messageId/pin", pinChatMessage);

/* floating-emoji reactions */
router.post("/streams/:id/reactions", sendReaction);
router.get("/streams/:id/reactions", reactionTotals);

/* moderation */
router.get("/streams/:id/moderators", listModerators);
router.post("/streams/:id/moderators", setModerator);
router.get("/streams/:id/moderation", listModeration);
router.post("/streams/:id/moderation/kick", kickViewer);
router.post("/streams/:id/moderation/mute", muteViewer);
router.post("/streams/:id/moderation/lift", liftRestriction);

/* gift coins during live */
router.post("/streams/:id/gift", sendGift);
router.get("/streams/:id/gifts/leaderboard", giftLeaderboard);

export default router;
