import express from "express";
import {
  registerToken, unregisterToken, sendNotification,
  listNotifications, unreadCount, markRead,
  deleteNotification, clearNotifications,
  getPreferences, updatePreferences,
  muteActor, unmuteActor, listMuted,
  subscribeToPage, unsubscribeFromPage, listPageSubscriptions,
} from "../controllers/notificationController.js";

import authMiddleware from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();

/* device tokens — a device may only be attached to the caller's own account */
router.post("/register-token", authMiddleware, registerToken);
router.post("/unregister-token", authMiddleware, unregisterToken);

/*
  Direct send. This was open to anyone, which with push disabled did nothing and
  with push configured would let a stranger deliver arbitrary notifications to
  any user. It is an admin/server-to-server operation, so it is behind the admin
  token now — the same gate the admin panel's own send already uses.
*/
router.post("/send", adminAuth, sendNotification);

/* preferences — declared before "/:id" so the word is not read as an id */
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

/* muting an account's notifications (see muteActor — never reveals the mute) */
router.get("/muted", listMuted);
router.post("/mute", muteActor);
router.post("/unmute", unmuteActor);

/* page notification subscriptions — the bell on top of a follow */
router.get("/pages", listPageSubscriptions);
router.post("/pages/subscribe", subscribeToPage);
router.post("/pages/unsubscribe", unsubscribeFromPage);

/* in-app list */
router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.post("/read", markRead);
router.delete("/clear", clearNotifications);
router.delete("/:id", deleteNotification);

export default router;
