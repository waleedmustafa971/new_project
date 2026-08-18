import express from "express";
import {
  registerToken, unregisterToken, sendNotification,
  listNotifications, unreadCount, markRead,
  deleteNotification, clearNotifications,
  getPreferences, updatePreferences,
} from "../controllers/notificationController.js";

const router = express.Router();

/* device tokens */
router.post("/register-token", registerToken);
router.post("/unregister-token", unregisterToken);

/* direct send (admin / server-to-server) */
router.post("/send", sendNotification);

/* preferences — declared before "/:id" so the word is not read as an id */
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

/* in-app list */
router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.post("/read", markRead);
router.delete("/clear", clearNotifications);
router.delete("/:id", deleteNotification);

export default router;
