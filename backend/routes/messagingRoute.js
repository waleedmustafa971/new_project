import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

import * as chat from "../controllers/chatController.js";
import * as calls from "../controllers/callController.js";
import * as e2e from "../controllers/encryptionController.js";
import * as groups from "../controllers/groupChatController.js";

// Same uploads/chat destination the socket handler already writes to.
const dir = "uploads/chat/";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname)}`),
});
// Per-kind ceilings are enforced in the controller; this is the hard stop.
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

const router = express.Router();

/* ---- attachments: files, videos, voice notes ---- */
router.post("/attachments", upload.array("file", 10), chat.uploadAttachments);

/* ---- stickers, GIFs & emojis (static paths before any /:id) ---- */
router.get("/stickers", chat.listStickerPacks);
router.get("/stickers/search", chat.searchStickers);
router.post("/stickers/use", chat.useSticker);
router.get("/stickers/:id", chat.getStickerPack);

/* ---- calls ---- */
router.get("/calls", calls.callHistory);
router.get("/calls/active", calls.activeCall);
router.post("/calls", calls.startCall);
router.get("/calls/:id", calls.getCall);
router.post("/calls/:id/answer", calls.answerCall);
router.post("/calls/:id/decline", calls.declineCall);
router.post("/calls/:id/join", calls.joinCall);
router.post("/calls/:id/leave", calls.leaveCall);
router.post("/calls/:id/end", calls.endCall);
router.post("/calls/:id/timeout", calls.timeoutCall);
router.post("/calls/:id/media", calls.setCallMedia);
router.post("/calls/:id/token", calls.refreshCallToken);
router.delete("/calls/:id", calls.deleteCallRecord);

/* ---- end-to-end encryption ---- */
router.post("/keys", e2e.registerDevice);
router.post("/keys/prekeys", e2e.addPreKeys);
router.get("/keys/devices", e2e.myDevices);
router.get("/keys/safety/:otherId", e2e.safetyNumber);
router.get("/keys/:userId", e2e.getKeys);
router.delete("/keys/:deviceId", e2e.revokeDevice);
router.post("/encrypted", e2e.storeEncrypted);

/* ---- typing indicator ---- */
router.post("/typing", chat.setTyping);

/* ---- group chat: management only ----
   Message traffic runs through the conversation endpoints below against the
   group's conversation id, so a group gets reactions, receipts, disappearing
   timers and attachments rather than a second, thinner message path. */
router.get("/groups", groups.myGroups);
router.post("/groups", groups.createGroup);
router.get("/groups/:groupId", groups.getGroup);
router.patch("/groups/:groupId", groups.updateGroup);
router.delete("/groups/:groupId", groups.deleteGroup);
router.get("/groups/:groupId/conversation", groups.groupConversation);
router.get("/groups/:groupId/members", groups.listMembers);
router.post("/groups/:groupId/members", groups.addMembers);
router.delete("/groups/:groupId/members/:memberId", groups.removeMember);
router.post("/groups/:groupId/members/:memberId/admin", groups.setAdmin);
router.post("/groups/:groupId/leave", groups.leaveGroup);
router.post("/groups/:groupId/transfer", groups.transferGroup);

/* ---- a single message ---- */
router.post("/messages/:id/react", chat.reactToMessage);
router.get("/messages/:id/reactions", chat.listReactions);
router.put("/messages/:id", chat.editMessage);
router.delete("/messages/:id", chat.deleteMessage);
router.post("/messages/:id/played", chat.markPlayed);
router.post("/messages/:id/view-once", chat.openViewOnce);
router.get("/messages/:id/receipts", chat.readReceipts);

/* ---- a conversation ---- */
router.get("/conversations/:id/messages", chat.listMessages);
router.get("/conversations/:id/media", chat.conversationMedia);
router.post("/conversations/:id/read", chat.markRead);
router.get("/conversations/:id/disappearing", chat.getDisappearing);
router.post("/conversations/:id/disappearing", chat.setDisappearing);
router.get("/conversations/:id/encryption", e2e.encryptionStatus);
router.post("/conversations/:id/encryption", e2e.enableEncryption);

export default router;
