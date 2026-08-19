/*
  Block & Report — mobile-facing API.
  Sheet rows: "Block & Report Users" / "Block & Report a User" / "Report a Post".

  Blocking is stored on the blocker's own document (users.blockedUsers) and is
  enforced symmetrically by helpers/privacy.js: once either side blocks, neither
  sees the other. Reports land in the same moderation queue the admin panel reads.
*/

import mongoose from "mongoose";
import User from "../models/users.js";
import Report from "../models/Report.js";
import Reels from "../models/Reels.js";
import LoginEvent from "../models/LoginEvent.js";
import { hiddenUserIds, isBlockedEither, isId } from "../helpers/privacy.js";
import { isRestrictedBy, oid, sameId } from "../helpers/safety.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[safety]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId;

/* ------------------------------------------------------------------ */
/* blocking                                                            */
/* ------------------------------------------------------------------ */

/*
  Blocking is a hard severance, not just a mute: any follow relationship in
  either direction is torn down, pending requests are cancelled, and the
  blocked user drops off the close-friends list.
*/
export const blockUser = wrap(async (req, res) => {
  const userId = actorId(req);
  const targetId = req.body?.targetId || req.body?.blockUserId;

  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");
  if (String(userId) === String(targetId)) return fail(res, 400, "You cannot block yourself");

  const target = await User.findById(targetId).select("name").lean();
  if (!target) return fail(res, 404, "User not found");

  await User.findByIdAndUpdate(userId, {
    $addToSet: { blockedUsers: targetId },
    $pull: {
      followers: targetId,
      following: targetId,
      followRequests: targetId,
      sentFollowRequests: targetId,
      closeFriends: targetId,
    },
  });

  await User.findByIdAndUpdate(targetId, {
    $pull: {
      followers: userId,
      following: userId,
      followRequests: userId,
      sentFollowRequests: userId,
      closeFriends: userId,
    },
  });

  ok(res, { blocked: true, message: `${target.name || "User"} blocked` });
});

export const unblockUser = wrap(async (req, res) => {
  const userId = actorId(req);
  const targetId = req.body?.targetId || req.body?.blockUserId;

  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");

  await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetId } });
  ok(res, { blocked: false, message: "User unblocked" });
});

export const listBlocked = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId)
    .populate("blockedUsers", "name image verifiedBadge")
    .select("blockedUsers")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { rows: user.blockedUsers || [], total: (user.blockedUsers || []).length });
});

/*
  Which way round the block runs matters to the UI: "you blocked them" shows an
  Unblock button, "they blocked you" shows nothing at all.
*/
export const blockStatus = wrap(async (req, res) => {
  const userId = actorId(req);
  const { targetId } = req.query;
  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");

  const [me, them] = await Promise.all([
    User.findById(userId).select("blockedUsers").lean(),
    User.findById(targetId).select("blockedUsers").lean(),
  ]);
  if (!them) return fail(res, 404, "User not found");

  const iBlockedThem = (me?.blockedUsers || []).some((x) => String(x) === String(targetId));
  const theyBlockedMe = (them?.blockedUsers || []).some((x) => String(x) === String(userId));

  ok(res, {
    iBlockedThem,
    theyBlockedMe,
    blocked: iBlockedThem || theyBlockedMe,
    canInteract: !iBlockedThem && !theyBlockedMe,
  });
});

/*
  Ids the app should filter out of any list it renders locally — useful for
  screens that cache feed data client-side.
*/
export const blockedIds = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const ids = await hiddenUserIds(userId);
  ok(res, { ids: ids.map(String), total: ids.length });
});

/* ------------------------------------------------------------------ */
/* reporting                                                           */
/* ------------------------------------------------------------------ */

const TARGET_TYPES = ["post", "reel", "story", "comment", "user", "group", "livestream", "message"];

// Shown in the report sheet so the app doesn't hard-code its own list.
const REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "nudity", label: "Nudity or sexual content" },
  { id: "hate", label: "Hate speech or symbols" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "harassment", label: "Bullying or harassment" },
  { id: "false_info", label: "False information" },
  { id: "scam", label: "Scam or fraud" },
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "self_harm", label: "Suicide or self-injury" },
  { id: "illegal", label: "Sale of illegal or regulated goods" },
  { id: "intellectual_property", label: "Intellectual property violation" },
  { id: "other", label: "Something else" },
];

export const reportReasons = wrap(async (req, res) =>
  ok(res, { reasons: REASONS, targetTypes: TARGET_TYPES })
);

export const submitReport = wrap(async (req, res) => {
  const reporter = actorId(req);
  const { targetType, targetId, reason, details, block } = req.body || {};

  if (!isId(reporter)) return fail(res, 400, "A valid userId is required");
  if (!TARGET_TYPES.includes(targetType)) {
    return fail(res, 400, `targetType must be one of: ${TARGET_TYPES.join(", ")}`);
  }
  if (!isId(targetId)) return fail(res, 400, "A valid targetId is required");
  if (!reason) return fail(res, 400, "reason is required");
  if (targetType === "user" && String(reporter) === String(targetId)) {
    return fail(res, 400, "You cannot report yourself");
  }

  // Work out who owns the reported thing, so moderators can act on the account
  let targetUser = req.body?.targetUser;
  if (!isId(targetUser)) {
    if (targetType === "user") {
      targetUser = targetId;
    } else if (["post", "reel", "story"].includes(targetType)) {
      const content = await Reels.findById(targetId).select("username").lean();
      if (!content) return fail(res, 404, "That content no longer exists");
      targetUser = content.username;
    } else if (targetType === "comment") {
      const parent = await Reels.findOne({ "comments._id": targetId })
        .select("comments.$")
        .lean();
      targetUser = parent?.comments?.[0]?.username;
    }
  }

  // One open report per user per item — repeat taps shouldn't flood the queue
  const existing = await Report.findOne({
    reporter,
    targetType,
    targetId,
    status: { $in: ["pending", "reviewing"] },
  });

  if (existing) {
    return ok(res, {
      report: existing,
      duplicate: true,
      message: "You've already reported this. Our team is reviewing it.",
    });
  }

  const report = await Report.create({
    reporter,
    targetType,
    targetId,
    targetUser: isId(targetUser) ? targetUser : undefined,
    reason,
    details,
  });

  // The report sheet usually offers "also block this person"
  let blocked = false;
  if (block && isId(targetUser) && String(targetUser) !== String(reporter)) {
    await User.findByIdAndUpdate(reporter, {
      $addToSet: { blockedUsers: targetUser },
      $pull: {
        followers: targetUser, following: targetUser,
        followRequests: targetUser, sentFollowRequests: targetUser,
        closeFriends: targetUser,
      },
    });
    await User.findByIdAndUpdate(targetUser, {
      $pull: {
        followers: reporter, following: reporter,
        followRequests: reporter, sentFollowRequests: reporter,
        closeFriends: reporter,
      },
    });
    blocked = true;
  }

  ok(res, {
    report,
    blocked,
    message: "Thanks — our team will review this.",
  });
});

export const myReports = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const [rows, total] = await Promise.all([
    Report.find({ reporter: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("targetUser", "name image")
      .select("targetType targetId targetUser reason status createdAt reviewedAt")
      .lean(),
    Report.countDocuments({ reporter: userId }),
  ]);

  ok(res, { rows, total, page, limit });
});

// Has this user already reported this item? Lets the app grey out the button.
export const reportStatus = wrap(async (req, res) => {
  const userId = actorId(req);
  const { targetId } = req.query;
  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");

  const report = await Report.findOne({ reporter: userId, targetId })
    .select("status createdAt")
    .lean();

  ok(res, { reported: !!report, status: report?.status || null, reportedAt: report?.createdAt || null });
});

/* Re-exported so other controllers can gate interactions on a block. */
export { isBlockedEither };

/* ================================================================== */
/* Restrict a User (limit interactions)                                */
/* ================================================================== */

/*
  Restricting is the quiet alternative to blocking.

  A block is mutual and unmistakable — the other person can tell. Restricting is
  one-directional and deliberately invisible: they keep commenting and messaging
  as though nothing happened, while their comments on your posts wait for your
  approval, their messages arrive as requests, and they stop seeing your online
  status and read receipts.

  Nothing in any response to the restricted person may reveal it, which is why
  the checks below shape responses rather than refusing them.
*/
export const restrictUser = wrap(async (req, res) => {
  const userId = actorId(req);
  const { targetId } = req.body || {};

  if (!isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid userId and targetId are required");
  }
  if (sameId(userId, targetId)) return fail(res, 400, "You cannot restrict yourself");

  const target = await User.findById(targetId).select("name image").lean();
  if (!target) return fail(res, 404, "That user does not exist");

  const me = await User.findById(userId).select("restrictedUsers").lean();
  if ((me?.restrictedUsers || []).some((r) => sameId(r, targetId))) {
    return fail(res, 409, "That account is already restricted");
  }

  await User.updateOne({ _id: oid(userId) }, { $addToSet: { restrictedUsers: oid(targetId) } });

  /*
    No notification, by design. Telling someone they have been restricted turns
    it into a block with extra steps, and the point of the feature is that they
    cannot tell.
  */
  ok(res, {
    message: `${target.name || "That account"} is restricted`,
    restricted: true,
    targetId,
  });
});

export const unrestrictUser = wrap(async (req, res) => {
  const userId = actorId(req);
  const { targetId } = req.body || {};
  if (!isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid userId and targetId are required");
  }

  const r = await User.updateOne({ _id: oid(userId) }, { $pull: { restrictedUsers: oid(targetId) } });
  if (!r.modifiedCount) return fail(res, 404, "That account is not restricted");

  ok(res, { message: "Restriction removed", restricted: false, targetId });
});

export const listRestricted = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId)
    .select("restrictedUsers")
    .populate("restrictedUsers", "name image verifiedBadge").lean();
  if (!me) return fail(res, 404, "User not found");

  ok(res, {
    total: (me.restrictedUsers || []).length,
    restricted: me.restrictedUsers || [],
  });
});

/*
  Whether the caller has restricted someone.

  Only ever answers about the caller's own list. Asking "has X restricted me?"
  is exactly the question the feature must not answer, so there is no parameter
  ordering that lets anyone ask it.
*/
export const restrictStatus = wrap(async (req, res) => {
  const userId = actorId(req);
  const { targetId } = req.params;
  if (!isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid userId and targetId are required");
  }

  ok(res, { restricted: await isRestrictedBy(userId, targetId), targetId });
});

/*
  The comments held back by a restriction.

  A restricted person's comment is visible to them — so they have no signal that
  anything is wrong — and to nobody else until the post's author approves it.
  This is the author's queue of those.
*/
export const pendingRestrictedComments = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("restrictedUsers").lean();
  const restricted = (me?.restrictedUsers || []).map(String);
  if (!restricted.length) return ok(res, { total: 0, comments: [] });

  const posts = await Reels.find({ username: oid(userId), "comments.0": { $exists: true } })
    .select("comments videoTitle media").lean();

  const rows = [];
  for (const post of posts) {
    for (const c of post.comments || []) {
      if (!restricted.includes(String(c.username))) continue;
      if (c.restrictedApproved) continue;
      if (c.deleted) continue;
      rows.push({
        postId: post._id,
        commentId: c._id,
        text: c.message || "",
        author: c.username,
        createdAt: c.timestamp,
      });
    }
  }

  rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  ok(res, { total: rows.length, comments: rows });
});

/* Approve a held comment so everyone can see it, or delete it outright. */
export const decideRestrictedComment = wrap(async (req, res) => {
  const userId = actorId(req);
  const { postId, commentId } = req.body || {};
  const action = String(req.body?.action || "").toLowerCase();

  if (!isId(userId) || !isId(postId) || !isId(commentId)) {
    return fail(res, 400, "Valid userId, postId and commentId are required");
  }
  if (!["approve", "delete"].includes(action)) {
    return fail(res, 400, "action must be approve or delete");
  }

  // The post author is `username` on this model, not `userid`.
  const post = await Reels.findById(postId).select("username comments").lean();
  if (!post) return fail(res, 404, "Post not found");
  if (!sameId(post.username, userId)) return fail(res, 403, "That is not your post");

  const comment = (post.comments || []).find((c) => sameId(c._id, commentId));
  if (!comment) return fail(res, 404, "Comment not found");

  if (action === "approve") {
    await Reels.updateOne(
      { _id: oid(postId), "comments._id": oid(commentId) },
      { $set: { "comments.$.restrictedApproved": true } }
    );
    return ok(res, { message: "Comment approved", commentId });
  }

  await Reels.updateOne(
    { _id: oid(postId), "comments._id": oid(commentId) },
    { $set: { "comments.$.deleted": true, "comments.$.deletedAt": new Date() } }
  );
  ok(res, { message: "Comment deleted", commentId });
});

/* ================================================================== */
/* Hide a Post                                                         */
/* ================================================================== */

/*
  Hide one post from your own feed.

  Not the same thing as the admin `status: "hidden"`, which removes a post for
  everybody. This is per-viewer: nobody else's feed changes, and the author is
  not told, because "not interested" is a signal about the viewer rather than a
  judgement anyone else needs.
*/
export const hidePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { postId } = req.body || {};
  if (!isId(userId) || !isId(postId)) {
    return fail(res, 400, "Valid userId and postId are required");
  }

  const post = await Reels.findById(postId).select("_id").lean();
  if (!post) return fail(res, 404, "Post not found");

  const me = await User.findById(userId).select("hiddenPosts").lean();
  if ((me?.hiddenPosts || []).some((p) => sameId(p, postId))) {
    return fail(res, 409, "That post is already hidden");
  }

  await User.updateOne({ _id: oid(userId) }, { $addToSet: { hiddenPosts: oid(postId) } });
  ok(res, { message: "Hidden from your feed", postId, hidden: true });
});

export const unhidePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { postId } = req.body || {};
  if (!isId(userId) || !isId(postId)) {
    return fail(res, 400, "Valid userId and postId are required");
  }

  const r = await User.updateOne({ _id: oid(userId) }, { $pull: { hiddenPosts: oid(postId) } });
  if (!r.modifiedCount) return fail(res, 404, "That post is not hidden");

  ok(res, { message: "Unhidden", postId, hidden: false });
});

export const listHiddenPosts = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("hiddenPosts").lean();
  const ids = me?.hiddenPosts || [];
  if (!ids.length) return ok(res, { total: 0, posts: [] });

  const posts = await Reels.find({ _id: { $in: ids } })
    .select("videoTitle media username xtime")
    .populate("username", "name image").lean();

  ok(res, { total: posts.length, posts });
});

/* ================================================================== */
/* Login Alerts                                                        */
/* ================================================================== */

/*
  Where this account has been signed in from.

  The records are written by issueSession — the single place a session is minted
  — so this covers password logins, Google sign-in, mobile verification and the
  two-factor exchange alike, rather than only the one endpoint someone
  remembered to instrument.
*/
export const loginHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const [rows, total, devices] = await Promise.all([
    LoginEvent.find({ user: oid(userId) }).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    LoginEvent.countDocuments({ user: oid(userId) }),
    LoginEvent.aggregate([
      { $match: { user: oid(userId) } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$fingerprint",
        lastSeen: { $first: "$createdAt" },
        platform: { $first: "$platform" },
        deviceName: { $first: "$deviceName" },
        userAgent: { $first: "$userAgent" },
        ip: { $first: "$ip" },
        trusted: { $max: "$trusted" },
        signIns: { $sum: 1 },
      } },
      { $sort: { lastSeen: -1 } },
    ]),
  ]);

  ok(res, {
    page, limit, total,
    devices: devices.map((d) => ({
      fingerprint: d._id,
      deviceName: d.deviceName || d.platform || "Unknown device",
      platform: d.platform,
      userAgent: d.userAgent,
      ip: d.ip,
      trusted: !!d.trusted,
      signIns: d.signIns,
      lastSeen: d.lastSeen,
    })),
    history: rows,
  });
});

/*
  Mark a device as yours, so it stops raising alerts — or withdraw that.

  Trust is stamped across every record sharing the fingerprint rather than only
  the newest, so the device reads as trusted throughout the history instead of
  looking trusted once and unfamiliar everywhere else.
*/
export const trustDevice = wrap(async (req, res) => {
  const userId = actorId(req);
  const { fingerprint } = req.body || {};
  const trusted = req.body?.trusted !== false;
  if (!isId(userId) || !fingerprint) {
    return fail(res, 400, "A valid userId and fingerprint are required");
  }

  const r = await LoginEvent.updateMany(
    { user: oid(userId), fingerprint: String(fingerprint) },
    { $set: { trusted } }
  );
  if (!r.matchedCount) return fail(res, 404, "No sign-in from that device");

  ok(res, {
    message: trusted ? "Device trusted" : "Device no longer trusted",
    fingerprint, trusted,
  });
});
