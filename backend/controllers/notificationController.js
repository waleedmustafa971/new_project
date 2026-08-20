import mongoose from "mongoose";
import User from "../models/users.js";
import Notification from "../models/Notification.js";
import { sendNotificationToUser } from "../services/notificationService.js";

/* ------------------------------------------------------------------ */
/* device tokens                                                       */
/* ------------------------------------------------------------------ */

/*
  Attach a device token to the signed-in account.

  The account comes from the caller's own token. It used to come from the
  request body on an unauthenticated route, which meant anyone could attach
  their own device to somebody else's account and start receiving that person's
  push notifications. Nothing called this route while push was disabled, so the
  hole was inert — configuring Firebase is exactly what would have armed it.

  A body userId is still accepted, but only when it matches the caller.
*/
export const registerToken = async (req, res) => {
  try {
    const caller = req.user?.userId || req.user?._id;
    const { userId: bodyUserId, fcmtoken } = req.body;

    if (!caller) {
      return res.status(401).json({ message: "Sign in to register a device" });
    }
    if (bodyUserId && String(bodyUserId) !== String(caller)) {
      return res.status(403).json({ message: "You can only register a device for yourself" });
    }
    if (!fcmtoken) {
      return res.status(400).json({ message: "fcmtoken is required" });
    }
    const userId = caller;

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

/*
  Every switch the settings screen can flip.

  This list is the whole API surface of the preferences model: a key in the
  schema but missing here is a switch that cannot be reached, which is exactly
  how `storyViews` — a preference that defaults to *off* — sat unreachable and
  made story-view notifications impossible to turn on. Adding a field to
  NotificationPrefsSchema means adding it here in the same change.
*/
const PREF_KEYS = [
  "push", "inApp", "likes", "comments", "replies",
  "commentLikes", "mentions", "tags", "follows", "shares", "live",
  "groups", "messages", "storyViews", "pages", "subscriptions", "security",
];

/*
  A clock time as minutes past midnight.

  Accepts either the number the API stores or the "22:00" a settings screen
  naturally sends, because requiring the client to do the arithmetic is how it
  gets done differently on two platforms.
*/
const toMinutes = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

export const updatePreferences = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const set = {};
  for (const k of PREF_KEYS) {
    if (req.body?.[k] !== undefined) set[`notificationPrefs.${k}`] = !!req.body[k];
  }

  /*
    Quiet hours are set field by field rather than as a whole object, so a
    client that sends only `{ enabled: true }` keeps the window it set last
    time instead of silently resetting it to the schema default.
  */
  const q = req.body?.quietHours;
  if (q && typeof q === "object") {
    if (q.enabled !== undefined) set["notificationPrefs.quietHours.enabled"] = !!q.enabled;

    for (const field of ["start", "end"]) {
      if (q[field] === undefined) continue;
      const mins = toMinutes(q[field]);
      if (mins === null) return failn(res, 400, `quietHours.${field} must be minutes or "HH:MM"`);
      set[`notificationPrefs.quietHours.${field}`] = mins;
    }

    if (q.tzOffsetMinutes !== undefined) {
      const tz = Number(q.tzOffsetMinutes);
      // ±14h is the real range of world offsets; anything else is a bug in the
      // client, most likely seconds or milliseconds sent as minutes.
      if (!Number.isFinite(tz) || Math.abs(tz) > 14 * 60) {
        return failn(res, 400, "quietHours.tzOffsetMinutes must be within ±840");
      }
      set["notificationPrefs.quietHours.tzOffsetMinutes"] = Math.trunc(tz);
    }
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
/* The mirror of registerToken, and gated the same way. */
export const unregisterToken = wrapn(async (req, res) => {
  const caller = req.user?.userId || req.user?._id;
  const { userId: bodyUserId, fcmtoken } = req.body || {};

  if (!caller) return failn(res, 401, "Sign in to remove a device");
  if (bodyUserId && String(bodyUserId) !== String(caller)) {
    return failn(res, 403, "You can only remove a device from your own account");
  }
  if (!fcmtoken) return failn(res, 400, "fcmtoken is required");
  const userId = caller;

  await User.findByIdAndUpdate(userId, { $pull: { fcm_tokens: fcmtoken } });
  // Clear the single-token field only when it is the token being removed.
  await User.updateOne({ _id: oid(userId), fcm_token: fcmtoken }, { $unset: { fcm_token: "" } });

  ok(res, { message: "Token removed" });
});

/* ------------------------------------------------------------------ */
/* muting an account's notifications                                   */
/* ------------------------------------------------------------------ */

/*
  Mute is the third and quietest option next to blocking and restricting.

  Blocking severs the relationship; restricting hides someone's comments from
  everyone else. Muting changes nothing anyone can observe: the muted account
  keeps following you, their posts still reach your feed, their messages still
  arrive in the thread. Only the notifications stop. It is the "I follow my
  sister and I do not need a buzz for all forty of her stories" case, and like
  restricting it must stay invisible to the person muted — there is deliberately
  no endpoint that answers "has X muted me?".

  Enforcement is in notify(), which drops the record entirely rather than
  writing it silently, so a muted actor cannot fill the list either.
*/
export const muteActor = wrapn(async (req, res) => {
  const userId = who(req);
  const targetId = req.body?.targetId || req.body?.mutedId || req.params?.id;
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  if (!isId(targetId)) return failn(res, 400, "A valid targetId is required");
  if (String(userId) === String(targetId)) return failn(res, 400, "You cannot mute yourself");

  const target = await User.findById(targetId).select("_id").lean();
  if (!target) return failn(res, 404, "User not found");

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { mutedNotificationsFrom: oid(targetId) } },
    { new: true }
  ).select("mutedNotificationsFrom").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { message: "Muted", muted: true, mutedCount: (user.mutedNotificationsFrom || []).length });
});

export const unmuteActor = wrapn(async (req, res) => {
  const userId = who(req);
  const targetId = req.body?.targetId || req.body?.mutedId || req.params?.id;
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  if (!isId(targetId)) return failn(res, 400, "A valid targetId is required");

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { mutedNotificationsFrom: oid(targetId) } },
    { new: true }
  ).select("mutedNotificationsFrom").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { message: "Unmuted", muted: false, mutedCount: (user.mutedNotificationsFrom || []).length });
});

/* The caller's own mute list — never anyone else's, see muteActor. */
export const listMuted = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const user = await User.findById(userId)
    .select("mutedNotificationsFrom")
    .populate("mutedNotificationsFrom", "name username image verifiedBadge")
    .lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { muted: user.mutedNotificationsFrom || [] });
});

/* ------------------------------------------------------------------ */
/* page notifications                                                  */
/* ------------------------------------------------------------------ */

/*
  Subscribing to a page's posts.

  Following a page and asking to be *notified* by it are two different things,
  which is why this is its own list rather than a flag on the follow. Following
  is how the page reaches your feed; this is the bell icon on top of it, and
  most people who follow a page want the first without the second.

  Only creator and business accounts qualify. A personal account already has
  follow notifications, and letting anyone subscribe to anyone would turn this
  into a second, noisier follow.
*/
const PAGE_TYPES = new Set(["creator", "business"]);

export const subscribeToPage = wrapn(async (req, res) => {
  const userId = who(req);
  const pageId = req.body?.pageId || req.params?.id;
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  if (!isId(pageId)) return failn(res, 400, "A valid pageId is required");
  if (String(userId) === String(pageId)) return failn(res, 400, "You cannot subscribe to your own page");

  const page = await User.findById(pageId).select("accountType").lean();
  if (!page) return failn(res, 404, "Page not found");
  if (!PAGE_TYPES.has(page.accountType)) {
    return failn(res, 400, "That account is not a page");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { pageNotificationsFor: oid(pageId) } },
    { new: true }
  ).select("pageNotificationsFor").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { message: "Subscribed", subscribed: true, count: (user.pageNotificationsFor || []).length });
});

export const unsubscribeFromPage = wrapn(async (req, res) => {
  const userId = who(req);
  const pageId = req.body?.pageId || req.params?.id;
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");
  if (!isId(pageId)) return failn(res, 400, "A valid pageId is required");

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { pageNotificationsFor: oid(pageId) } },
    { new: true }
  ).select("pageNotificationsFor").lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { message: "Unsubscribed", subscribed: false, count: (user.pageNotificationsFor || []).length });
});

export const listPageSubscriptions = wrapn(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return failn(res, 400, "A valid userId is required");

  const user = await User.findById(userId)
    .select("pageNotificationsFor")
    .populate("pageNotificationsFor", "name username image verifiedBadge accountType")
    .lean();
  if (!user) return failn(res, 404, "User not found");

  ok(res, { pages: user.pageNotificationsFor || [] });
});
