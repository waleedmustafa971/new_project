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
  live_gift: "live",
  group_request: "groups",
  group_approved: "groups",
  group_invite: "groups",
  group_role: "groups",
  group_post: "groups",
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
    // Never notify someone about their own action.
    if (String(recipient) === String(actor)) return null;

    const [target, actorDoc] = await Promise.all([
      User.findById(recipient).select("notificationPrefs blockedUsers fcm_tokens fcm_token").lean(),
      User.findById(actor).select("name image").lean(),
    ]);
    if (!target || !actorDoc) return null;

    // A blocked actor cannot reach the recipient's notification list.
    if ((target.blockedUsers || []).some((b) => String(b) === String(actor))) return null;

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

    if (on("push")) {
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
