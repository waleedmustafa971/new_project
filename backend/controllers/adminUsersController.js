/*
  Admin Screen — Manage All Users.

  The panel already had list / view / edit / moderate / coins / delete. What it
  did not have is what makes those safe to hand to a moderation team:

    Enforcement ..... a ban did nothing — accountStatus was written and never
                      read. helpers/accountStatus.js now gates every session,
                      and suspensions lapse instead of lasting forever.
    Audit trail ..... every action below writes an AdminLog row: who, what,
                      before, after, why.
    Bulk actions .... ban / suspend / activate / verify / delete over a
                      selection, which is the whole point of a "manage all"
                      screen.
    Safe delete ..... soft by default and reversible; a hard delete cascades
                      instead of leaving orphaned posts, follows and reports.
    Export .......... CSV of the current filter.
    Credentials ..... password reset and session revocation.

  The original handlers in adminPanelController.js are left in place so the
  existing panel keeps working; these are additive and mounted alongside them.
*/

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/users.js";
import Reels from "../models/Reels.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import AdminLog from "../models/AdminLog.js";
import GiftTransaction from "../models/GiftTransaction.js";
import LiveStream from "../models/LiveStream.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[admin-users]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const paging = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

/*
  Write the audit row. Never allowed to fail the action it is recording — a
  logging problem must not leave a user half-banned — but it is logged loudly,
  because a silent gap in an audit trail is worse than a noisy one.
*/
const audit = async (req, entry) => {
  try {
    await AdminLog.create({
      admin: req.admin?._id,
      adminName: req.admin?.name || req.admin?.email,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      ...entry,
    });
  } catch (err) {
    console.error("[admin-audit] FAILED to record", entry.action, err.message);
  }
};

const SORTS = {
  newest: { enteredby: -1 },
  oldest: { enteredby: 1 },
  name: { name: 1 },
  coins: { coins: -1 },
  followers: { followersCount: -1 },
};

const USER_FIELDS =
  "name firstname lastname email mobileno image bio gender coins accountStatus " +
  "suspendedUntil moderationNote verifiedBadge accountType privacy enteredby " +
  "updateby followers following regby deletedAt";

const shapeUser = (u) => ({
  ...u,
  followers: Array.isArray(u.followers) ? u.followers.length : u.followers || 0,
  following: Array.isArray(u.following) ? u.following.length : u.following || 0,
});

/* ------------------------------------------------------------------ */
/* list, filter, sort, export                                          */
/* ------------------------------------------------------------------ */

const buildFilter = (q) => {
  const filter = {};

  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }, { mobileno: rx }, { firstname: rx }, { lastname: rx }];
  }
  if (q.status) filter.accountStatus = q.status;
  if (q.verified === "yes") filter.verifiedBadge = true;
  if (q.verified === "no") filter.verifiedBadge = { $ne: true };
  if (q.accountType) filter.accountType = q.accountType;
  if (q.privacy) filter.privacy = q.privacy;
  if (q.regby) filter.regby = q.regby;

  // Deleted accounts are hidden unless asked for, so the default view is the
  // live user base rather than everything that ever existed.
  if (q.deleted === "only") filter.accountStatus = "deleted";
  else if (q.deleted !== "include") filter.accountStatus = filter.accountStatus || { $ne: "deleted" };

  const from = q.from ? new Date(q.from) : null;
  const to = q.to ? new Date(q.to) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    filter.enteredby = {};
    if (from && !isNaN(from)) filter.enteredby.$gte = from;
    // An inclusive end date means "up to the end of that day".
    if (to && !isNaN(to)) filter.enteredby.$lte = new Date(to.getTime() + 86400000 - 1);
  }

  const minCoins = q.minCoins !== undefined ? Number(q.minCoins) : null;
  const maxCoins = q.maxCoins !== undefined ? Number(q.maxCoins) : null;
  if (Number.isFinite(minCoins) || Number.isFinite(maxCoins)) {
    filter.coins = {};
    if (Number.isFinite(minCoins)) filter.coins.$gte = minCoins;
    if (Number.isFinite(maxCoins)) filter.coins.$lte = maxCoins;
  }

  return filter;
};

export const listUsers = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = buildFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.newest;

  // Sorting by follower count needs the array length, which only exists after
  // a projection — so that one sort goes through the aggregation pipeline.
  if (req.query.sort === "followers") {
    const pipeline = [
      { $match: filter },
      { $addFields: { followersCount: { $size: { $ifNull: ["$followers", []] } } } },
      { $sort: { followersCount: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { password: 0 } },
    ];
    const [rows, total] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments(filter),
    ]);
    return ok(res, { rows: rows.map(shapeUser), total, page, limit, sort: "followers" });
  }

  const [rows, total, counts] = await Promise.all([
    User.find(filter).select(USER_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
    // Status tallies for the filter chips, over the whole base rather than the page.
    User.aggregate([{ $group: { _id: "$accountStatus", n: { $sum: 1 } } }]),
  ]);

  const byStatus = { active: 0, suspended: 0, banned: 0, deleted: 0 };
  for (const c of counts) byStatus[c._id || "active"] = c.n;

  ok(res, {
    rows: rows.map(shapeUser),
    total, page, limit,
    sort: req.query.sort || "newest",
    counts: byStatus,
  });
});

/* CSV of everything the current filter matches, not just the visible page. */
export const exportUsers = wrap(async (req, res) => {
  const filter = buildFilter(req.query);
  const cap = Math.min(parseInt(req.query.max, 10) || 5000, 20000);

  const rows = await User.find(filter)
    .select(USER_FIELDS).sort(SORTS[req.query.sort] || SORTS.newest).limit(cap).lean();

  const cols = [
    "_id", "name", "email", "mobileno", "accountStatus", "suspendedUntil",
    "verifiedBadge", "accountType", "privacy", "coins", "followers", "following",
    "regby", "enteredby", "moderationNote",
  ];

  // A field starting with = + - @ is executed as a formula by spreadsheet
  // software, so it is prefixed before quoting.
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    let s = v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csv = [
    cols.join(","),
    ...rows.map((u) => {
      const s = shapeUser(u);
      return cols.map((c) => cell(s[c])).join(",");
    }),
  ].join("\r\n");

  await audit(req, { action: "user.bulk", targetCount: rows.length, reason: "CSV export" });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
  // BOM so Excel reads the UTF-8 names correctly instead of mangling them.
  res.send("﻿" + csv);
});

/* ------------------------------------------------------------------ */
/* single user: full picture + drill-downs                             */
/* ------------------------------------------------------------------ */

export const getUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const user = await User.findById(id).select("-password").lean();
  if (!user) return fail(res, 404, "User not found");

  const [content, live, reports, received, sent, recentActions] = await Promise.all([
    Reels.countDocuments({ username: oid(id) }),
    LiveStream.countDocuments({ hoster: oid(id) }),
    Report.countDocuments({ targetUser: oid(id) }),
    GiftTransaction.aggregate([
      { $match: { receiver: oid(id) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, n: { $sum: 1 } } },
    ]),
    GiftTransaction.aggregate([
      { $match: { sender: oid(id) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, n: { $sum: 1 } } },
    ]),
    AdminLog.find({ targetUser: oid(id) }).sort({ createdAt: -1 }).limit(10)
      .populate("admin", "name email").lean(),
  ]);

  ok(res, {
    user: {
      ...user,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      followers: undefined,
      following: undefined,
    },
    stats: {
      contentCount: content,
      liveCount: live,
      reportsAgainst: reports,
      giftCoinsReceived: received[0]?.coins || 0,
      giftCoinsSent: sent[0]?.coins || 0,
      devices: (user.fcm_tokens || []).length,
    },
    // The moderation history for this account, newest first.
    history: recentActions,
  });
});

export const userContent = wrap(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = paging(req);
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const filter = { username: oid(id) };
  if (req.query.type) filter.posttype = new RegExp(`^${escapeRegex(req.query.type)}$`, "i");

  const [rows, total] = await Promise.all([
    Reels.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit)
      .select("videoTitle posttype media videoUrl xtime status status_draft_publish likes comments").lean(),
    Reels.countDocuments(filter),
  ]);

  ok(res, {
    page, limit, total,
    rows: rows.map((r) => ({
      _id: r._id,
      caption: r.videoTitle,
      posttype: r.posttype,
      media: r.media?.[0]?.url || (typeof r.videoUrl === "object" ? r.videoUrl?.url : r.videoUrl),
      status: r.status,
      draft: r.status_draft_publish === "Draft",
      likes: (r.likes || []).length,
      comments: (r.comments || []).length,
      xtime: r.xtime,
    })),
  });
});

export const userReports = wrap(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = paging(req);
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const filter = { targetUser: oid(id) };
  const [rows, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("reporter", "name email image").lean(),
    Report.countDocuments(filter),
  ]);

  ok(res, { page, limit, total, rows });
});

/* ------------------------------------------------------------------ */
/* moderation                                                          */
/* ------------------------------------------------------------------ */

const applyModeration = (action, { days, note }) => {
  if (action === "ban") {
    return { accountStatus: "banned", suspendedUntil: null, moderationNote: note || "" };
  }
  if (action === "suspend") {
    const d = Math.min(Math.max(parseInt(days, 10) || 7, 1), 3650);
    return {
      accountStatus: "suspended",
      suspendedUntil: new Date(Date.now() + d * 86400000),
      moderationNote: note || "",
    };
  }
  if (action === "activate") {
    return { accountStatus: "active", suspendedUntil: null, moderationNote: note || "" };
  }
  return null;
};

export const moderateUser = wrap(async (req, res) => {
  const { id } = req.params;
  const { action, days, note } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const update = applyModeration(action, { days, note });
  if (!update) return fail(res, 400, "action must be ban, suspend or activate");

  const before = await User.findById(id)
    .select("name email accountStatus suspendedUntil moderationNote").lean();
  if (!before) return fail(res, 404, "User not found");

  const user = await User.findByIdAndUpdate(id, { ...update, updateby: new Date() }, { new: true })
    .select("name email accountStatus suspendedUntil moderationNote").lean();

  /*
    Banning has to end the session as well as mark the account. Access tokens
    stay valid until they expire, so the device tokens are cleared too — that
    stops push reaching a banned account in the meantime, and the refresh call
    is refused by helpers/accountStatus.js.
  */
  if (action === "ban") {
    await User.updateOne({ _id: id }, { $set: { fcm_tokens: [] }, $unset: { fcm_token: "" } });
  }

  await audit(req, {
    action: `user.${action}`,
    targetUser: oid(id),
    targetName: before.name,
    reason: note,
    before: { accountStatus: before.accountStatus, suspendedUntil: before.suspendedUntil },
    after: { accountStatus: user.accountStatus, suspendedUntil: user.suspendedUntil },
  });

  const said = { ban: "banned", suspend: "suspended", activate: "reactivated" }[action];
  ok(res, { message: `User ${said}`, user });
});

export const setVerified = wrap(async (req, res) => {
  const { id } = req.params;
  const verified = req.body?.verified !== false;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const before = await User.findById(id).select("name verifiedBadge").lean();
  if (!before) return fail(res, 404, "User not found");

  const user = await User.findByIdAndUpdate(
    id, { verifiedBadge: verified, updateby: new Date() }, { new: true }
  ).select("name email verifiedBadge").lean();

  await audit(req, {
    action: verified ? "user.verify" : "user.unverify",
    targetUser: oid(id), targetName: before.name, reason: req.body?.reason,
    before: { verifiedBadge: !!before.verifiedBadge },
    after: { verifiedBadge: verified },
  });

  ok(res, { message: verified ? "Badge granted" : "Badge removed", user });
});

/*
  Coin adjustment as a single conditional update. The original read the balance,
  added to it and saved, so two adjustments running together could both read the
  same starting figure and one would be lost.
*/
export const adjustCoins = wrap(async (req, res) => {
  const { id } = req.params;
  const amount = parseInt(req.body?.amount, 10);
  const reason = req.body?.reason;

  if (!isId(id)) return fail(res, 400, "Invalid user id");
  if (!Number.isFinite(amount) || amount === 0) return fail(res, 400, "amount must be a non-zero number");

  const before = await User.findById(id).select("name coins").lean();
  if (!before) return fail(res, 404, "User not found");

  const guard = amount < 0 ? { coins: { $gte: Math.abs(amount) } } : {};
  const r = await User.updateOne({ _id: oid(id), ...guard }, { $inc: { coins: amount } });
  if (r.matchedCount === 0) {
    return fail(res, 400, `User only has ${before.coins || 0} coins`);
  }

  const after = await User.findById(id).select("coins").lean();

  await audit(req, {
    action: "user.coins",
    targetUser: oid(id), targetName: before.name, reason,
    before: { coins: before.coins || 0 },
    after: { coins: after.coins, delta: amount },
  });

  ok(res, { message: `${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} coins`, coins: after.coins });
});

export const updateUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const allowed = [
    "name", "firstname", "lastname", "bio", "gender", "mobileno",
    "accountType", "privacy", "nationality", "interest",
  ];
  const update = { updateby: new Date() };
  const changed = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) { update[key] = req.body[key]; changed[key] = req.body[key]; }
  }
  if (Object.keys(changed).length === 0) return fail(res, 400, "Nothing to update");

  const before = await User.findById(id).select(allowed.join(" ")).lean();
  if (!before) return fail(res, 404, "User not found");

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-password").lean();

  await audit(req, {
    action: "user.update",
    targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
    before: Object.fromEntries(Object.keys(changed).map((k) => [k, before[k]])),
    after: changed,
  });

  ok(res, { message: "User updated", user });
});

/* ------------------------------------------------------------------ */
/* credentials                                                         */
/* ------------------------------------------------------------------ */

export const resetPassword = wrap(async (req, res) => {
  const { id } = req.params;
  const password = String(req.body?.password || "");
  if (!isId(id)) return fail(res, 400, "Invalid user id");
  if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters");

  const user = await User.findById(id).select("name email").lean();
  if (!user) return fail(res, 404, "User not found");

  await User.updateOne({ _id: oid(id) }, {
    $set: { password: await bcrypt.hash(password, 10), updateby: new Date() },
  });

  await audit(req, {
    action: "user.password_reset",
    targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
    // Never record the password itself, in either direction.
    after: { passwordChanged: true },
  });

  ok(res, { message: "Password reset" });
});

/*
  Drops every registered device. Access tokens already issued stay valid until
  they expire — this stops push immediately and forces a fresh sign-in once the
  current token lapses.
*/
export const revokeSessions = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const user = await User.findById(id).select("name fcm_tokens").lean();
  if (!user) return fail(res, 404, "User not found");

  await User.updateOne({ _id: oid(id) }, { $set: { fcm_tokens: [] }, $unset: { fcm_token: "" } });

  await audit(req, {
    action: "user.sessions_revoked",
    targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
    before: { devices: (user.fcm_tokens || []).length },
    after: { devices: 0 },
  });

  ok(res, { message: "Sessions revoked", devicesCleared: (user.fcm_tokens || []).length });
});

/* ------------------------------------------------------------------ */
/* delete / restore                                                    */
/* ------------------------------------------------------------------ */

/*
  Soft by default. The old handler called findByIdAndDelete, which removed the
  account row and left everything that pointed at it behind: posts with a
  dangling author, follow lists holding a missing id, reports about nobody.
  A hard delete now cleans all of that up, and has to be asked for explicitly.
*/
export const deleteUser = wrap(async (req, res) => {
  const { id } = req.params;
  const hard = String(req.query.hard ?? req.body?.hard ?? "") === "true";
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const user = await User.findById(id).select("name email accountStatus").lean();
  if (!user) return fail(res, 404, "User not found");

  if (!hard) {
    await User.updateOne({ _id: oid(id) }, {
      $set: {
        accountStatus: "deleted",
        deletedAt: new Date(),
        fcm_tokens: [],
        moderationNote: req.body?.reason || "Deleted by admin",
      },
      $unset: { fcm_token: "" },
    });

    await audit(req, {
      action: "user.delete",
      targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
      before: { accountStatus: user.accountStatus }, after: { accountStatus: "deleted", hard: false },
    });

    return ok(res, { message: "User deleted", hard: false, reversible: true });
  }

  const cascade = {
    content: (await Reels.deleteMany({ username: oid(id) })).deletedCount,
    notifications: (await Notification.deleteMany({
      $or: [{ recipient: oid(id) }, { actor: oid(id) }],
    })).deletedCount,
    reports: (await Report.deleteMany({
      $or: [{ targetUser: oid(id) }, { reporter: oid(id) }],
    })).deletedCount,
  };

  // Their id also sits inside other people's documents.
  const graph = await User.updateMany(
    {},
    {
      $pull: {
        followers: oid(id), following: oid(id), blockedUsers: oid(id),
        closeFriends: oid(id), followRequests: oid(id), sentFollowRequests: oid(id),
      },
    }
  );
  cascade.otherUsersTouched = graph.modifiedCount;

  // Engagement they left on content that survives.
  await Reels.updateMany({}, {
    $pull: {
      likes: { username: oid(id) },
      comments: { username: oid(id) },
      savepost: { username: oid(id) },
      favorites: { username: oid(id) },
      shares: { username: oid(id) },
      taggedUsers: { user: oid(id) },
    },
  });

  await User.deleteOne({ _id: oid(id) });

  await audit(req, {
    action: "user.delete",
    targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
    before: { accountStatus: user.accountStatus }, after: { hard: true, cascade },
  });

  ok(res, { message: "User permanently deleted", hard: true, cascade });
});

export const restoreUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const user = await User.findById(id).select("name accountStatus").lean();
  if (!user) return fail(res, 404, "User not found");
  if (user.accountStatus !== "deleted") return fail(res, 409, "That account is not deleted");

  await User.updateOne({ _id: oid(id) }, {
    $set: { accountStatus: "active", moderationNote: "" },
    $unset: { deletedAt: "" },
  });

  await audit(req, {
    action: "user.restore",
    targetUser: oid(id), targetName: user.name, reason: req.body?.reason,
    before: { accountStatus: "deleted" }, after: { accountStatus: "active" },
  });

  ok(res, { message: "User restored" });
});

/* ------------------------------------------------------------------ */
/* bulk actions                                                        */
/* ------------------------------------------------------------------ */

const BULK = ["ban", "suspend", "activate", "verify", "unverify", "delete"];

/*
  One action over a selection. Partial success is reported rather than hidden:
  the response says how many were changed and names the ids that were not, so
  the screen can tell the operator what actually happened.
*/
export const bulkUsers = wrap(async (req, res) => {
  const { action, ids, days, reason } = req.body || {};
  if (!BULK.includes(action)) return fail(res, 400, `action must be one of: ${BULK.join(", ")}`);

  const valid = [...new Set((ids || []).filter(isId).map(String))];
  if (valid.length === 0) return fail(res, 400, "Supply at least one valid user id");
  if (valid.length > 500) return fail(res, 400, "Too many users in one action (500 max)");

  const objectIds = valid.map(oid);
  const found = await User.find({ _id: { $in: objectIds } }).select("_id name accountStatus").lean();
  const foundIds = new Set(found.map((u) => String(u._id)));
  const missing = valid.filter((v) => !foundIds.has(v));

  let update;
  if (action === "verify") update = { $set: { verifiedBadge: true, updateby: new Date() } };
  else if (action === "unverify") update = { $set: { verifiedBadge: false, updateby: new Date() } };
  else if (action === "delete") {
    update = {
      $set: {
        accountStatus: "deleted", deletedAt: new Date(), fcm_tokens: [],
        moderationNote: reason || "Deleted by admin",
      },
      $unset: { fcm_token: "" },
    };
  } else {
    const mod = applyModeration(action, { days, note: reason });
    update = { $set: { ...mod, updateby: new Date() } };
    if (action === "ban") update.$unset = { fcm_token: "" };
  }

  const r = await User.updateMany({ _id: { $in: objectIds } }, update);

  await audit(req, {
    action: "user.bulk",
    targetCount: r.modifiedCount,
    reason: `${action}${reason ? `: ${reason}` : ""}`,
    before: { requested: valid.length },
    after: { action, modified: r.modifiedCount, missing: missing.length },
  });

  ok(res, {
    message: `${action} applied to ${r.modifiedCount} user(s)`,
    requested: valid.length,
    modified: r.modifiedCount,
    notFound: missing,
  });
});

/* ------------------------------------------------------------------ */
/* audit log                                                           */
/* ------------------------------------------------------------------ */

export const listAuditLog = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);

  const filter = {};
  if (req.query.action) filter.action = String(req.query.action);
  if (isId(req.query.targetUser)) filter.targetUser = oid(req.query.targetUser);
  if (isId(req.query.admin)) filter.admin = oid(req.query.admin);

  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    filter.createdAt = {};
    if (from && !isNaN(from)) filter.createdAt.$gte = from;
    if (to && !isNaN(to)) filter.createdAt.$lte = new Date(to.getTime() + 86400000 - 1);
  }

  const [rows, total] = await Promise.all([
    AdminLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("admin", "name email")
      .populate("targetUser", "name email image")
      .lean(),
    AdminLog.countDocuments(filter),
  ]);

  ok(res, { page, limit, total, rows });
});
