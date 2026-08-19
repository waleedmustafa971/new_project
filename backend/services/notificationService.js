import { messaging } from "../config/firebase.js";
import User from "../models/users.js";

const stringifyData = (data = {}) => {
  const payload = {};
  for (const key of Object.keys(data)) {
    payload[key] = String(data[key]);
  }
  return payload;
};

export const sendToToken = async (token, { title, body, data = {} }) => {
  if (!messaging || !token) return null;
  return messaging.send({
    token,
    notification: { title, body },
    data: stringifyData(data),
  });
};

export const sendToTokens = async (tokens = [], { title, body, data = {} }) => {
  if (!messaging || tokens.length === 0) return null;
  return messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: stringifyData(data),
  });
};

export const sendNotificationToUser = async (userId, { title, body, data = {} }) => {
  const user = await User.findById(userId).select("fcm_tokens fcm_token");
  if (!user) return null;

  const tokens = user.fcm_tokens && user.fcm_tokens.length > 0
    ? user.fcm_tokens
    : user.fcm_token
      ? [user.fcm_token]
      : [];

  if (tokens.length === 0) return null;

  const response = await sendToTokens(tokens, { title, body, data });

  if (response && response.failureCount > 0) {
    const invalidTokens = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const code = result.error && result.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcm_tokens: { $in: invalidTokens } },
      });
    }
  }

  return response;
};

/* ================================================================
   Engagement notifications.

   `notify()` is the single entry point every engagement action calls. It
   writes the in-app record and, when the recipient allows it, sends the push.
   It never throws: a failed notification must not roll back the like or the
   comment that triggered it, so callers can fire it without a try/catch.
   ================================================================ */

import Notification from "../models/Notification.js";

// Which preference switch governs which notification type.
const PREF_OF = {
  like: "likes",
  comment: "comments",
  reply: "replies",
  comment_like: "commentLikes",
  mention_post: "mentions",
  mention_comment: "mentions",
  tag: "tags",
  follow: "follows",
  share: "shares",
  live_request: "live",
  live_invite: "live",
  live_gift: "live",
  message: "messages",
  story_view: "storyViews",
  page_post: "pages",
  // No such key exists in notificationPrefs, and an unknown key defaults to on
  // — which is the right default for someone paying you money.
  subscription: "subscriptions",
  login_alert: "security",
  story_response: "comments",
  mention_story: "mentions",
  group_request: "groups",
  group_approved: "groups",
  group_invite: "groups",
  group_role: "groups",
  group_post: "groups",
};

/*
  Whether the recipient is inside their own quiet hours right now.

  The window is compared in the recipient's local minutes-past-midnight, and a
  window that wraps midnight (22:00 → 07:00) is the ordinary case rather than
  an edge one — which is why start > end is handled explicitly instead of being
  discovered as a bug at 3am.

  Quiet hours suppress the push only. The record is still written, so the
  notification list fills normally and nothing is lost.
*/
export const inQuietHours = (prefs, now = new Date()) => {
  const q = prefs?.quietHours;
  if (!q?.enabled) return false;

  const local = new Date(now.getTime() + (Number(q.tzOffsetMinutes) || 0) * 60000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();

  const start = Number(q.start) || 0;
  const end = Number(q.end) || 0;
  if (start === end) return false;
  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;   // wraps past midnight
};

const REACTION_VERB = {
  like: "liked", love: "loved", haha: "laughed at",
  wow: "was amazed by", sad: "was saddened by", angry: "was angered by",
};

const copyFor = (type, actorName, extra = {}) => {
  switch (type) {
    case "like":
      return { title: actorName, body: `${actorName} ${REACTION_VERB[extra.reactionType] || "liked"} your post` };
    case "comment":
      return { title: actorName, body: `${actorName} commented: ${extra.preview || ""}`.trim() };
    case "reply":
      return { title: actorName, body: `${actorName} replied: ${extra.preview || ""}`.trim() };
    case "comment_like":
      return { title: actorName, body: `${actorName} hearted your comment` };
    case "mention_post":
      return { title: actorName, body: `${actorName} mentioned you in a post` };
    case "mention_comment":
      return { title: actorName, body: `${actorName} mentioned you in a comment` };
    case "tag":
      return { title: actorName, body: `${actorName} tagged you in a photo` };
    case "follow":
      return { title: actorName, body: `${actorName} started following you` };
    case "share":
      return { title: actorName, body: `${actorName} shared your post` };
    case "live_request":
      return { title: actorName, body: `${actorName} ${extra.preview || "wants to join your live"}` };
    case "live_invite":
      return { title: actorName, body: `${actorName} ${extra.preview || "invited you onto their live"}` };
    case "story_view":
      return { title: actorName, body: `${actorName} watched your story` };
    case "message":
      return { title: actorName, body: extra.preview || `${actorName} sent you a message` };
    case "page_post":
      return { title: actorName, body: `${actorName} posted something new` };
    case "story_response":
      return { title: actorName, body: `${actorName} answered: ${extra.preview || "your story sticker"}` };
    case "mention_story":
      return { title: actorName, body: `${actorName} mentioned you in their story` };
    case "login_alert":
      return { title: "New sign-in", body: `Your account was signed in to from ${extra.preview || "a new device"}` };
    case "subscription":
      return { title: "New subscriber", body: `${actorName} ${extra.preview || "subscribed to you"}` };
    case "live_gift":
      return { title: actorName, body: `${actorName} ${extra.preview || "sent you a gift"}` };

    /* Groups & Community — `preview` carries the group name from the caller. */
    case "group_request":
      return { title: "New join request", body: `${actorName} asked to join ${extra.preview || "your group"}` };
    case "group_approved":
      return { title: "Request approved", body: `You're now a member of ${extra.preview || "the group"}` };
    case "group_invite":
      return { title: "Group invitation", body: `${actorName} invited you to ${extra.preview || "a group"}` };
    case "group_role":
      return { title: "New group role", body: extra.preview || `${actorName} changed your role in a group` };
    case "group_post":
      return { title: actorName, body: extra.preview || "There's an update on your group post" };
    default:
      return { title: actorName, body: "You have a new notification" };
  }
};

const truncate = (s, n = 120) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export const notify = async ({
  recipient, actor, type,
  post = null, commentId = null, group = null,
  preview, reactionType, thumbnail,
}) => {
  try {
    if (!recipient || !actor || !type) return null;
    /*
      Never notify someone about their own action — except a security alert,
      where the recipient and the actor are deliberately the same person and
      telling them is the entire point.
    */
    if (String(recipient) === String(actor) && type !== "login_alert") return null;

    const [target, actorDoc] = await Promise.all([
      User.findById(recipient)
        .select("notificationPrefs blockedUsers mutedNotificationsFrom fcm_tokens fcm_token").lean(),
      User.findById(actor).select("name image").lean(),
    ]);
    if (!target || !actorDoc) return null;

    // A blocked actor cannot reach the recipient's notification list.
    if ((target.blockedUsers || []).some((b) => String(b) === String(actor))) return null;

    /*
      A muted account reaches the recipient with nothing at all — no record and
      no push. Unlike blocking, the relationship is untouched: their posts and
      messages still arrive, only the notifications stop.
    */
    if ((target.mutedNotificationsFrom || []).some((m) => String(m) === String(actor))) return null;

    const prefs = target.notificationPrefs || {};
    const on = (k, d = true) => (prefs[k] === undefined ? d : prefs[k]);
    if (!on("inApp")) return null;
    if (!on(PREF_OF[type])) return null;

    const record = await Notification.findOneAndUpdate(
      { recipient, actor, type, post, commentId },
      {
        $set: {
          preview: truncate(preview),
          reactionType,
          thumbnail,
          group,
          read: false,
          readAt: null,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    /*
      Quiet hours gate the push and nothing else — the record above is already
      written, so the list still fills while the phone stays silent. A security
      alert ignores them: the whole point of that notification is to arrive at
      the moment it matters, which is exactly when someone is asleep.
    */
    const quiet = type !== "login_alert" && inQuietHours(prefs);

    if (on("push") && !quiet) {
      const { title, body } = copyFor(type, actorDoc.name || "Someone", { preview, reactionType });
      const sent = await sendNotificationToUser(recipient, {
        title,
        body,
        data: {
          notificationId: record._id,
          type,
          actorId: actor,
          actorName: actorDoc.name || "",
          postId: post || "",
          commentId: commentId || "",
          groupId: group || "",
        },
      });
      if (sent) await Notification.updateOne({ _id: record._id }, { $set: { pushed: true } });
    }

    return record;
  } catch (err) {
    // Deliberately swallowed — see the block comment above.
    console.error("[notify]", type, err.message);
    return null;
  }
};

/* Fan-out helper for mentions, where one action notifies several people. */
export const notifyMany = async (recipients = [], payload) =>
  Promise.all([...new Set(recipients.map(String))].map((r) => notify({ ...payload, recipient: r })));
