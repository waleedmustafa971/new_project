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
import { hiddenUserIds, isBlockedEither, isId } from "../helpers/privacy.js";

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
