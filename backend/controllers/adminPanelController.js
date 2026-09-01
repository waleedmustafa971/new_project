/*
  Admin Panel API — Social Media module.

  Backs the UI served at /admin. Every endpoint here is read/write over the
  existing social-media collections; nothing in the mobile-facing API changes.

  Sections map 1:1 to the "Social Media Module" sheet:
    Dashboard ............ Admin - Analytics Dashboard
    Users ................ Admin - Manage All Users / Ban & Suspend Accounts
    Content .............. Admin - Content Moderation (posts, reels, stories)
    Comments ............. Engagement moderation
    Reports .............. Safety & Privacy (report post / report user)
    Groups ............... Groups & Community
    Live ................. Live Streaming + moderation tools
    Hashtags ............. Admin - Manage Trending & Hashtags
    Monetisation ......... Coins, gifts, transactions
    Music ................ Music Library Integration
    Verification ......... Verified Badge (blue tick)
    Support .............. Support tickets
    Notifications ........ Push notifications
    Categories ........... Admin - Manage Categories
    Promotions ........... Admin - Manage Ads & Promotions
    Admins ............... Admin users
*/

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Admin from "../models/Admin.js";
import User from "../models/users.js";
import Reels from "../models/Reels.js";
import SocialgroupModal from "../models/socialmediagroup.js";
import LiveStream from "../models/LiveStream.js";
import GiftModal from "../models/GiftModal.js";
import GiftTransaction from "../models/GiftTransaction.js";
import CoinsModal from "../models/CoinsModal.js";
import DepositStream from "../models/DepositBalanceModal.js";
import Transaction from "../models/Transaction.js";
import Music from "../models/Music.js";
import Verification from "../models/Verification.js";
import Support from "../models/Support.js";
import Category from "../models/Category.js";
import Promo from "../models/Promo.js";
import Report from "../models/Report.js";
import Hashtag from "../models/Hashtag.js";
import { ConversationModel, MessageModel } from "../models/ConversationModel.js";
import { signAdminToken } from "../middleware/adminAuth.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[admin-panel]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const paging = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchRegex = (q) => new RegExp(escapeRegex(String(q).trim()), "i");
const normalizeAdminUsername = (value = "") => String(value).trim().toLowerCase();
const validAdminUsername = (value) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value);

// Form fields arrive as strings ("true"/"false"), JSON toggles as real booleans.
const bool = (v, fallback = true) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return !["false", "0", "no", "inactive", "disabled"].includes(String(v).toLowerCase());
};

// Reels stores media in a loose `videoUrl` Object — normalise it for the UI.
const mediaOf = (doc) => {
  const v = doc.videoUrl;
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const first = v[0];
    if (!first) return null;
    return typeof first === "string" ? first : first.url || first.uri || first.path || null;
  }
  if (typeof v === "object") return v.url || v.uri || v.path || v.playbackUrl || null;
  return null;
};

const shapeContent = (r) => ({
  _id: r._id,
  title: r.videoTitle || "",
  posttype: r.posttype || "",
  posttypechild: r.posttypechild || "",
  media: mediaOf(r),
  rawMedia: r.videoUrl,
  user: r.username || null,
  status: r.status || "active",
  publishState: r.status_draft_publish || "Publish",
  location: r.location || "",
  likes: (r.likes || []).length,
  comments: (r.comments || []).length,
  shares: (r.shares || []).length,
  saves: (r.savepost || []).length,
  favorites: (r.favorites || []).length,
  createdAt: r.xtime,
});

// Everything in this module lives in the Reels collection, discriminated by posttype.
const POSTTYPE_FILTERS = {
  reel: { posttype: /^reel$/i },
  post: { posttype: /^post$/i },
  story: { posttype: /^stor(y|ies)$/i },
};

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export const login = wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const loginName = normalizeAdminUsername(username);
  if (!loginName || !password) return fail(res, 400, "Username and password are required");
  let admin = await Admin.findOne({ username: loginName });
  if (!admin) {
    admin = await Admin.findOne({ email: new RegExp(`^${escapeRegex(loginName)}@`, "i") });
    if (admin && !admin.username && !(await Admin.exists({ username: loginName, _id: { $ne: admin._id } }))) {
      admin.username = loginName;
      await admin.save();
    }
  }
  if (!admin) return fail(res, 401, "Invalid username or password");
  if (admin.status === false) return fail(res, 403, "This admin account is disabled");

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return fail(res, 401, "Invalid username or password");

  const token = signAdminToken(admin);
  ok(res, {
    token,
    admin: { _id: admin._id, name: admin.name, username: admin.username, email: admin.email, designation: admin.designation },
  });
});

// One-time bootstrap: only works while the Admin collection is empty.
export const bootstrap = wrap(async (req, res) => {
  const count = await Admin.countDocuments();
  if (count > 0) return fail(res, 403, "An admin already exists. Use the login form.");

  const { name, username, email, password } = req.body || {};
  const loginName = normalizeAdminUsername(username);
  if (!loginName || !email || !password) return fail(res, 400, "Name, username, email and password are required");
  if (!validAdminUsername(loginName)) return fail(res, 400, "Username must be 3–32 characters and use letters, numbers, dots, underscores or hyphens");
  if (String(password).length < 6) return fail(res, 400, "Password must be at least 6 characters");

  const admin = await Admin.create({
    name: name || "Super Admin",
    username: loginName,
    designation: "Super Admin",
    email: String(email).toLowerCase().trim(),
    password: await bcrypt.hash(String(password), 10),
    status: true,
    permissions: { all: true },
  });

  ok(res, {
    token: signAdminToken(admin),
    admin: { _id: admin._id, name: admin.name, username: admin.username, email: admin.email },
  });
});

export const bootstrapStatus = wrap(async (req, res) => {
  ok(res, { needsBootstrap: (await Admin.countDocuments()) === 0 });
});

export const me = wrap(async (req, res) => ok(res, { admin: req.admin }));

/* ------------------------------------------------------------------ */
/* dashboard / analytics                                               */
/* ------------------------------------------------------------------ */

export const dashboard = wrap(async (req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers24h,
    newUsers7d,
    suspended,
    banned,
    verified,
    totalContent,
    reels,
    posts,
    stories,
    contentToday,
    groups,
    liveNow,
    liveTotal,
    pendingReports,
    pendingVerification,
    openTickets,
    messages,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ enteredby: { $gte: dayAgo } }),
    User.countDocuments({ enteredby: { $gte: weekAgo } }),
    User.countDocuments({ accountStatus: "suspended" }),
    User.countDocuments({ accountStatus: "banned" }),
    User.countDocuments({ verifiedBadge: true }),
    Reels.countDocuments(),
    Reels.countDocuments(POSTTYPE_FILTERS.reel),
    Reels.countDocuments(POSTTYPE_FILTERS.post),
    Reels.countDocuments(POSTTYPE_FILTERS.story),
    Reels.countDocuments({ xtime: { $gte: dayAgo } }),
    SocialgroupModal.countDocuments(),
    LiveStream.countDocuments({ status: "live" }),
    LiveStream.countDocuments(),
    Report.countDocuments({ status: "pending" }),
    Verification.countDocuments({ status: "pending" }),
    Support.countDocuments({ status: { $nin: ["Closed", "Resolved"] } }),
    MessageModel.countDocuments(),
  ]);

  // Engagement totals across all content
  const [engagement] = await Reels.aggregate([
    {
      $group: {
        _id: null,
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        shares: { $sum: { $size: { $ifNull: ["$shares", []] } } },
        saves: { $sum: { $size: { $ifNull: ["$savepost", []] } } },
      },
    },
  ]);

  const [coinPool] = await User.aggregate([
    { $group: { _id: null, coins: { $sum: { $ifNull: ["$coins", 0] } } } },
  ]);

  const [giftStats] = await GiftTransaction.aggregate([
    { $group: { _id: null, coins: { $sum: "$coins" }, count: { $sum: 1 } } },
  ]);

  const [revenue] = await Transaction.aggregate([
    { $match: { paymentStatus: "approved" } },
    { $group: { _id: null, amount: { $sum: "$amount" }, coins: { $sum: "$coins" }, count: { $sum: 1 } } },
  ]);

  // 14-day signup + content trend
  const since = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);
  const dayBucket = (field) => [
    { $match: { [field]: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}` } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const [signupTrend, contentTrend] = await Promise.all([
    User.aggregate(dayBucket("enteredby")),
    Reels.aggregate(dayBucket("xtime")),
  ]);

  const series = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      users: signupTrend.find((x) => x._id === key)?.count || 0,
      content: contentTrend.find((x) => x._id === key)?.count || 0,
    });
  }

  // Top creators by total engagement received
  const topCreators = await Reels.aggregate([
    {
      $group: {
        _id: "$username",
        posts: { $sum: 1 },
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
      },
    },
    { $addFields: { engagement: { $add: ["$likes", "$comments"] } } },
    { $sort: { engagement: -1 } },
    { $limit: 8 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        posts: 1, likes: 1, comments: 1, engagement: 1,
        name: "$user.name", email: "$user.email", image: "$user.image",
        followers: { $size: { $ifNull: ["$user.followers", []] } },
      },
    },
  ]);

  const recentUsers = await User.find()
    .sort({ enteredby: -1 })
    .limit(6)
    .select("name email image enteredby accountStatus verifiedBadge");

  const recentContent = await Reels.find()
    .sort({ xtime: -1 })
    .limit(6)
    .populate("username", "name image")
    .lean();

  ok(res, {
    stats: {
      totalUsers, newUsers24h, newUsers7d, suspended, banned, verified,
      totalContent, reels, posts, stories, contentToday,
      groups, liveNow, liveTotal, messages,
      pendingReports, pendingVerification, openTickets,
      likes: engagement?.likes || 0,
      comments: engagement?.comments || 0,
      shares: engagement?.shares || 0,
      saves: engagement?.saves || 0,
      coinsInCirculation: coinPool?.coins || 0,
      giftCoins: giftStats?.coins || 0,
      giftCount: giftStats?.count || 0,
      revenueAmount: revenue?.amount || 0,
      revenueCoins: revenue?.coins || 0,
      revenueCount: revenue?.count || 0,
    },
    series,
    topCreators,
    recentUsers,
    recentContent: recentContent.map(shapeContent),
  });
});

/* ------------------------------------------------------------------ */
/* users                                                               */
/* ------------------------------------------------------------------ */

export const listUsers = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { q, status, verified, accountType } = req.query;

  const filter = {};
  if (q) {
    const rx = searchRegex(q);
    filter.$or = [{ name: rx }, { email: rx }, { mobileno: rx }, { firstname: rx }, { lastname: rx }];
  }
  if (status) filter.accountStatus = status;
  if (verified === "yes") filter.verifiedBadge = true;
  if (verified === "no") filter.verifiedBadge = { $ne: true };
  if (accountType) filter.accountType = accountType;

  const [rows, total] = await Promise.all([
    User.find(filter)
      .select("name firstname lastname email mobileno image bio gender coins accountStatus verifiedBadge accountType privacy enteredby followers following regby")
      .sort({ enteredby: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  ok(res, {
    rows: rows.map((u) => ({
      ...u,
      followers: (u.followers || []).length,
      following: (u.following || []).length,
    })),
    total, page, limit,
  });
});

export const getUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const user = await User.findById(id).select("-password").lean();
  if (!user) return fail(res, 404, "User not found");

  const [contentCount, liveCount, reportsAgainst, giftsReceived, giftsSent] = await Promise.all([
    Reels.countDocuments({ username: id }),
    LiveStream.countDocuments({ hoster: id }),
    Report.countDocuments({ targetUser: id }),
    GiftTransaction.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, count: { $sum: 1 } } },
    ]),
    GiftTransaction.aggregate([
      { $match: { sender: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, count: { $sum: 1 } } },
    ]),
  ]);

  const recentContent = await Reels.find({ username: id }).sort({ xtime: -1 }).limit(12).lean();

  ok(res, {
    user: {
      ...user,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      followers: undefined,
      following: undefined,
    },
    stats: {
      contentCount, liveCount, reportsAgainst,
      giftCoinsReceived: giftsReceived[0]?.coins || 0,
      giftCoinsSent: giftsSent[0]?.coins || 0,
    },
    recentContent: recentContent.map(shapeContent),
  });
});

// Ban / suspend / reactivate — "Admin - Ban & Suspend Accounts"
export const moderateUser = wrap(async (req, res) => {
  const { id } = req.params;
  const { action, days, note } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const update = { moderationNote: note || "", updateby: new Date() };
  if (action === "ban") {
    update.accountStatus = "banned";
    update.suspendedUntil = null;
  } else if (action === "suspend") {
    const d = Math.max(parseInt(days, 10) || 7, 1);
    update.accountStatus = "suspended";
    update.suspendedUntil = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  } else if (action === "activate") {
    update.accountStatus = "active";
    update.suspendedUntil = null;
  } else {
    return fail(res, 400, "action must be ban, suspend or activate");
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("name email accountStatus suspendedUntil moderationNote");
  if (!user) return fail(res, 404, "User not found");
  ok(res, { user });
});

export const updateUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");

  const allowed = ["name", "firstname", "lastname", "bio", "gender", "mobileno", "verifiedBadge", "accountType", "privacy", "nationality", "interest"];
  const update = { updateby: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-password");
  if (!user) return fail(res, 404, "User not found");
  ok(res, { user });
});

// Grant / deduct coins — Monetisation
export const adjustCoins = wrap(async (req, res) => {
  const { id } = req.params;
  const amount = parseInt(req.body?.amount, 10);
  if (!isId(id)) return fail(res, 400, "Invalid user id");
  if (!Number.isFinite(amount) || amount === 0) return fail(res, 400, "amount must be a non-zero number");

  const user = await User.findById(id).select("coins name");
  if (!user) return fail(res, 404, "User not found");

  const next = (user.coins || 0) + amount;
  if (next < 0) return fail(res, 400, `User only has ${user.coins} coins`);

  user.coins = next;
  await user.save();
  ok(res, { coins: user.coins });
});

export const deleteUser = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid user id");
  const user = await User.findByIdAndDelete(id);
  if (!user) return fail(res, 404, "User not found");
  ok(res, { message: "User deleted" });
});

/* ------------------------------------------------------------------ */
/* content moderation (posts / reels / stories)                        */
/* ------------------------------------------------------------------ */

export const listContent = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { type, q, status, publishState, userId } = req.query;

  const filter = {};
  if (type && POSTTYPE_FILTERS[type]) Object.assign(filter, POSTTYPE_FILTERS[type]);
  if (q) filter.videoTitle = searchRegex(q);
  if (status === "hidden") filter.status = "hidden";
  if (status === "visible") filter.status = { $ne: "hidden" };
  if (publishState) filter.status_draft_publish = publishState;
  if (userId && isId(userId)) filter.username = userId;

  const [rows, total] = await Promise.all([
    Reels.find(filter)
      .sort({ xtime: -1 })
      .skip(skip)
      .limit(limit)
      .populate("username", "name email image verifiedBadge accountStatus")
      .lean(),
    Reels.countDocuments(filter),
  ]);

  ok(res, { rows: rows.map(shapeContent), total, page, limit });
});

export const getContent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid content id");

  const doc = await Reels.findById(id)
    .populate("username", "name email image verifiedBadge")
    .populate("comments.username", "name image")
    .lean();
  if (!doc) return fail(res, 404, "Content not found");

  ok(res, {
    content: shapeContent(doc),
    comments: (doc.comments || []).map((c) => ({
      _id: c._id,
      message: c.message,
      user: c.username,
      likes: (c.likes || []).length,
      replies: (c.reply || []).length,
      createdAt: c.timestamp,
    })),
    reports: await Report.find({ targetId: id }).populate("reporter", "name email").lean(),
  });
});

// Hide / unhide / publish / unpublish — "Admin - Content Moderation"
export const moderateContent = wrap(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid content id");

  const map = {
    hide: { status: "hidden" },
    unhide: { status: "active" },
    publish: { status_draft_publish: "Publish" },
    unpublish: { status_draft_publish: "Draft" },
  };
  if (!map[action]) return fail(res, 400, "action must be hide, unhide, publish or unpublish");

  const doc = await Reels.findByIdAndUpdate(id, map[action], { new: true }).lean();
  if (!doc) return fail(res, 404, "Content not found");
  ok(res, { content: shapeContent(doc) });
});

export const deleteContent = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid content id");
  const doc = await Reels.findByIdAndDelete(id);
  if (!doc) return fail(res, 404, "Content not found");
  await Report.updateMany(
    { targetId: id, status: { $in: ["pending", "reviewing"] } },
    { status: "resolved", actionTaken: "content_deleted", reviewedAt: new Date() }
  );
  ok(res, { message: "Content deleted" });
});

export const bulkContent = wrap(async (req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return fail(res, 400, "ids array is required");
  const valid = ids.filter(isId);

  if (action === "delete") {
    const r = await Reels.deleteMany({ _id: { $in: valid } });
    return ok(res, { affected: r.deletedCount });
  }
  const map = { hide: { status: "hidden" }, unhide: { status: "active" } };
  if (!map[action]) return fail(res, 400, "action must be hide, unhide or delete");

  const r = await Reels.updateMany({ _id: { $in: valid } }, map[action]);
  ok(res, { affected: r.modifiedCount });
});

/* ------------------------------------------------------------------ */
/* comments                                                            */
/* ------------------------------------------------------------------ */

export const listComments = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { q } = req.query;

  const pipeline = [
    { $unwind: "$comments" },
    ...(q ? [{ $match: { "comments.message": searchRegex(q) } }] : []),
    { $sort: { "comments.timestamp": -1 } },
    {
      $facet: {
        rows: [
          { $skip: skip },
          { $limit: limit },
          { $lookup: { from: "users", localField: "comments.username", foreignField: "_id", as: "u" } },
          { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              contentId: "$_id",
              contentTitle: "$videoTitle",
              posttype: "$posttype",
              commentId: "$comments._id",
              message: "$comments.message",
              createdAt: "$comments.timestamp",
              likes: { $size: { $ifNull: ["$comments.likes", []] } },
              replies: { $size: { $ifNull: ["$comments.reply", []] } },
              user: { _id: "$u._id", name: "$u.name", image: "$u.image" },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];

  const [result] = await Reels.aggregate(pipeline);
  ok(res, { rows: result?.rows || [], total: result?.total?.[0]?.n || 0, page, limit });
});

export const deleteComment = wrap(async (req, res) => {
  const { contentId, commentId } = req.params;
  if (!isId(contentId) || !isId(commentId)) return fail(res, 400, "Invalid ids");

  const r = await Reels.updateOne(
    { _id: contentId },
    { $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } } }
  );
  if (!r.modifiedCount) return fail(res, 404, "Comment not found");
  ok(res, { message: "Comment deleted" });
});

/* ------------------------------------------------------------------ */
/* reports (moderation queue)                                          */
/* ------------------------------------------------------------------ */

export const listReports = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { status, targetType } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;

  const [rows, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reporter", "name email image")
      .populate("targetUser", "name email image accountStatus")
      .lean(),
    Report.countDocuments(filter),
  ]);

  ok(res, { rows, total, page, limit });
});

export const createReport = wrap(async (req, res) => {
  const { reporter, targetType, targetId, targetUser, reason, details } = req.body || {};
  if (!targetType || !isId(targetId)) return fail(res, 400, "targetType and a valid targetId are required");

  const report = await Report.create({
    reporter: isId(reporter) ? reporter : undefined,
    targetType,
    targetId,
    targetUser: isId(targetUser) ? targetUser : undefined,
    reason,
    details,
  });
  ok(res, { report });
});

export const resolveReport = wrap(async (req, res) => {
  const { id } = req.params;
  const { status, actionTaken, adminNote } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid report id");

  const report = await Report.findById(id);
  if (!report) return fail(res, 404, "Report not found");

  report.status = status || "resolved";
  report.actionTaken = actionTaken || "none";
  report.adminNote = adminNote || report.adminNote;
  report.reviewedBy = req.admin?._id;
  report.reviewedAt = new Date();

  // Carry out the action the admin selected
  if (actionTaken === "content_deleted" && report.targetType !== "user") {
    await Reels.findByIdAndDelete(report.targetId);
  } else if (actionTaken === "content_hidden" && report.targetType !== "user") {
    await Reels.findByIdAndUpdate(report.targetId, { status: "hidden" });
  } else if (actionTaken === "user_banned" && report.targetUser) {
    await User.findByIdAndUpdate(report.targetUser, { accountStatus: "banned", suspendedUntil: null });
  } else if (actionTaken === "user_suspended" && report.targetUser) {
    await User.findByIdAndUpdate(report.targetUser, {
      accountStatus: "suspended",
      suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  await report.save();
  ok(res, { report });
});

export const deleteReport = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid report id");
  await Report.findByIdAndDelete(id);
  ok(res, { message: "Report deleted" });
});

/* ------------------------------------------------------------------ */
/* groups & community                                                  */
/* ------------------------------------------------------------------ */

export const listGroups = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { q, visibility } = req.query;

  const filter = {};
  if (q) filter.name = searchRegex(q);
  if (visibility === "private") filter.isPrivate = true;
  if (visibility === "public") filter.isPrivate = { $ne: true };

  const [rows, total] = await Promise.all([
    SocialgroupModal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "name email image")
      .lean(),
    SocialgroupModal.countDocuments(filter),
  ]);

  ok(res, {
    rows: rows.map((g) => ({
      _id: g._id,
      name: g.name,
      logo: g.logo,
      description: g.description,
      creator: g.creator,
      isPrivate: !!g.isPrivate,
      members: (g.members || []).length,
      admins: (g.admins || []).length,
      pending: (g.pendingRequests || []).length,
      createdAt: g.createdAt,
    })),
    total, page, limit,
  });
});

export const getGroup = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid group id");

  const group = await SocialgroupModal.findById(id)
    .populate("creator", "name email image")
    .populate("admins", "name email image")
    .populate("members", "name email image accountStatus")
    .populate("pendingRequests", "name email image")
    .lean();
  if (!group) return fail(res, 404, "Group not found");
  ok(res, { group });
});

export const updateGroup = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid group id");

  const update = {};
  for (const key of ["name", "description", "isPrivate", "logo"]) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const group = await SocialgroupModal.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!group) return fail(res, 404, "Group not found");
  ok(res, { group });
});

// Approve / reject join requests, remove members
export const groupMemberAction = wrap(async (req, res) => {
  const { id } = req.params;
  const { userId, action } = req.body || {};
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Invalid ids");

  const ops = {
    approve: { $pull: { pendingRequests: userId }, $addToSet: { members: userId } },
    reject: { $pull: { pendingRequests: userId } },
    remove: { $pull: { members: userId, admins: userId } },
    promote: { $addToSet: { admins: userId } },
    demote: { $pull: { admins: userId } },
  };
  if (!ops[action]) return fail(res, 400, "Unknown action");

  await SocialgroupModal.findByIdAndUpdate(id, ops[action]);
  ok(res, { message: `Member ${action}d` });
});

export const deleteGroup = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid group id");
  await SocialgroupModal.findByIdAndDelete(id);
  ok(res, { message: "Group deleted" });
});

/* ------------------------------------------------------------------ */
/* live streaming                                                      */
/* ------------------------------------------------------------------ */

export const listLive = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { status, q } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [{ title: searchRegex(q) }, { channelName: searchRegex(q) }];

  const [rows, total] = await Promise.all([
    LiveStream.find(filter)
      .sort({ xtime: -1 })
      .skip(skip)
      .limit(limit)
      .populate("hoster", "name email image verifiedBadge")
      .lean(),
    LiveStream.countDocuments(filter),
  ]);

  ok(res, {
    rows: rows.map((s) => ({
      _id: s._id,
      channelName: s.channelName,
      title: s.title,
      thumbnail: s.thumbnail,
      hoster: s.hoster,
      status: s.status,
      viewers: s.viewers_count || 0,
      coins: s.coins || 0,
      location: s.location,
      cohosts: (s.cohoster || []).length,
      messages: (s.messages || []).length,
      createdAt: s.xtime,
    })),
    total, page, limit,
  });
});

export const getLive = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid stream id");

  const stream = await LiveStream.findById(id)
    .populate("hoster", "name email image")
    .populate("cohoster.user", "name image")
    .populate("messages.userid", "name image")
    .lean();
  if (!stream) return fail(res, 404, "Stream not found");

  const gifts = await GiftTransaction.find({ channelName: stream.channelName })
    .populate("sender", "name image")
    .populate("gift", "name icon coinCost")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  ok(res, { stream, gifts });
});

// Moderation tools: force-end a stream
export const endLive = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid stream id");
  const stream = await LiveStream.findByIdAndUpdate(
    id,
    { status: "ended", viewers_count: 0, updateby: new Date() },
    { new: true }
  );
  if (!stream) return fail(res, 404, "Stream not found");

  // Tell everyone still in the room
  const io = req.app.get("io");
  if (io) io.to(stream.channelName).emit("live-ended", { reason: "Ended by moderator" });

  ok(res, { stream });
});

export const deleteLive = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid stream id");
  await LiveStream.findByIdAndDelete(id);
  ok(res, { message: "Stream deleted" });
});

/* ------------------------------------------------------------------ */
/* hashtags & trending                                                 */
/* ------------------------------------------------------------------ */

export const listHashtags = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { q, filter: view } = req.query;

  const filter = {};
  if (q) filter.tag = searchRegex(String(q).replace(/^#/, ""));
  if (view === "trending") filter.isTrending = true;
  if (view === "blocked") filter.isBlocked = true;

  const [rows, total] = await Promise.all([
    Hashtag.find(filter).sort({ isTrending: -1, trendingRank: 1, postCount: -1 }).skip(skip).limit(limit).lean(),
    Hashtag.countDocuments(filter),
  ]);
  ok(res, { rows, total, page, limit });
});

// Scan every caption for #tags and refresh the hashtag table
export const rebuildHashtags = wrap(async (req, res) => {
  const docs = await Reels.find({ videoTitle: /#/ }).select("videoTitle xtime").lean();

  const counts = new Map();
  const lastUsed = new Map();
  for (const d of docs) {
    const found = String(d.videoTitle || "").match(/#[\p{L}\p{N}_]+/gu) || [];
    for (const raw of found) {
      const tag = raw.slice(1).toLowerCase();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
      const t = d.xtime ? new Date(d.xtime) : null;
      if (t && (!lastUsed.get(tag) || t > lastUsed.get(tag))) lastUsed.set(tag, t);
    }
  }

  if (counts.size === 0) return ok(res, { scanned: docs.length, tags: 0, message: "No hashtags found in captions" });

  await Hashtag.bulkWrite(
    [...counts.entries()].map(([tag, postCount]) => ({
      updateOne: {
        filter: { tag },
        update: { $set: { postCount, lastUsedAt: lastUsed.get(tag) || null } },
        upsert: true,
      },
    }))
  );

  ok(res, { scanned: docs.length, tags: counts.size, message: `Indexed ${counts.size} hashtags from ${docs.length} posts` });
});

export const upsertHashtag = wrap(async (req, res) => {
  const tag = String(req.body?.tag || "").replace(/^#/, "").trim().toLowerCase();
  if (!tag) return fail(res, 400, "tag is required");

  const doc = await Hashtag.findOneAndUpdate(
    { tag },
    { $setOnInsert: { tag }, $set: { isTrending: !!req.body.isTrending, trendingRank: parseInt(req.body.trendingRank, 10) || 0 } },
    { new: true, upsert: true }
  );
  ok(res, { hashtag: doc });
});

export const updateHashtag = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid hashtag id");

  const update = {};
  if (req.body.isTrending !== undefined) update.isTrending = !!req.body.isTrending;
  if (req.body.isBlocked !== undefined) update.isBlocked = !!req.body.isBlocked;
  if (req.body.trendingRank !== undefined) update.trendingRank = parseInt(req.body.trendingRank, 10) || 0;

  const doc = await Hashtag.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return fail(res, 404, "Hashtag not found");
  ok(res, { hashtag: doc });
});

export const deleteHashtag = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid hashtag id");
  await Hashtag.findByIdAndDelete(id);
  ok(res, { message: "Hashtag deleted" });
});

/* ------------------------------------------------------------------ */
/* monetisation: coin packages, gifts, transactions                    */
/* ------------------------------------------------------------------ */

/*
  Coin packages.

  These read and write `depositscoins` (DepositStream), not the `coins`
  collection they used to. That was a real disconnect rather than a preference:
  the app buys from depositscoins — GET /apis/monetisation/packages lists it,
  purchase/intent prices from it, and the legacy wallet route verifies against
  it — while this screen edited a parallel collection nothing else read. An
  admin could add, price and publish packages here all day and the app would
  still show nothing.
*/
export const listCoinPackages = wrap(async (req, res) => {
  const rows = await DepositStream.find().sort({ priceAED: 1 }).lean();
  ok(res, { rows, total: rows.length });
});

export const saveCoinPackage = wrap(async (req, res) => {
  const { id } = req.params;
  const data = {
    groupname: req.body.groupname,
    thumbnail: req.body.thumbnail,
    priceAED: parseFloat(req.body.priceAED) || 0,
    coins: parseInt(req.body.coins, 10) || 0,
    /*
      Lower-cased because this value is handed to Stripe verbatim. Defaulting it
      rather than leaving it blank matters: a package with no currency is charged
      in the account default, which is how an AED price ends up billed in dollars.
    */
    currency: String(req.body.currency || "aed").toLowerCase(),
    status: req.body.status || "active",
  };

  if (data.priceAED <= 0) return fail(res, 422, "Price must be greater than zero");
  if (data.coins <= 0) return fail(res, 422, "Coins must be greater than zero");

  if (id && isId(id)) {
    const row = await DepositStream.findByIdAndUpdate(id, data, { new: true });
    if (!row) return fail(res, 404, "Package not found");
    return ok(res, { row });
  }
  const row = await DepositStream.create(data);
  ok(res, { row });
});

export const deleteCoinPackage = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  await DepositStream.findByIdAndDelete(id);
  ok(res, { message: "Package deleted" });
});

export const listGifts = wrap(async (req, res) => {
  const rows = await GiftModal.find().sort({ coinCost: 1 }).lean();
  ok(res, { rows, total: rows.length });
});

export const saveGift = wrap(async (req, res) => {
  const { id } = req.params;
  const data = {
    groupname: req.body.groupname,
    name: req.body.name,
    icon: req.body.icon,
    coinCost: parseInt(req.body.coinCost, 10) || 0,
  };
  if (!data.name) return fail(res, 400, "Gift name is required");

  if (id && isId(id)) {
    const row = await GiftModal.findByIdAndUpdate(id, data, { new: true });
    if (!row) return fail(res, 404, "Gift not found");
    return ok(res, { row });
  }
  const row = await GiftModal.create(data);
  ok(res, { row });
});

export const deleteGift = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  await GiftModal.findByIdAndDelete(id);
  ok(res, { message: "Gift deleted" });
});

export const listGiftTransactions = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const [rows, total] = await Promise.all([
    GiftTransaction.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .populate("gift", "name icon coinCost")
      .lean(),
    GiftTransaction.countDocuments(),
  ]);
  ok(res, { rows, total, page, limit });
});

export const listTransactions = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { status } = req.query;
  const filter = status ? { paymentStatus: status } : {};

  const [rows, total, sum] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate("userId", "name email image").lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: { paymentStatus: "approved" } },
      { $group: { _id: null, amount: { $sum: "$amount" }, coins: { $sum: "$coins" } } },
    ]),
  ]);
  ok(res, { rows, total, page, limit, totals: sum[0] || { amount: 0, coins: 0 } });
});

/* ------------------------------------------------------------------ */
/* music library                                                       */
/* ------------------------------------------------------------------ */

export const listMusic = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { q } = req.query;
  const filter = q ? { $or: [{ musicname: searchRegex(q) }, { music_group: searchRegex(q) }] } : {};

  const [rows, total] = await Promise.all([
    Music.find(filter).sort({ xtime: -1 }).skip(skip).limit(limit).lean(),
    Music.countDocuments(filter),
  ]);
  ok(res, { rows, total, page, limit });
});

export const saveMusic = wrap(async (req, res) => {
  const { id } = req.params;
  const data = {
    musicname: req.body.musicname,
    musictype: req.body.musictype,
    musicfile: req.body.musicfile,
    music_group: req.body.music_group,
    image: req.body.image,
    status: req.body.status || "Active",
    updateby: new Date(),
  };
  if (!data.musicname) return fail(res, 400, "Music name is required");

  if (id && isId(id)) {
    const row = await Music.findByIdAndUpdate(id, data, { new: true });
    if (!row) return fail(res, 404, "Track not found");
    return ok(res, { row });
  }
  const row = await Music.create(data);
  ok(res, { row });
});

export const deleteMusic = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  await Music.findByIdAndDelete(id);
  ok(res, { message: "Track deleted" });
});

/* ------------------------------------------------------------------ */
/* verification requests (blue tick)                                   */
/* ------------------------------------------------------------------ */

export const listVerifications = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { status, kind } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (kind) filter.kind = kind; // "social" (blue tick) or "business" (trade licence)

  const [rows, total] = await Promise.all([
    Verification.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
    Verification.countDocuments(filter),
  ]);

  // userid is a plain String on this schema, so resolve owners manually
  const ids = rows.map((r) => r.userid).filter(isId);
  const users = await User.find({ _id: { $in: ids } }).select("name email image verifiedBadge").lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

  ok(res, {
    rows: rows.map((r) => ({ ...r, user: byId[String(r.userid)] || null })),
    total, page, limit,
  });
});

export const decideVerification = wrap(async (req, res) => {
  const { id } = req.params;
  const { status, reviewNote } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid id");
  if (!["approved", "rejected", "pending"].includes(status)) {
    return fail(res, 400, "status must be approved, rejected or pending");
  }

  const row = await Verification.findByIdAndUpdate(
    id,
    {
      status,
      reviewNote: reviewNote || "",
      reviewedAt: status === "pending" ? null : new Date(),
      updatedBy: String(req.admin?._id || ""),
    },
    { new: true }
  );
  if (!row) return fail(res, 404, "Request not found");

  // Approving grants the blue tick on the account
  if (isId(row.userid)) {
    const update = {
      verifiedBadge: status === "approved",
      profileidverification: status === "approved" ? "yes" : "no",
    };
    // A social approval also promotes the account out of "personal"
    if (status === "approved" && row.kind === "social") {
      update.accountType = row.category === "business" ? "business" : "creator";
    }
    await User.findByIdAndUpdate(row.userid, update);
  }
  ok(res, { row });
});

/* ------------------------------------------------------------------ */
/* support tickets                                                     */
/* ------------------------------------------------------------------ */

export const listSupport = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const { status } = req.query;
  const filter = status ? { status } : {};

  const [rows, total] = await Promise.all([
    Support.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "name email image").lean(),
    Support.countDocuments(filter),
  ]);
  ok(res, { rows, total, page, limit });
});

export const updateSupport = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  const row = await Support.findByIdAndUpdate(
    id,
    { status: req.body.status, updateBy: String(req.admin?._id || "") },
    { new: true }
  );
  if (!row) return fail(res, 404, "Ticket not found");
  ok(res, { row });
});

/* ------------------------------------------------------------------ */
/* notifications                                                       */
/* ------------------------------------------------------------------ */

export const sendNotification = wrap(async (req, res) => {
  const { title, body, audience, userId } = req.body || {};
  if (!title || !body) return fail(res, 400, "title and body are required");

  // Loaded lazily so the rest of the panel never depends on Firebase being configured.
  let service;
  try {
    const { messaging } = await import("../config/firebase.js");
    if (!messaging) {
      return fail(res, 503, "Push is disabled — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env");
    }
    service = await import("../services/notificationService.js");
  } catch (err) {
    return fail(res, 503, "Push service unavailable: " + err.message);
  }

  if (audience === "user") {
    if (!isId(userId)) return fail(res, 400, "A valid userId is required");
    const result = await service.sendNotificationToUser(userId, { title, body, data: { source: "admin" } });
    if (!result) return fail(res, 400, "That user has no registered device token");
    return ok(res, { sent: 1 });
  }

  // Broadcast to everyone holding a device token
  const users = await User.find({
    $or: [{ fcm_tokens: { $exists: true, $ne: [] } }, { fcm_token: { $exists: true, $nin: [null, ""] } }],
  }).select("fcm_tokens fcm_token").lean();

  const tokens = [...new Set(users.flatMap((u) => (u.fcm_tokens?.length ? u.fcm_tokens : u.fcm_token ? [u.fcm_token] : [])))];
  if (tokens.length === 0) return fail(res, 400, "No device tokens registered yet");

  let sent = 0;
  // FCM multicast caps at 500 tokens per call
  for (let i = 0; i < tokens.length; i += 500) {
    const r = await service.sendToTokens(tokens.slice(i, i + 500), { title, body, data: { source: "admin" } });
    sent += r?.successCount || 0;
  }
  ok(res, { sent, targeted: tokens.length });
});

export const notificationAudience = wrap(async (req, res) => {
  const [total, withTokens] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({
      $or: [{ fcm_tokens: { $exists: true, $ne: [] } }, { fcm_token: { $exists: true, $nin: [null, ""] } }],
    }),
  ]);
  ok(res, { total, withTokens });
});

/* ------------------------------------------------------------------ */
/* categories                                                          */
/* ------------------------------------------------------------------ */

export const listCategories = wrap(async (req, res) => {
  const { type, q } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (q) filter.name = searchRegex(q);

  const rows = await Category.find(filter).sort({ name: 1 }).limit(500).lean();
  const types = await Category.distinct("type");
  ok(res, { rows, total: rows.length, types: types.filter(Boolean) });
});

export const saveCategory = wrap(async (req, res) => {
  const { id } = req.params;
  const data = {
    name: req.body.name,
    type: req.body.type,
    icon: req.body.icon,
    image: req.body.image,
    parentId: isId(req.body.parentId) ? req.body.parentId : null,
  };
  if (!data.name) return fail(res, 400, "Category name is required");

  if (id && isId(id)) {
    const row = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!row) return fail(res, 404, "Category not found");
    return ok(res, { row });
  }
  const row = await Category.create(data);
  ok(res, { row });
});

export const deleteCategory = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  await Category.findByIdAndDelete(id);
  ok(res, { message: "Category deleted" });
});

/* ------------------------------------------------------------------ */
/* ads & promotions                                                    */
/* ------------------------------------------------------------------ */

export const listPromos = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const [rows, total] = await Promise.all([
    Promo.find().sort({ xtime: -1 }).skip(skip).limit(limit).lean(),
    Promo.countDocuments(),
  ]);
  ok(res, { rows, total, page, limit });
});

export const savePromo = wrap(async (req, res) => {
  const { id } = req.params;
  const data = {
    promo_code: req.body.promo_code,
    message: req.body.message,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    discount: parseFloat(req.body.discount) || 0,
    discount_type: req.body.discount_type || "percentage",
    max_discount_amount: parseFloat(req.body.max_discount_amount) || 0,
    minimum_order_amount: parseFloat(req.body.minimum_order_amount) || 0,
    no_of_users: parseInt(req.body.no_of_users, 10) || 0,
    status: bool(req.body.status),
    modulename: req.body.modulename || "shopping",
  };
  if (!data.promo_code) return fail(res, 400, "Promo code is required");
  if (!data.start_date || !data.end_date) return fail(res, 400, "Start and end dates are required");

  if (id && isId(id)) {
    const row = await Promo.findByIdAndUpdate(id, data, { new: true });
    if (!row) return fail(res, 404, "Promotion not found");
    return ok(res, { row });
  }
  const row = await Promo.create(data);
  ok(res, { row });
});

export const deletePromo = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  await Promo.findByIdAndDelete(id);
  ok(res, { message: "Promotion deleted" });
});

/* ------------------------------------------------------------------ */
/* admin accounts                                                      */
/* ------------------------------------------------------------------ */

export const listAdmins = wrap(async (req, res) => {
  const rows = await Admin.find().select("-password").sort({ createdAt: -1 }).lean();
  ok(res, { rows, total: rows.length });
});

export const saveAdmin = wrap(async (req, res) => {
  const { id } = req.params;
  const { name, username, designation, email, password, status } = req.body || {};
  const loginName = normalizeAdminUsername(username);
  if (!validAdminUsername(loginName)) return fail(res, 400, "Username must be 3–32 characters and use letters, numbers, dots, underscores or hyphens");

  if (id && isId(id)) {
    if (await Admin.findOne({ username: loginName, _id: { $ne: id } })) return fail(res, 409, "That username is already in use");
    const update = { name, username: loginName, designation, email: String(email).toLowerCase().trim(), status: bool(status) };
    if (password) update.password = await bcrypt.hash(String(password), 10);
    const row = await Admin.findByIdAndUpdate(id, update, { new: true }).select("-password");
    if (!row) return fail(res, 404, "Admin not found");
    return ok(res, { row });
  }

  if (!name || !email || !password) return fail(res, 400, "Name, username, email and password are required");
  if (await Admin.findOne({ username: loginName })) return fail(res, 409, "That username is already in use");
  if (await Admin.findOne({ email: String(email).toLowerCase().trim() })) {
    return fail(res, 409, "An admin with that email already exists");
  }

  const row = await Admin.create({
    name,
    username: loginName,
    designation,
    email: String(email).toLowerCase().trim(),
    password: await bcrypt.hash(String(password), 10),
    status: bool(status),
  });
  ok(res, { row: { ...row.toObject(), password: undefined } });
});

export const deleteAdmin = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid id");
  if (String(req.admin._id) === String(id)) return fail(res, 400, "You cannot delete your own account");
  if ((await Admin.countDocuments()) <= 1) return fail(res, 400, "Cannot delete the last admin");

  await Admin.findByIdAndDelete(id);
  ok(res, { message: "Admin deleted" });
});

/* ------------------------------------------------------------------ */
/* messaging overview (read-only)                                      */
/* ------------------------------------------------------------------ */

export const messagingOverview = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);

  const [rows, total, messageCount] = await Promise.all([
    ConversationModel.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .select("type sender receiver group messages updatedAt")
      .lean(),
    ConversationModel.countDocuments(),
    MessageModel.countDocuments(),
  ]);

  ok(res, {
    rows: rows.map((c) => ({
      _id: c._id,
      type: c.type,
      sender: c.sender,
      receiver: c.receiver,
      messages: (c.messages || []).length,
      updatedAt: c.updatedAt,
    })),
    total, page, limit, messageCount,
  });
});
