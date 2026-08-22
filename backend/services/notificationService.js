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
import { getIO } from "../socket/socket.js";
import { t, DEFAULT_LANGUAGE, normaliseLanguage } from "../helpers/i18n.js";

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

/*
  Push copy, composed in the recipient's language.

  This is the one place the server writes a sentence a person reads. The body of
  a push arrives while the app is closed, so nothing on the device can translate
  it afterwards — it has to be built in their language here, at send time.

  Every string goes through `t()` with named placeholders rather than being
  concatenated, because Arabic puts the actor's name in a different position
  than English does. A sentence assembled with `${actor} + verb` can only ever
  come out in English word order, which is how apps end up "translated" and
  still reading as English.
*/
const REACTION_KEY = {
  like: "notif.like", love: "notif.love", haha: "notif.haha",
  wow: "notif.wow", sad: "notif.sad", angry: "notif.angry",
};

export const copyFor = (type, actorName, extra = {}, lang = DEFAULT_LANGUAGE) => {
  const s = (key, vars) => t(key, lang, { actor: actorName, ...vars });
  const fallback = (key) => t(key, lang);

  switch (type) {
    case "like":
      return { title: actorName, body: s(REACTION_KEY[extra.reactionType] || "notif.like") };
    case "comment":
      return { title: actorName, body: s("notif.comment", { preview: extra.preview || "" }).trim() };
    case "reply":
      return { title: actorName, body: s("notif.reply", { preview: extra.preview || "" }).trim() };
    case "comment_like":
      return { title: actorName, body: s("notif.comment_like") };
    case "mention_post":
      return { title: actorName, body: s("notif.mention_post") };
    case "mention_comment":
      return { title: actorName, body: s("notif.mention_comment") };
    case "mention_story":
      return { title: actorName, body: s("notif.mention_story") };
    case "tag":
      return { title: actorName, body: s("notif.tag") };
    case "follow":
      return { title: actorName, body: s("notif.follow") };
    case "share":
      return { title: actorName, body: s("notif.share") };
    case "story_view":
      return { title: actorName, body: s("notif.story_view") };
    case "page_post":
      return { title: actorName, body: s("notif.page_post") };
    case "story_response":
      return { title: actorName, body: s("notif.story_response", { preview: extra.preview || fallback("notif.fallback.sticker") }) };

    /*
      A message body is the message itself, and a live request or gift carries
      copy the caller composed. Those are already in whatever language the
      sender typed, so they are passed through rather than translated — the one
      thing worse than an untranslated string is a translated quotation.
    */
    case "message":
      return { title: actorName, body: extra.preview || s("notif.message") };
    case "live_request":
      return { title: actorName, body: extra.preview ? `${actorName} ${extra.preview}` : s("notif.live_request") };
    case "live_invite":
      return { title: actorName, body: extra.preview ? `${actorName} ${extra.preview}` : s("notif.live_invite") };
    case "live_gift":
      return { title: actorName, body: extra.preview ? `${actorName} ${extra.preview}` : s("notif.live_gift") };
    case "subscription":
      return { title: fallback("notif.title.subscription"), body: extra.preview ? `${actorName} ${extra.preview}` : s("notif.subscription") };

    case "login_alert":
      return {
        title: fallback("notif.title.login_alert"),
        body: s("notif.login_alert", { preview: extra.preview || fallback("notif.fallback.new_device") }),
      };

    /* Groups & Community — `preview` carries the group name from the caller. */
    case "group_request":
      return { title: fallback("notif.title.group_request"), body: s("notif.group_request", { preview: extra.preview || fallback("notif.fallback.group") }) };
    case "group_approved":
      return { title: fallback("notif.title.group_approved"), body: s("notif.group_approved", { preview: extra.preview || fallback("notif.fallback.the_group") }) };
    case "group_invite":
      return { title: fallback("notif.title.group_invite"), body: s("notif.group_invite", { preview: extra.preview || fallback("notif.fallback.a_group") }) };
    case "group_role":
      return { title: fallback("notif.title.group_role"), body: extra.preview || s("notif.group_role") };
    case "group_post":
      return { title: actorName, body: extra.preview || fallback("notif.group_post") };
    default:
      return { title: actorName, body: fallback("notif.default") };
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
        .select("notificationPrefs blockedUsers mutedNotificationsFrom fcm_tokens fcm_token appearance").lean(),
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
      Deliver it live to anyone connected.

      The record was written and a push was attempted, and that was the whole
      of delivery — nothing was ever emitted over the socket. So a notification
      for someone sitting in the app arrived only when they navigated to the
      notification list and it re-fetched, which is why everything felt
      delayed: the data was there instantly and nobody was told.

      Push does not cover this case either. It is gated on the `push`
      preference and on quiet hours, it needs Firebase credentials, and on
      Android a foreground push is a different path again. The socket is the
      one channel that is already open, already addressed to this person's
      room, and free.

      Wrapped because notification delivery must never be the reason an action
      fails — the same rule the rest of this function follows. getIO() throws
      when no server is registered, which is the case in scripts and tests.
    */
    try {
      getIO().to(String(recipient)).emit("notification", {
        _id: record._id,
        type,
        read: false,
        createdAt: record.createdAt,
        preview: record.preview,
        reactionType,
        thumbnail,
        post: post || null,
        commentId: commentId || null,
        group: group || null,
        actor: { _id: actor, name: actorDoc.name || "", image: actorDoc.image || "" },
      });
    } catch (err) {
      // No socket server in this process, or nobody in the room. Neither is
      // an error: the record is written and the list will show it.
    }

    /*
      Quiet hours gate the push and nothing else — the record above is already
      written, so the list still fills while the phone stays silent. A security
      alert ignores them: the whole point of that notification is to arrive at
      the moment it matters, which is exactly when someone is asleep.
    */
    const quiet = type !== "login_alert" && inQuietHours(prefs);

    if (on("push") && !quiet) {
      // Their language, not the server's. An account that never chose one gets
      // the default rather than whatever the last request happened to carry.
      const lang = normaliseLanguage(target.appearance?.language) || DEFAULT_LANGUAGE;
      const { title, body } = copyFor(type, actorDoc.name || "Someone", { preview, reactionType }, lang);
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
