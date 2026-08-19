/*
  Pages / Creator / Business — Social Media module.

  Closes the section's six rows:

    Analytics ....................... views, reach, impressions, growth, top posts
    Schedule Posts .................. a third resting state between draft and live
    Upgrade to Creator or Business .. the self-serve half of a flow that until now
                                      only existed as an admin approval
    Boost / Promote a Post .......... paid distribution for one post
    Ads Management Panel ............ campaigns, budgets, targeting, review
    Monetisation (subs, promotions) . subscriptions shipped 19 Aug under
                                      Monetisation; the promotions half is here

  Budgets are in coins, like everything else that moves value here: real money
  entered when the coins were bought, so an advertiser spends the same currency
  a viewer gifts with and no second payment rail is needed.
*/

import mongoose from "mongoose";

import User from "../models/users.js";
import Reels from "../models/Reels.js";
import AdCampaign, { campaignIsLive, HOLDING_STATUSES } from "../models/AdCampaign.js";
import { isId, AUTHOR_FIELDS } from "../helpers/feed.js";
import { debitCoins, creditCoins } from "../helpers/monetisation.js";
import { ageFrom } from "../helpers/safety.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[creator]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const sameId = (a, b) => String(a) === String(b);
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PROFESSIONAL = ["creator", "business"];

/* Sum of an interaction array, tolerating the several shapes these carry. */
const count = (a) => (Array.isArray(a) ? a.length : 0);

/* ------------------------------------------------------------------ */
/* 1. Upgrade Profile to Creator or Business                           */
/* ------------------------------------------------------------------ */

/*
  The self-serve half of the upgrade.

  An admin could already promote an account by approving a verification
  request, which is why this row sat at 10%. That path stays exactly as it is;
  this is the one a person walks themselves, and it is deliberately instant
  rather than queued — nothing here grants trust. A creator account unlocks
  analytics, subscriptions and ads, none of which need a human to vouch for the
  applicant. Verification, which does, remains a separate request.
*/
export const upgradeAccount = wrap(async (req, res) => {
  const userId = actorId(req);
  const { accountType, category, contactEmail, contactPhone, website } = req.body || {};

  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!PROFESSIONAL.includes(accountType)) {
    return fail(res, 422, `accountType must be one of: ${PROFESSIONAL.join(", ")}`);
  }

  const user = await User.findById(userId).select("accountType creatorProfile").lean();
  if (!user) return fail(res, 404, "User not found");
  if (user.accountType === accountType) {
    return fail(res, 409, `This is already a ${accountType} account`);
  }
  // A business must say what it is; a creator category is optional.
  if (accountType === "business" && !String(category || user.creatorProfile?.category || "").trim()) {
    return fail(res, 400, "A business account needs a category");
  }

  const set = {
    accountType,
    "creatorProfile.upgradedAt": new Date(),
    "creatorProfile.previousType": user.accountType || "personal",
  };
  if (category !== undefined) set["creatorProfile.category"] = String(category).slice(0, 60);
  if (contactEmail !== undefined) set["creatorProfile.contactEmail"] = String(contactEmail).slice(0, 120);
  if (contactPhone !== undefined) set["creatorProfile.contactPhone"] = String(contactPhone).slice(0, 40);
  if (website !== undefined) set["creatorProfile.website"] = String(website).slice(0, 200);

  await User.updateOne({ _id: oid(userId) }, { $set: set });
  const fresh = await User.findById(userId).select("accountType creatorProfile").lean();

  ok(res, {
    message: `Switched to a ${accountType} account`,
    accountType: fresh.accountType,
    creatorProfile: fresh.creatorProfile,
    unlocked: ["analytics", "subscriptions", "ads", "scheduling"],
  });
});

/*
  Back to a personal account.

  The professional details are kept rather than wiped: someone downgrading for a
  while should not have to retype their category and contact details to come
  back. What they lose is what `accountType` gates, which is the point.
*/
export const downgradeAccount = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("accountType").lean();
  if (!user) return fail(res, 404, "User not found");
  if (user.accountType === "personal") {
    return fail(res, 409, "This is already a personal account");
  }

  const running = await AdCampaign.countDocuments({
    advertiser: oid(userId), status: { $in: ["pending", "active", "paused"] },
  });
  if (running) {
    return fail(res, 409, "Stop your running campaigns before switching back", { running });
  }

  await User.updateOne({ _id: oid(userId) }, {
    $set: { accountType: "personal", "creatorProfile.previousType": user.accountType },
  });
  ok(res, { message: "Switched to a personal account", accountType: "personal" });
});

export const accountStatusInfo = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId)
    .select("accountType creatorProfile verifiedBadge followers").lean();
  if (!user) return fail(res, 404, "User not found");

  const professional = PROFESSIONAL.includes(user.accountType);
  ok(res, {
    accountType: user.accountType || "personal",
    professional,
    verifiedBadge: !!user.verifiedBadge,
    followers: count(user.followers),
    creatorProfile: user.creatorProfile || {},
    can: {
      analytics: professional,
      subscriptions: professional,
      ads: professional,
      scheduling: professional,
    },
  });
});

/* Everything below is for professional accounts only. */
const requireProfessional = async (userId) => {
  const user = await User.findById(userId).select("accountType").lean();
  if (!user) return { error: [404, "User not found"] };
  if (!PROFESSIONAL.includes(user.accountType)) {
    return { error: [403, "Switch to a creator or business account to use this"] };
  }
  return { user };
};

/* ------------------------------------------------------------------ */
/* 2. Analytics (views, reach, impressions)                            */
/* ------------------------------------------------------------------ */

/*
  Record an impression.

  Separate from markViewed(), which counts distinct accounts and is what
  "views" and "reach" mean. This counts every time the post was put in front of
  someone, the same person twice included — the two figures answer different
  questions and a single counter cannot serve both.
*/
export const recordImpression = wrap(async (req, res) => {
  const { id } = req.params;
  const times = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 50);
  if (!isId(id)) return fail(res, 400, "A valid post id is required");

  const post = await Reels.findByIdAndUpdate(
    id, { $inc: { impressions: times } }, { new: true }
  ).select("impressions boostCampaign boostedUntil").lean();
  if (!post) return fail(res, 404, "Post not found");

  /*
    A boosted post spends its campaign's budget as it is shown. The debit is a
    conditional update — it only matches while the campaign is under budget —
    so the campaign cannot overspend when two impressions land together, and it
    closes itself the moment the budget is gone.
  */
  let campaign = null;
  if (post.boostCampaign && post.boostedUntil && new Date(post.boostedUntil) > new Date()) {
    campaign = await AdCampaign.findById(post.boostCampaign).lean();
    if (campaign && campaignIsLive(campaign)) {
      const cost = (campaign.costPerImpression || 1) * times;
      const spent = await AdCampaign.findOneAndUpdate(
        { _id: campaign._id, status: "active", $expr: { $lte: [{ $add: ["$spentCoins", cost] }, "$budgetCoins"] } },
        { $inc: { "metrics.impressions": times, spentCoins: cost }, $set: { updatedAt: new Date() } },
        { new: true }
      ).lean();

      if (spent && spent.spentCoins >= spent.budgetCoins) {
        await AdCampaign.updateOne({ _id: spent._id }, { $set: { status: "completed" } });
        await Reels.updateOne({ _id: id }, { $set: { boostedUntil: null, boostCampaign: null } });
      }
      campaign = spent || campaign;
    }
  }

  ok(res, {
    impressions: post.impressions,
    campaign: campaign ? {
      _id: campaign._id,
      spentCoins: campaign.spentCoins,
      budgetCoins: campaign.budgetCoins,
      remaining: Math.max((campaign.budgetCoins || 0) - (campaign.spentCoins || 0), 0),
    } : null,
  });
});

/*
  The creator dashboard.

  Every figure is paired with the same figure for the window immediately before
  it, because "1,240 views" says nothing on its own — the question a creator is
  actually asking is whether that is more or less than last week.
*/
export const analyticsOverview = wrap(async (req, res) => {
  const userId = actorId(req);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const gate = await requireProfessional(userId);
  if (gate.error) return fail(res, ...gate.error);

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS);
  const priorStart = new Date(now.getTime() - 2 * days * DAY_MS);

  const posts = await Reels.find({
    username: oid(userId),
    status_draft_publish: "Publish",
    status: { $nin: ["hidden", "deleted"] },
  }).select("viewsCount impressions likes comments shares savepost xtime viewedBy").lean();

  const totals = (rows) => rows.reduce((acc, p) => {
    acc.views += p.viewsCount || 0;
    acc.impressions += p.impressions || 0;
    acc.likes += count(p.likes);
    acc.comments += count(p.comments);
    acc.shares += count(p.shares);
    acc.saves += count(p.savepost);
    return acc;
  }, { views: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 });

  const inWindow = posts.filter((p) => new Date(p.xtime) >= windowStart);
  const inPrior = posts.filter((p) => {
    const t = new Date(p.xtime);
    return t >= priorStart && t < windowStart;
  });

  const current = totals(inWindow);
  const prior = totals(inPrior);
  const lifetime = totals(posts);

  /*
    Reach is distinct accounts across the window's posts, not the sum of each
    post's viewers — one person who saw three posts is one account reached, and
    adding the per-post figures would count them three times.
  */
  const reachSet = new Set();
  for (const p of inWindow) {
    for (const v of p.viewedBy || []) reachSet.add(String(v.user || v));
  }

  const engagements = current.likes + current.comments + current.shares + current.saves;
  const delta = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10);

  ok(res, {
    windowDays: days,
    posts: { published: inWindow.length, previous: inPrior.length, lifetime: posts.length },
    views: { value: current.views, previous: prior.views, changePercent: delta(current.views, prior.views) },
    impressions: {
      value: current.impressions, previous: prior.impressions,
      changePercent: delta(current.impressions, prior.impressions),
    },
    reach: { value: reachSet.size },
    engagement: {
      likes: current.likes, comments: current.comments,
      shares: current.shares, saves: current.saves, total: engagements,
      // Against reach rather than impressions: the share of people who acted,
      // not the share of times something was shown.
      ratePercent: reachSet.size ? Math.round((engagements / reachSet.size) * 1000) / 10 : 0,
    },
    lifetime,
  });
});

/* Per-post figures, ranked — the "what worked" table. */
export const analyticsPosts = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  const sort = ["views", "impressions", "engagement", "recent"].includes(req.query.sort)
    ? req.query.sort : "recent";
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const gate = await requireProfessional(userId);
  if (gate.error) return fail(res, ...gate.error);

  const posts = await Reels.find({
    username: oid(userId),
    status_draft_publish: "Publish",
    status: { $nin: ["hidden", "deleted"] },
  }).select("videoTitle media posttype viewsCount impressions likes comments shares savepost xtime").lean();

  const rows = posts.map((p) => {
    const engagement = count(p.likes) + count(p.comments) + count(p.shares) + count(p.savepost);
    return {
      _id: p._id,
      title: p.videoTitle || "",
      type: p.posttype || "",
      postedAt: p.xtime,
      views: p.viewsCount || 0,
      impressions: p.impressions || 0,
      likes: count(p.likes),
      comments: count(p.comments),
      shares: count(p.shares),
      saves: count(p.savepost),
      engagement,
      // Guarded: a post with impressions but no views would otherwise divide by
      // zero and report Infinity as a percentage.
      engagementRate: p.viewsCount ? Math.round((engagement / p.viewsCount) * 1000) / 10 : 0,
    };
  });

  const sorters = {
    views: (a, b) => b.views - a.views,
    impressions: (a, b) => b.impressions - a.impressions,
    engagement: (a, b) => b.engagement - a.engagement,
    recent: (a, b) => new Date(b.postedAt) - new Date(a.postedAt),
  };
  rows.sort(sorters[sort]);

  ok(res, {
    page, limit, total: rows.length, sort,
    hasMore: skip + limit < rows.length,
    posts: rows.slice(skip, skip + limit),
  });
});

/* One post in detail, including who a boost reached. */
export const analyticsPost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and post id are required");

  const post = await Reels.findById(id)
    .select("username videoTitle viewsCount impressions likes comments shares savepost xtime boostCampaign boostedUntil")
    .lean();
  if (!post) return fail(res, 404, "Post not found");
  if (!sameId(post.username, userId)) return fail(res, 403, "That is not your post");

  const engagement = count(post.likes) + count(post.comments) + count(post.shares) + count(post.savepost);
  const campaign = post.boostCampaign
    ? await AdCampaign.findById(post.boostCampaign)
        .select("status budgetCoins spentCoins metrics endAt").lean()
    : null;

  ok(res, {
    postId: post._id,
    title: post.videoTitle || "",
    postedAt: post.xtime,
    views: post.viewsCount || 0,
    impressions: post.impressions || 0,
    likes: count(post.likes),
    comments: count(post.comments),
    shares: count(post.shares),
    saves: count(post.savepost),
    engagement,
    engagementRate: post.viewsCount ? Math.round((engagement / post.viewsCount) * 1000) / 10 : 0,
    boost: campaign,
    boostedUntil: post.boostedUntil,
  });
});

/* ------------------------------------------------------------------ */
/* 3. Schedule Posts                                                   */
/* ------------------------------------------------------------------ */

/*
  Move a draft to a future publication time.

  The date is the source of truth, not the status: the feed excludes a post
  whose `scheduledFor` is still ahead, so a scheduler that runs late can only
  ever publish late — never early. That ordering is deliberate, because the
  failure mode of the opposite arrangement is a post going public before its
  author meant it to.
*/
export const schedulePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { postId, scheduledFor } = req.body || {};
  if (!isId(userId) || !isId(postId)) {
    return fail(res, 400, "Valid userId and postId are required");
  }

  const when = new Date(scheduledFor);
  if (!scheduledFor || Number.isNaN(when.getTime())) {
    return fail(res, 422, "A valid scheduledFor date is required");
  }
  if (when <= new Date()) {
    return fail(res, 422, "Schedule a time in the future");
  }
  if (when > new Date(Date.now() + 365 * DAY_MS)) {
    return fail(res, 422, "Posts cannot be scheduled more than a year ahead");
  }

  const post = await Reels.findById(postId).select("username status_draft_publish").lean();
  if (!post) return fail(res, 404, "Post not found");
  if (!sameId(post.username, userId)) return fail(res, 403, "That is not your post");
  if (post.status_draft_publish === "Publish") {
    return fail(res, 409, "That post is already published");
  }

  await Reels.updateOne({ _id: postId }, {
    $set: { status_draft_publish: "Scheduled", scheduledFor: when },
  });

  ok(res, { message: "Scheduled", postId, scheduledFor: when });
});

export const listScheduled = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const rows = await Reels.find({
    username: oid(userId), status_draft_publish: "Scheduled",
  }).select("videoTitle media scheduledFor posttype").sort({ scheduledFor: 1 }).lean();

  const now = new Date();
  ok(res, {
    total: rows.length,
    // A scheduled post whose time has passed but which has not been published
    // yet is worth surfacing: it means the scheduler has not run.
    due: rows.filter((r) => new Date(r.scheduledFor) <= now).length,
    scheduled: rows,
  });
});

export const reschedulePost = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { scheduledFor, cancel } = req.body || {};
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and post id are required");

  const post = await Reels.findById(id).select("username status_draft_publish").lean();
  if (!post) return fail(res, 404, "Post not found");
  if (!sameId(post.username, userId)) return fail(res, 403, "That is not your post");
  if (post.status_draft_publish !== "Scheduled") {
    return fail(res, 409, "That post is not scheduled");
  }

  if (cancel) {
    // Back to a draft, not published — cancelling a schedule must never be a
    // way to publish something by accident.
    await Reels.updateOne({ _id: id }, {
      $set: { status_draft_publish: "Draft", scheduledFor: null },
    });
    return ok(res, { message: "Schedule cancelled — the post is a draft again", postId: id });
  }

  const when = new Date(scheduledFor);
  if (!scheduledFor || Number.isNaN(when.getTime())) {
    return fail(res, 422, "A valid scheduledFor date is required");
  }
  if (when <= new Date()) return fail(res, 422, "Schedule a time in the future");

  await Reels.updateOne({ _id: id }, { $set: { scheduledFor: when } });
  ok(res, { message: "Rescheduled", postId: id, scheduledFor: when });
});

/*
  Publish everything now due.

  Idempotent and safe to call from anywhere — a timer, a cron, or a client
  opening the app. The query itself is the guard: it only matches posts still
  marked "Scheduled" with a date in the past, so two callers racing publish the
  same post once between them.
*/
export const publishDue = wrap(async (req, res) => {
  const result = await runDuePublish();
  ok(res, { message: `${result.published} post(s) published`, ...result });
});

export const runDuePublish = async () => {
  const now = new Date();
  const due = await Reels.find({
    status_draft_publish: "Scheduled",
    scheduledFor: { $lte: now, $ne: null },
  }).select("_id username scheduledFor").limit(200).lean();

  if (!due.length) return { published: 0, posts: [] };

  const r = await Reels.updateMany(
    { _id: { $in: due.map((d) => d._id) }, status_draft_publish: "Scheduled" },
    { $set: { status_draft_publish: "Publish", xtime: now } }
  );

  return { published: r.modifiedCount, posts: due.map((d) => String(d._id)) };
};

/* ------------------------------------------------------------------ */
/* 4 + 5. Boost a Post, and the Ads Management Panel                   */
/* ------------------------------------------------------------------ */

/*
  Create a campaign — a post boost or a standalone ad.

  The whole budget is debited when the campaign is created rather than drawn
  down impression by impression. Charging as it spends means a campaign can
  overdraw between two impressions arriving together; holding the budget up
  front makes running out a bookkeeping fact instead of a race, and the unspent
  remainder is refunded whenever it stops.
*/
export const createCampaign = wrap(async (req, res) => {
  const userId = actorId(req);
  const {
    kind, name, postId, creative, budgetCoins, costPerImpression,
    targeting, days, startAt,
  } = req.body || {};

  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!["boost", "ad"].includes(kind)) return fail(res, 422, "kind must be boost or ad");

  const gate = await requireProfessional(userId);
  if (gate.error) return fail(res, ...gate.error);

  const budget = Math.round(Number(budgetCoins));
  if (!Number.isFinite(budget) || budget < 1) {
    return fail(res, 422, "budgetCoins must be at least 1");
  }
  const cpi = Math.round(Number(costPerImpression) || 1);
  if (cpi < 1) return fail(res, 422, "costPerImpression must be at least 1");
  if (cpi > budget) return fail(res, 422, "The budget must cover at least one impression");

  const runDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
  const start = startAt ? new Date(startAt) : new Date();
  if (Number.isNaN(start.getTime())) return fail(res, 422, "startAt is not a valid date");
  const end = new Date(start.getTime() + runDays * DAY_MS);

  let post = null;
  if (kind === "boost") {
    if (!isId(postId)) return fail(res, 400, "A boost needs a postId");
    post = await Reels.findById(postId).select("username status_draft_publish").lean();
    if (!post) return fail(res, 404, "Post not found");
    if (!sameId(post.username, userId)) return fail(res, 403, "You can only boost your own post");
    if (post.status_draft_publish !== "Publish") {
      return fail(res, 409, "Publish the post before boosting it");
    }
    const running = await AdCampaign.findOne({
      post: oid(postId), status: { $in: ["pending", "active", "paused"] },
    }).select("_id").lean();
    if (running) return fail(res, 409, "That post already has a campaign running");
  } else if (!String(creative?.headline || "").trim()) {
    return fail(res, 400, "An ad needs a headline");
  }

  // Conditional debit: two campaigns created at once cannot both pass the
  // balance check and overdraw the wallet.
  const paid = await debitCoins(userId, budget);
  if (!paid) {
    const me = await User.findById(userId).select("coins").lean();
    return fail(res, 402, `Not enough coins — ${me?.coins || 0} available, ${budget} needed`);
  }

  const campaign = await AdCampaign.create({
    advertiser: oid(userId),
    kind,
    name: String(name || (kind === "boost" ? "Post boost" : "Ad campaign")).slice(0, 120),
    post: kind === "boost" ? oid(postId) : null,
    creative: kind === "ad" ? {
      headline: String(creative.headline).slice(0, 120),
      body: String(creative.body || "").slice(0, 400),
      image: creative.image || "",
      linkUrl: creative.linkUrl || "",
      callToAction: String(creative.callToAction || "Learn more").slice(0, 40),
    } : {},
    budgetCoins: budget,
    costPerImpression: cpi,
    // Submitted straight for review rather than left as a draft: the coins are
    // already held, and an invisible draft holding someone's balance is the
    // kind of thing nobody finds until they go looking for missing coins.
    status: "pending",
    targeting: {
      interests: Array.isArray(targeting?.interests) ? targeting.interests.slice(0, 20) : [],
      cities: Array.isArray(targeting?.cities) ? targeting.cities.slice(0, 20) : [],
      countries: Array.isArray(targeting?.countries) ? targeting.countries.slice(0, 20) : [],
      minAge: Number.isFinite(Number(targeting?.minAge)) ? Number(targeting.minAge) : null,
      maxAge: Number.isFinite(Number(targeting?.maxAge)) ? Number(targeting.maxAge) : null,
    },
    startAt: start,
    endAt: end,
  });

  const me = await User.findById(userId).select("coins").lean();
  ok(res, {
    message: "Campaign submitted for review",
    campaign,
    estimatedImpressions: Math.floor(budget / cpi),
    coinsHeld: budget,
    coins: me?.coins || 0,
  });
});

export const listCampaigns = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { advertiser: oid(userId) };
  if (req.query.status) filter.status = String(req.query.status);

  const [rows, total, held] = await Promise.all([
    AdCampaign.find(filter).populate("post", "videoTitle media")
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdCampaign.countDocuments(filter),
    AdCampaign.aggregate([
      { $match: { advertiser: oid(userId), status: { $in: HOLDING_STATUSES } } },
      { $group: { _id: null, budget: { $sum: "$budgetCoins" }, spent: { $sum: "$spentCoins" } } },
    ]),
  ]);

  ok(res, {
    page, limit, total,
    coinsCommitted: held[0]?.budget || 0,
    coinsSpent: held[0]?.spent || 0,
    campaigns: rows.map((c) => ({
      ...c,
      live: campaignIsLive(c),
      remainingCoins: Math.max((c.budgetCoins || 0) - (c.spentCoins || 0), 0),
    })),
  });
});

export const campaignDetail = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and campaign id are required");

  const campaign = await AdCampaign.findById(id).populate("post", "videoTitle media viewsCount impressions").lean();
  if (!campaign) return fail(res, 404, "Campaign not found");
  if (!sameId(campaign.advertiser, userId)) return fail(res, 403, "That is not your campaign");

  const remaining = Math.max((campaign.budgetCoins || 0) - (campaign.spentCoins || 0), 0);
  ok(res, {
    campaign,
    live: campaignIsLive(campaign),
    remainingCoins: remaining,
    impressionsRemaining: Math.floor(remaining / (campaign.costPerImpression || 1)),
    // Cost per thousand, the figure advertisers actually compare on.
    cpm: campaign.metrics?.impressions
      ? Math.round((campaign.spentCoins / campaign.metrics.impressions) * 1000)
      : null,
  });
});

/* Pause or resume. Paused keeps the hold; only stopping releases it. */
export const setCampaignState = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const action = String(req.body?.action || "").toLowerCase();
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and campaign id are required");
  if (!["pause", "resume"].includes(action)) return fail(res, 400, "action must be pause or resume");

  const campaign = await AdCampaign.findById(id).lean();
  if (!campaign) return fail(res, 404, "Campaign not found");
  if (!sameId(campaign.advertiser, userId)) return fail(res, 403, "That is not your campaign");

  if (action === "pause") {
    if (campaign.status !== "active") return fail(res, 409, `A ${campaign.status} campaign cannot be paused`);
    await AdCampaign.updateOne({ _id: id }, { $set: { status: "paused", updatedAt: new Date() } });
    if (campaign.post) await Reels.updateOne({ _id: campaign.post }, { $set: { boostedUntil: null } });
    return ok(res, { message: "Campaign paused", status: "paused" });
  }

  if (campaign.status !== "paused") return fail(res, 409, `A ${campaign.status} campaign cannot be resumed`);
  if (campaign.spentCoins >= campaign.budgetCoins) {
    return fail(res, 409, "That campaign has spent its whole budget");
  }
  await AdCampaign.updateOne({ _id: id }, { $set: { status: "active", updatedAt: new Date() } });
  if (campaign.post) {
    await Reels.updateOne({ _id: campaign.post }, {
      $set: { boostedUntil: campaign.endAt, boostCampaign: campaign._id },
    });
  }
  ok(res, { message: "Campaign resumed", status: "active" });
});

/*
  Stop a campaign and refund what it never spent.

  The refund is the whole reason the budget was held rather than charged per
  impression: what is left is unambiguous, and giving it back is one write
  instead of a reconciliation.
*/
export const cancelCampaign = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and campaign id are required");

  const campaign = await AdCampaign.findById(id).lean();
  if (!campaign) return fail(res, 404, "Campaign not found");
  if (!sameId(campaign.advertiser, userId)) return fail(res, 403, "That is not your campaign");
  if (["cancelled", "rejected", "completed"].includes(campaign.status)) {
    return fail(res, 409, `That campaign is already ${campaign.status}`);
  }

  const refund = Math.max((campaign.budgetCoins || 0) - (campaign.spentCoins || 0), 0);
  await AdCampaign.updateOne({ _id: id }, {
    $set: { status: "cancelled", refundedCoins: refund, updatedAt: new Date() },
  });
  if (campaign.post) {
    await Reels.updateOne({ _id: campaign.post }, { $set: { boostedUntil: null, boostCampaign: null } });
  }
  if (refund > 0) await creditCoins(userId, refund);

  const me = await User.findById(userId).select("coins").lean();
  ok(res, {
    message: "Campaign cancelled",
    refundedCoins: refund,
    spentCoins: campaign.spentCoins || 0,
    coins: me?.coins || 0,
  });
});

/* ------------------------------------------------------------------ */
/* 6. Admin — reviewing campaigns                                      */
/* ------------------------------------------------------------------ */

export const adminListCampaigns = wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);

  const [rows, total, pending] = await Promise.all([
    AdCampaign.find(filter).populate("advertiser", "name email image accountType")
      .populate("post", "videoTitle").sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    AdCampaign.countDocuments(filter),
    AdCampaign.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, n: { $sum: 1 }, coins: { $sum: "$budgetCoins" } } },
    ]),
  ]);

  ok(res, {
    page, limit, total,
    pendingCount: pending[0]?.n || 0,
    pendingCoins: pending[0]?.coins || 0,
    campaigns: rows,
  });
});

/*
  Approve or reject.

  Approving starts the campaign and stamps the boost onto the post, which is
  what makes ranking cheap later. Rejecting refunds the whole budget — nothing
  was shown, so nothing was spent.
*/
export const adminReviewCampaign = wrap(async (req, res) => {
  const adminId = actorId(req);
  const { id } = req.params;
  const action = String(req.body?.action || "").toLowerCase();
  const { note } = req.body || {};

  if (!isId(id)) return fail(res, 400, "A valid campaign id is required");
  if (!["approve", "reject"].includes(action)) return fail(res, 400, "action must be approve or reject");

  const campaign = await AdCampaign.findById(id).lean();
  if (!campaign) return fail(res, 404, "Campaign not found");
  if (campaign.status !== "pending") {
    return fail(res, 409, `That campaign is already ${campaign.status}`);
  }

  const set = {
    reviewedBy: isId(adminId) ? oid(adminId) : null,
    reviewedAt: new Date(),
    reviewNote: String(note || "").slice(0, 300),
    updatedAt: new Date(),
  };

  if (action === "reject") {
    const refund = campaign.budgetCoins || 0;
    await AdCampaign.updateOne({ _id: id }, { $set: { ...set, status: "rejected", refundedCoins: refund } });
    await creditCoins(campaign.advertiser, refund);
    return ok(res, { message: "Campaign rejected and the budget refunded", refundedCoins: refund });
  }

  await AdCampaign.updateOne({ _id: id }, { $set: { ...set, status: "active" } });
  if (campaign.post) {
    await Reels.updateOne({ _id: campaign.post }, {
      $set: { boostedUntil: campaign.endAt, boostCampaign: campaign._id },
    });
  }
  ok(res, { message: "Campaign approved and running", status: "active" });
});
