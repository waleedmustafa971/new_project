import mongoose from "mongoose";
import User from "../models/users.js";
import Notification from "../models/Notification.js";
import { sendNotificationToUser } from "../services/notificationService.js";

/* ------------------------------------------------------------------ */
/* device tokens                                                       */
/* ------------------------------------------------------------------ */

export const registerToken = async (req, res) => {
  try {
    const { userId, fcmtoken } = req.body;

    if (!userId || !fcmtoken) {
      return res.status(400).json({ message: "userId and fcmtoken are required" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { fcm_tokens: fcmtoken },
        $set: { fcm_token: fcmtoken },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Token registered successfully",
      fcm_tokens: updatedUser.fcm_tokens,
    });
  } catch (error) {
    console.error("Error registering token:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ message: "userId, title and body are required" });
    }

    const response = await sendNotificationToUser(userId, { title, body, data });

    if (!response) {
      return res.status(404).json({ message: "No device tokens found for user" });
    }

    return res.status(200).json({
      message: "Notification sent",
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ================================================================
   In-app notification list (Engagement module).

   Records are written by services/notificationService.js `notify()`. The
   endpoints below are what the notification screen and the tab badge read.
   ================================================================ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const failn = (res, code, message) => res.status(code).json({ success: false, message });
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const who = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const wrapn = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[notifications]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
  Grouping. Five people liking one post is one line in the UI ("X and 4 others
  liked your post"), not five. Rows are collapsed on read rather than on write,
  so showing the full actor list later stays possible.
*/
const GROUPABLE = new Set(["like", "comment_like", "share", "follow"]);
const groupKey = (n) => `${n.type}:${n.post || ""}:${n.commentId || ""}`;

const collapse = (rows) => {
  const out = [];
  const seen = new Map();

  for (const n of rows) {
    if (!GROUPABLE.has(n.type)) {
      out.push({ ...n, others: 0, actors: [n.actor] });
      continue;
    }
    const k = groupKey(n);
    const g = seen.get(k);
    if (g) {
      g.others += 1;
      if (g.actors.length < 5) g.actors.push(n.actor);
      // One unread member makes the whole collapsed line unread.
      g.read = g.read && n.read;
      continue;
    }
    const fresh = { ...n, others: 0, actors: [n.actor] };
    seen.set(k, fresh);
    out.push(fresh);
  }
  return out;
};

export const listNotifications = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const filter = { recipient: oid(userId) };
  if (req.query.unread === "true") filter.read = false;
  if (req.query.type) filter.type = String(req.query.type);

  // Over-fetch: collapsing shrinks the page, and a page that renders three rows
  // when the client asked for twenty reads as the end of the list.
  const [rows, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 3)
      .populate("actor", "name image verifiedBadge accountType")
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: oid(userId), read: false }),
  ]);

  const items = collapse(rows.filter((n) => n.actor)).slice(0, limit);

  ok(res, {
    page, limit, total, unread,
    hasMore: (page - 1) * limit + rows.length < total,
    notifications: items.map((n) => ({
      _id: n._id,
      type: n.type,
      actor: n.actor,
      others: n.others,
      actors: n.actors,
      post: n.post,
      commentId: n.commentId,
      preview: n.preview,
      reactionType: n.reactionType,
      thumbnail: n.thumbnail,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
});

export const unreadCount = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  ok(res, { unread: await Notification.countDocuments({ recipient: oid(userId), read: false }) });
});

export const markRead = wrapn(async (req, res) => {
  const userId = who(req);
  const { ids } = req.body || {};
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const filter = { recipient: oid(userId), read: false };
  if (Array.isArray(ids) && ids.length) filter._id = { $in: ids.filter(isId).map(oid) };

  const r = await Notification.updateMany(filter, { $set: { read: true, readAt: new Date() } });
  ok(res, {
    message: "Marked as read",
    updated: r.modifiedCount,
    unread: await Notification.countDocuments({ recipient: oid(userId), read: false }),
  });
});

export const deleteNotification = wrapn(async (req, res) => {
  const userId = who(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) {
    return failn(res, 400, "Valid userId and notification id are required");
  }

  const r = await Notification.deleteOne({ _id: oid(id), recipient: oid(userId) });
  if (r.deletedCount === 0) return failn(res, 404, "Notification not found");
  ok(res, { message: "Notification deleted" });
});

export const clearNotifications = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  const r = await Notification.deleteMany({ recipient: oid(userId) });
  ok(res, { message: "Notifications cleared", deleted: r.deletedCount });
});

/* ------------------------------------------------------------------ */
/* per-type preferences                                                */
/* ------------------------------------------------------------------ */

export const getPreferences = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("notificationPrefs tagReview").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, {
    preferences: user.notificationPrefs || {},
    tagReview: !!user.tagReview,
    // Lets the settings screen say "push is off for this server" rather than
    // showing a switch that silently does nothing.
    pushConfigured: !!process.env.FIREBASE_PROJECT_ID,
  });
});

const PREF_KEYS = [
  "push", "inApp", "likes", "comments", "replies",
  "commentLikes", "mentions", "tags", "follows", "shares", "live",
];

export const updatePreferences = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const set = {};
  for (const k of PREF_KEYS) {
    if (req.body?.[k] !== undefined) set[`notificationPrefs.${k}`] = !!req.body[k];
  }
  if (req.body?.tagReview !== undefined) set.tagReview = !!req.body.tagReview;
  if (Object.keys(set).length === 0) return failn(res, 400, "No known preference supplied");

  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true })
    .select("notificationPrefs tagReview").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, {
    message: "Preferences updated",
    preferences: user.notificationPrefs,
    tagReview: !!user.tagReview,
  });
});

/* Drop a device token on logout, so a shared phone stops receiving. */
export const unregisterToken = wrapn(async (req, res) => {
  const { userId, fcmtoken } = req.body || {};
  if (!isId(userId) || !fcmtoken) return failn(res, 400, "userId and fcmtoken are required");

  await User.findByIdAndUpdate(userId, { $pull: { fcm_tokens: fcmtoken } });
  // Clear the single-token field only when it is the token being removed.
  await User.updateOne({ _id: oid(userId), fcm_token: fcmtoken }, { $unset: { fcm_token: "" } });

  ok(res, { message: "Token removed" });
});
