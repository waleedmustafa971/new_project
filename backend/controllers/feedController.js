/*
  Social Feed (Timeline) — mobile-facing API.

  Covers the whole "Social Feed" section of the module sheet:
    home / For You feed, trending, stories, hashtags, check-ins & nearby,
    recommendations, tagging, polls and carousels.

  Runs alongside the older /apis/reel and /apis/postreel endpoints rather than
  replacing them, so app screens can migrate one at a time. Responses keep the
  legacy field names the current screens read.
*/

import mongoose from "mongoose";
import Reels from "../models/Reels.js";
import User from "../models/users.js";
import Hashtag from "../models/Hashtag.js";
import {
  buildViewerContext, baseMatch, filterByPrivacy, shapeFeedItem,
  scoreForYou, scoreTrending, engagementOf, timeDecay,
  extractHashtags, resolveMentions, touchHashtags,
  POSTTYPE, AUTHOR_FIELDS, isId,
} from "../helpers/feed.js";
import { needsFollowApproval } from "../helpers/privacy.js";
import { notify, notifyMany } from "../services/notificationService.js";
import { notifyPagePost } from "../helpers/pageNotify.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[feed]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 10) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/*
  Background colour is stored as a comma-separated gradient. The mobile
  <LinearGradient> needs >= 2 stops, so a single colour is doubled here rather
  than left for every client to guard.
*/
const normalizeBgColor = (v) => {
  const parts = (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((c) => String(c).trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  return (parts.length === 1 ? [parts[0], parts[0]] : parts).join(",");
};

/* ------------------------------------------------------------------ */
/* 1. Home feed — following, chronological                             */
/* ------------------------------------------------------------------ */

export const homeFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req);
  const type = req.query.type; // post | reel | story, omit for all

  const ctx = await buildViewerContext(viewerId);

  const match = baseMatch(ctx, { type });
  // Stories have their own screen; keep them out of the main timeline
  if (!type) match.posttype = { $not: POSTTYPE.story };

  // Following feed, with the viewer's own posts included
  if (ctx.viewerId) {
    const authors = [...ctx.following, ctx.viewerId].map(oid);
    if (authors.length) {
      match.username = match.username
        ? { $in: authors, ...match.username }
        : { $in: authors };
    }
  }

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .skip(skip)
    .limit(limit + 10) // headroom for the privacy pass
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  const visible = (await filterByPrivacy(docs, ctx.viewerId)).slice(0, limit);
  const total = await Reels.countDocuments(match);

  ok(res, {
    page, limit, total,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + visible.length < total,
    items: visible.map((d) => shapeFeedItem(d, ctx)),
  });
});

/* ------------------------------------------------------------------ */
/* 2. "For You" personalised feed                                      */
/* ------------------------------------------------------------------ */

/*
  Pulls a candidate pool wider than the page, scores every candidate against
  the viewer, then returns the top slice. Each item carries the reasons it
  ranked, so the app can show "Because you follow X".
*/
export const forYouFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req);

  const ctx = await buildViewerContext(viewerId);

  const match = baseMatch(ctx);
  match.posttype = { $not: POSTTYPE.story };

  // Candidate pool: recent content, plus anything strongly engaged with.
  // Deliberately wider than the page so ranking has something to choose from.
  const POOL = Math.min(Math.max(limit * 12, 120), 400);
  const candidates = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(POOL)
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  const visible = await filterByPrivacy(candidates, ctx.viewerId);

  const ranked = visible
    .map((doc) => {
      const { score, reasons } = scoreForYou(doc, ctx);
      return { doc, score, reasons };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  const pageItems = ranked.slice(skip, skip + limit);

  // New accounts have no signal at all — fall back to trending so the screen
  // is never empty on first launch.
  const cold = ctx.following.length === 0 && Object.keys(ctx.affinity).length === 0;

  ok(res, {
    page, limit,
    total: ranked.length,
    hasMore: skip + pageItems.length < ranked.length,
    personalised: !cold,
    strategy: cold ? "trending-fallback" : "personalised",
    items: pageItems.map(({ doc, score, reasons }) =>
      shapeFeedItem(doc, ctx, { score: Math.round(score * 100) / 100, reasons })
    ),
  });
});

/* ------------------------------------------------------------------ */
/* 3. Trending — posts, hashtags and creators                          */
/* ------------------------------------------------------------------ */

export const trending = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
  const windowHours = Math.min(parseInt(req.query.hours, 10) || 72, 24 * 14);

  const ctx = await buildViewerContext(viewerId);
  const since = new Date(Date.now() - windowHours * 3600 * 1000);

  const match = baseMatch(ctx);
  match.posttype = { $not: POSTTYPE.story };
  match.xtime = { $gte: since };

  const candidates = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(400)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(candidates, ctx.viewerId);

  const posts = visible
    .map((doc) => ({ doc, score: scoreTrending(doc) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  /*
    Raw trending scores decay steeply, so over a long window they all collapse
    towards zero and round to the same number. Rank order is what matters, so
    report each score relative to the leader on a 0-100 scale.
  */
  const normalise = (rows, get) => {
    const top = rows.length ? get(rows[0]) : 0;
    return (row) => (top > 0 ? Math.round((get(row) / top) * 100) : 0);
  };
  const postHeat = normalise(posts, (r) => r.score);

  // Hashtags: admin-pinned first, then whatever is actually moving in-window
  const pinned = await Hashtag.find({ isTrending: true, isBlocked: { $ne: true } })
    .sort({ trendingRank: 1 })
    .limit(limit)
    .lean();

  const organicCount = {};
  for (const doc of visible) {
    const weight = engagementOf(doc) * timeDecay(doc.xtime, 1.8) + 1;
    for (const t of doc.hashtags || []) organicCount[t] = (organicCount[t] || 0) + weight;
  }

  const blocked = new Set((await Hashtag.find({ isBlocked: true }).select("tag").lean()).map((h) => h.tag));
  const pinnedTags = new Set(pinned.map((h) => h.tag));

  const organic = Object.entries(organicCount)
    .filter(([tag]) => !blocked.has(tag) && !pinnedTags.has(tag))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, score]) => ({
      tag,
      posts: visible.filter((d) => (d.hashtags || []).includes(tag)).length,
      score: Math.round(score),
      pinned: false,
    }));

  const hashtags = [
    ...pinned.map((h) => ({ tag: h.tag, posts: h.postCount, score: null, pinned: true })),
    ...organic,
  ].slice(0, limit);

  // Creators: whose content is performing in this window
  const byAuthor = {};
  for (const doc of visible) {
    const id = String(doc.username?._id || doc.username);
    if (!byAuthor[id]) byAuthor[id] = { author: doc.username, score: 0, raw: 0, posts: 0 };
    byAuthor[id].score += scoreTrending(doc);
    byAuthor[id].raw += engagementOf(doc);
    byAuthor[id].posts += 1;
  }

  const creatorRows = Object.entries(byAuthor)
    .filter(([id]) => id !== ctx.viewerId)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);
  const creatorHeat = normalise(creatorRows, (r) => r[1].score);

  const creators = creatorRows.map((row) => {
    const [id, v] = row;
    return {
      _id: id,
      name: v.author?.name,
      image: v.author?.image,
      verifiedBadge: !!v.author?.verifiedBadge,
      posts: v.posts,
      heat: creatorHeat(row),        // 0-100 relative to the top creator
      engagement: Math.round(v.raw), // absolute interactions in-window
      isFollowing: ctx.following.includes(id),
    };
  });

  ok(res, {
    windowHours,
    posts: posts.map((row) =>
      shapeFeedItem(row.doc, ctx, {
        heat: postHeat(row),
        engagement: Math.round(engagementOf(row.doc)),
      })
    ),
    hashtags,
    creators,
  });
});

/* ------------------------------------------------------------------ */
/* 4. Stories — 24-hour content, grouped by author                     */
/* ------------------------------------------------------------------ */

export const storyFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const ctx = await buildViewerContext(viewerId);

  const match = baseMatch(ctx, { type: "story" });
  // A story counts as live if expiresAt is ahead, or (for older documents that
  // predate the field) it was posted within the last 24 hours.
  /*
    Pushed onto whatever baseMatch() already put in `$and`, not assigned over it.
    baseMatch uses `$and` for the scheduled-post guard, and replacing the array
    here would silently drop that guard for the story feed alone — the kind of
    leak that only shows up once someone schedules a story.
  */
  match.$and = [
    ...(match.$and || []),
    ...(match.$and || []),
    {
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null, xtime: { $gte: new Date(Date.now() - STORY_TTL_MS) } },
        { expiresAt: { $exists: false }, xtime: { $gte: new Date(Date.now() - STORY_TTL_MS) } },
      ],
    },
  ];
  delete match.$or;

  // Only people the viewer follows, plus their own
  if (ctx.viewerId) {
    match.username = { $in: [...ctx.following, ctx.viewerId].map(oid) };
    if (ctx.hidden.length) match.username.$nin = ctx.hidden.map(oid);
  }

  const docs = await Reels.find(match)
    .sort({ xtime: 1 })
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(docs, ctx.viewerId, "stories");

  // Group into per-author rings, mine first, then unseen, then seen
  const groups = new Map();
  for (const doc of visible) {
    const id = String(doc.username?._id || doc.username);
    if (!groups.has(id)) {
      groups.set(id, {
        user: {
          _id: id,
          name: doc.username?.name,
          image: doc.username?.image,
          verifiedBadge: !!doc.username?.verifiedBadge,
        },
        isMine: id === ctx.viewerId,
        items: [],
      });
    }
    groups.get(id).items.push(shapeFeedItem(doc, ctx));
  }

  const rings = [...groups.values()].map((g) => {
    const unseen = g.items.filter((i) => !i.isViewed).length;
    return {
      ...g,
      total: g.items.length,
      unseen,
      allSeen: unseen === 0,
      latestAt: g.items[g.items.length - 1]?.xtime,
    };
  });

  rings.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return new Date(b.latestAt) - new Date(a.latestAt);
  });

  ok(res, { rings, totalStories: visible.length });
});

// Mark a story (or any post) as viewed by this user.
export const markViewed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid content id");
  if (!isId(viewerId)) return fail(res, 400, "A valid userId is required");

  const already = await Reels.findOne({ _id: id, "viewedBy.user": oid(viewerId) }).select("_id").lean();
  if (already) {
    const doc = await Reels.findById(id).select("viewsCount").lean();
    return ok(res, { viewed: true, views: doc?.viewsCount || 0, counted: false });
  }

  const doc = await Reels.findByIdAndUpdate(
    id,
    { $addToSet: { viewedBy: { user: viewerId, at: new Date() } }, $inc: { viewsCount: 1 } },
    { new: true }
  ).select("viewsCount username posttype").lean();
  if (!doc) return fail(res, 404, "Content not found");

  /*
    Story view notification.

    Only on the first view — the branch above returns early for a repeat, so
    this cannot fire twice for the same watcher — and only for stories, since
    "someone looked at your post" is not a thing anybody wants told. The
    `storyViews` preference is off by default: being pinged for every viewer is
    the noisiest thing a social app can do, so it is opt-in rather than opt-out.
  */
  if (POSTTYPE.story.test(String(doc.posttype || ""))) {
    await notify({
      recipient: doc.username, actor: viewerId, type: "story_view", post: id,
    });
  }

  ok(res, { viewed: true, views: doc.viewsCount, counted: true });
});

// Who watched my story
export const storyViewers = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid content id");

  const doc = await Reels.findById(id)
    .select("username viewedBy viewsCount")
    .populate("viewedBy.user", "name image verifiedBadge")
    .lean();
  if (!doc) return fail(res, 404, "Story not found");
  if (String(doc.username) !== String(viewerId)) {
    return fail(res, 403, "Only the author can see who viewed this story");
  }

  ok(res, {
    views: doc.viewsCount || 0,
    viewers: (doc.viewedBy || [])
      .filter((v) => v.user)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .map((v) => ({ ...v.user, at: v.at })),
  });
});

/* ------------------------------------------------------------------ */
/* 5. Hashtags                                                         */
/* ------------------------------------------------------------------ */

export const hashtagFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 20);
  const tag = String(req.params.tag || "").replace(/^#/, "").toLowerCase().trim();
  if (!tag) return fail(res, 400, "A hashtag is required");

  const meta = await Hashtag.findOne({ tag }).lean();
  if (meta?.isBlocked) return fail(res, 403, "This hashtag is not available");

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match.hashtags = tag;

  const sort = req.query.sort === "top" ? { engagementScore: -1, xtime: -1 } : { xtime: -1 };

  const docs = await Reels.find(match)
    .sort(sort)
    .skip(skip)
    .limit(limit + 10)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  let visible = await filterByPrivacy(docs, ctx.viewerId);
  if (req.query.sort === "top") {
    visible = visible.sort((a, b) => engagementOf(b) - engagementOf(a));
  }
  visible = visible.slice(0, limit);

  const total = await Reels.countDocuments(match);

  ok(res, {
    tag,
    total,
    isTrending: !!meta?.isTrending,
    page, limit,
    hasMore: skip + visible.length < total,
    items: visible.map((d) => shapeFeedItem(d, ctx)),
  });
});

export const searchHashtags = wrap(async (req, res) => {
  const q = String(req.query.q || "").replace(/^#/, "").toLowerCase().trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  const filter = { isBlocked: { $ne: true } };
  if (q) filter.tag = new RegExp("^" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const rows = await Hashtag.find(filter)
    .sort({ isTrending: -1, postCount: -1 })
    .limit(limit)
    .lean();

  ok(res, {
    rows: rows.map((h) => ({ tag: h.tag, posts: h.postCount, isTrending: !!h.isTrending })),
    total: rows.length,
  });
});

/* ------------------------------------------------------------------ */
/* 6. Check-ins, location tagging and nearby                           */
/* ------------------------------------------------------------------ */

// Places already used in check-ins — powers the location picker's suggestions.
export const searchPlaces = wrap(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  const match = { "place.name": { $exists: true, $ne: null } };
  if (q) match["place.name"] = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const rows = await Reels.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$place.name",
        posts: { $sum: 1 },
        city: { $first: "$place.city" },
        country: { $first: "$place.country" },
        placeId: { $first: "$place.placeId" },
        location: { $first: "$place.location" },
        lastUsed: { $max: "$xtime" },
      },
    },
    { $sort: { posts: -1, lastUsed: -1 } },
    { $limit: limit },
  ]);

  ok(res, {
    rows: rows.map((r) => ({
      name: r._id, posts: r.posts, city: r.city, country: r.country,
      placeId: r.placeId, location: r.location,
    })),
    total: rows.length,
  });
});

// Everything checked in at one place
export const placeFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 20);
  const name = String(req.query.name || "").trim();
  if (!name) return fail(res, 400, "A place name is required");

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match["place.name"] = name;

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .skip(skip)
    .limit(limit + 10)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = (await filterByPrivacy(docs, ctx.viewerId)).slice(0, limit);
  const total = await Reels.countDocuments(match);
  const sample = await Reels.findOne({ "place.name": name }).select("place").lean();

  ok(res, {
    place: sample?.place || { name },
    total, page, limit,
    hasMore: skip + visible.length < total,
    items: visible.map((d) => shapeFeedItem(d, ctx)),
  });
});

// Location-based discovery
export const nearbyFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { limit } = paging(req, 20);
  const lng = parseFloat(req.query.lng);
  const lat = parseFloat(req.query.lat);
  const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 25, 500);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return fail(res, 400, "lng and lat are required");
  }

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);

  const docs = await Reels.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        key: "place.location",
        query: match,
        spherical: true,
      },
    },
    { $limit: limit + 20 },
    { $lookup: { from: "users", localField: "username", foreignField: "_id", as: "author" } },
    { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
    { $addFields: { username: "$author" } },
  ]);

  const visible = (await filterByPrivacy(docs, ctx.viewerId)).slice(0, limit);

  ok(res, {
    center: { lng, lat },
    radiusKm,
    total: visible.length,
    items: visible.map((d) =>
      shapeFeedItem(d, ctx, { distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10 })
    ),
  });
});

/* ------------------------------------------------------------------ */
/* 7. Recommendations — users and posts                                */
/* ------------------------------------------------------------------ */

/*
  Who to follow, ranked by: mutual connections, shared interests, whether the
  viewer already engages with their content, and overall reach.
*/
export const recommendedUsers = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);

  const ctx = await buildViewerContext(viewerId);

  const exclude = [...ctx.following, ...ctx.hidden];
  if (ctx.viewerId) exclude.push(ctx.viewerId);

  const filter = {
    _id: { $nin: exclude.filter(isId).map(oid) },
    accountStatus: { $ne: "banned" },
  };
  // Respect "don't suggest my account"
  filter.$or = [
    { "privacySettings.discoverable": { $ne: false } },
    { privacySettings: { $exists: false } },
  ];

  const pool = await User.find(filter)
    .select("name image bio interest followers following verifiedBadge accountType privacy privacySettings")
    .limit(300)
    .lean();

  const followingSet = new Set(ctx.following);
  const me = ctx.viewerId ? await User.findById(ctx.viewerId).select("interest").lean() : null;

  const ranked = pool
    .map((u) => {
      const reasons = [];
      let score = 0;

      // Mutual connections: people my follows also follow
      const mutuals = (u.followers || []).filter((f) => followingSet.has(String(f))).length;
      if (mutuals > 0) {
        score += Math.min(mutuals * 12, 48);
        reasons.push(`${mutuals} mutual connection${mutuals > 1 ? "s" : ""}`);
      }

      // Shared interests from the signup interest picker
      if (me?.interest && u.interest && me.interest === u.interest) {
        score += 15;
        reasons.push("shares your interests");
      }

      // Already engaging with their content
      const affinity = ctx.affinity[String(u._id)] || 0;
      if (affinity > 0) {
        score += Math.min(affinity * 6, 24);
        reasons.push("you interact with their posts");
      }

      // Reach, dampened so big accounts don't dominate every slot
      const followers = (u.followers || []).length;
      score += Math.log10(followers + 1) * 6;

      if (u.verifiedBadge) { score += 5; reasons.push("verified"); }
      if (reasons.length === 0) reasons.push("popular right now");

      return {
        _id: u._id, name: u.name, image: u.image, bio: u.bio,
        verifiedBadge: !!u.verifiedBadge,
        accountType: u.accountType || "personal",
        followers, mutuals,
        isPrivate: needsFollowApproval(u),
        score: Math.round(score * 100) / 100,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  ok(res, { rows: ranked, total: ranked.length });
});

/*
  Suggested posts: good content from accounts the viewer does NOT follow.
  This is the discovery counterpart to the following feed.
*/
export const recommendedPosts = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { limit } = paging(req, 12);

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match.posttype = { $not: POSTTYPE.story };

  const exclude = [...ctx.following, ...ctx.hidden];
  if (ctx.viewerId) exclude.push(ctx.viewerId);
  if (exclude.length) match.username = { $nin: exclude.filter(isId).map(oid) };

  const candidates = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(250)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(candidates, ctx.viewerId);

  const ranked = visible
    .map((doc) => {
      const { score, reasons } = scoreForYou(doc, ctx);
      return { doc, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  ok(res, {
    total: ranked.length,
    items: ranked.map(({ doc, score, reasons }) =>
      shapeFeedItem(doc, ctx, { score: Math.round(score * 100) / 100, reasons })
    ),
  });
});

/* ------------------------------------------------------------------ */
/* 8. Create / edit content (carousels, polls, check-ins, tags)        */
/* ------------------------------------------------------------------ */

/*
  Single create endpoint for every post type. Accepts JSON with media already
  uploaded (the existing upload endpoints return the URLs).
*/
export const createPost = wrap(async (req, res) => {
  const authorId = actorId(req);
  if (!isId(authorId)) return fail(res, 400, "A valid userId is required");

  const {
    caption = "", posttype = "Post", posttypechild,
    media = [], poll, place, taggedUsers = [],
    sound, videosound, xbackgroundcolor, xfontstyle, xfontsize, xtextalign,
    status_draft_publish = "Publish", sharegroup,
  } = req.body || {};

  const type = String(posttype);
  const isStory = POSTTYPE.story.test(type);
  const isText = (media || []).length === 0;

  // Text/status posts are allowed with no media, everything else needs some
  if (isText && !String(caption).trim() && !poll) {
    return fail(res, 400, "A post needs a caption, media or a poll");
  }
  if (media.length > 10) return fail(res, 400, "A carousel can hold at most 10 items");

  const cleanMedia = media.map((m, i) => ({
    url: m.url,
    type: m.type || (/\.(mp4|mov|webm|m3u8)/i.test(m.url || "") ? "video" : "image"),
    thumbnail: m.thumbnail,
    width: m.width, height: m.height, duration: m.duration,
    altText: m.altText,
    order: m.order !== undefined ? m.order : i,
  })).sort((a, b) => a.order - b.order);

  if (cleanMedia.some((m) => !m.url)) return fail(res, 400, "Every media item needs a url");

  // Poll validation
  let cleanPoll;
  if (poll) {
    const options = (poll.options || []).filter((o) => String(o.text || o).trim());
    if (!poll.question || options.length < 2) {
      return fail(res, 400, "A poll needs a question and at least 2 options");
    }
    if (options.length > 6) return fail(res, 400, "A poll can have at most 6 options");

    cleanPoll = {
      question: String(poll.question).trim(),
      multiple: !!poll.multiple,
      endsAt: poll.endsAt ? new Date(poll.endsAt) : undefined,
      closed: false,
      options: options.map((o, i) => ({
        id: String(o.id || `opt${i + 1}`),
        text: String(o.text || o).trim(),
        votes: [],
      })),
    };
  }

  // Check-in
  let cleanPlace;
  if (place && place.name) {
    cleanPlace = {
      name: String(place.name).trim(),
      address: place.address, city: place.city, country: place.country,
      placeId: place.placeId,
    };
    const lng = parseFloat(place.lng ?? place.longitude ?? place.location?.coordinates?.[0]);
    const lat = parseFloat(place.lat ?? place.latitude ?? place.location?.coordinates?.[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      cleanPlace.location = { type: "Point", coordinates: [lng, lat] };
    }
  }

  // Tag friends — drop anyone who blocked the author or disallows tagging
  const cleanTags = await sanitiseTags(taggedUsers, authorId);

  const hashtags = extractHashtags(caption);
  const mentions = await resolveMentions(caption);
  const now = new Date();

  const doc = await Reels.create({
    // legacy fields, still written so existing screens keep working
    videoUrl: cleanMedia[0] ? { url: cleanMedia[0].url, type: cleanMedia[0].type } : { url: "", type: "text" },
    videoTitle: caption,
    location: cleanPlace?.name,
    tagpeople: cleanTags.length ? cleanTags : undefined,

    posttype: type,
    posttypechild,
    username: authorId,
    sound, videosound,
    xbackgroundcolor: normalizeBgColor(xbackgroundcolor), xfontstyle, xfontsize, xtextalign,
    sharegroup,
    status: "active",
    status_draft_publish: ["Draft", "Publish"].includes(status_draft_publish) ? status_draft_publish : "Publish",

    media: cleanMedia,
    poll: cleanPoll,
    place: cleanPlace,
    taggedUsers: cleanTags,
    hashtags,
    mentions,
    expiresAt: isStory ? new Date(now.getTime() + STORY_TTL_MS) : null,
    xtime: now,
  });

  if (hashtags.length) await touchHashtags(hashtags, now);

  const thumbnail = cleanMedia[0]?.thumbnail || cleanMedia[0]?.url;

  // Everyone tagged hears about it, including those whose tag is pending —
  // the notification is how they find the review queue in the first place.
  if (cleanTags.length) {
    await notifyMany(cleanTags.map((t) => t.user), {
      actor: authorId, type: "tag", post: doc._id, preview: caption, thumbnail,
    });
  }

  // A tagged user already got a "tagged you" line; don't also send a mention.
  if (mentions.length) {
    const tagged = new Set(cleanTags.map((t) => String(t.user)));
    await notifyMany(mentions.filter((m) => !tagged.has(String(m))), {
      actor: authorId, type: "mention_post", post: doc._id, preview: caption, thumbnail,
    });
  }

  /*
    Subscribers to this page hear about it — but only once it is actually
    public. A draft notifies nobody, and a scheduled post notifies when
    runDuePublish releases it, not now.
  */
  if (doc.status_draft_publish === "Publish" && !doc.scheduledFor) {
    await notifyPagePost({
      authorId, postId: doc._id, preview: caption, thumbnail, posttype: doc.posttype,
    });
  }

  const full = await Reels.findById(doc._id)
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  const ctx = await buildViewerContext(authorId);
  ok(res, { message: "Posted", item: shapeFeedItem(full, ctx) });
});

/* Tag friends: only people who allow it and haven't blocked the author. */
async function sanitiseTags(taggedUsers, authorId) {
  const ids = (taggedUsers || [])
    .map((t) => (typeof t === "string" ? t : t.user || t._id))
    .filter(isId);
  if (ids.length === 0) return [];

  const users = await User.find({ _id: { $in: ids.map(oid) } })
    .select("privacy privacySettings followers closeFriends blockedUsers tagReview")
    .lean();

  // Users with tagReview on land in the pending queue instead of being tagged
  // outright — see respondToTag in the engagement controller.
  const needsReview = new Set(users.filter((u) => u.tagReview).map((u) => String(u._id)));
  const allowed = new Set();
  for (const u of users) {
    if ((u.blockedUsers || []).some((b) => String(b) === String(authorId))) continue;
    const setting = effectiveTagSetting(u);
    if (setting === "nobody") continue;
    if (setting === "followers" && !(u.followers || []).some((f) => String(f) === String(authorId))) continue;
    if (setting === "closeFriends" && !(u.closeFriends || []).some((f) => String(f) === String(authorId))) continue;
    allowed.add(String(u._id));
  }

  return (taggedUsers || [])
    .map((t) => (typeof t === "string" ? { user: t } : t))
    .filter((t) => allowed.has(String(t.user || t._id)))
    .map((t) => ({
      user: t.user || t._id,
      x: typeof t.x === "number" ? t.x : undefined,
      y: typeof t.y === "number" ? t.y : undefined,
      mediaIndex: t.mediaIndex || 0,
      approved: !needsReview.has(String(t.user || t._id)),
    }));
}

function effectiveTagSetting(user) {
  const mode = user.privacy || "public";
  if (mode === "custom") return user.privacySettings?.tagging || "everyone";
  if (mode === "private") return "followers";
  return "everyone";
}

export const updatePost = wrap(async (req, res) => {
  const authorId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid post id");

  const doc = await Reels.findById(id).select("username hashtags posttype").lean();
  if (!doc) return fail(res, 404, "Post not found");
  if (String(doc.username) !== String(authorId)) {
    return fail(res, 403, "You can only edit your own posts");
  }

  const update = {};
  if (req.body.caption !== undefined) {
    update.videoTitle = req.body.caption;
    update.hashtags = extractHashtags(req.body.caption);
    update.mentions = await resolveMentions(req.body.caption);
  }
  if (req.body.place !== undefined) {
    if (req.body.place === null) { update.place = undefined; update.location = undefined; }
    else if (req.body.place.name) {
      update.place = { name: req.body.place.name, address: req.body.place.address, city: req.body.place.city, country: req.body.place.country, placeId: req.body.place.placeId };
      const lng = parseFloat(req.body.place.lng ?? req.body.place.longitude);
      const lat = parseFloat(req.body.place.lat ?? req.body.place.latitude);
      if (Number.isFinite(lng) && Number.isFinite(lat)) update.place.location = { type: "Point", coordinates: [lng, lat] };
      update.location = req.body.place.name;
    }
  }
  if (req.body.taggedUsers !== undefined) {
    update.taggedUsers = await sanitiseTags(req.body.taggedUsers, authorId);
  }
  if (req.body.status_draft_publish && ["Draft", "Publish"].includes(req.body.status_draft_publish)) {
    update.status_draft_publish = req.body.status_draft_publish;
  }
  if (Array.isArray(req.body.media)) {
    const cleanMedia = req.body.media.map((m, i) => ({
      url: m.url, type: m.type || "image", thumbnail: m.thumbnail,
      width: m.width, height: m.height, duration: m.duration,
      altText: m.altText, order: m.order !== undefined ? m.order : i,
    })).sort((a, b) => a.order - b.order);
    if (cleanMedia.some((m) => !m.url)) return fail(res, 400, "Every media item needs a url");
    update.media = cleanMedia;
    if (cleanMedia[0]) update.videoUrl = { url: cleanMedia[0].url, type: cleanMedia[0].type };
  }

  const saved = await Reels.findByIdAndUpdate(id, update, { new: true })
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  if (update.hashtags?.length) await touchHashtags(update.hashtags);

  const ctx = await buildViewerContext(authorId);
  ok(res, { message: "Post updated", item: shapeFeedItem(saved, ctx) });
});

export const getPost = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid post id");

  const doc = await Reels.findById(id)
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .populate("comments.username", "name image verifiedBadge")
    .lean();
  if (!doc) return fail(res, 404, "Post not found");

  /*
    Fetching by id bypasses baseMatch, so the states it filters have to be
    checked here too — otherwise a deleted or draft post stays readable to
    anyone holding its id. The author still sees their own, which is what the
    recycle bin and the draft preview need.
  */
  const isAuthor = viewerId && String(doc.username?._id || doc.username) === String(viewerId);
  if (!isAuthor) {
    if (doc.status === "deleted") return fail(res, 404, "Post not found");
    if (doc.status === "hidden") return fail(res, 404, "Post not found");
    if (doc.status_draft_publish === "Draft") return fail(res, 404, "Post not found");
  }

  const ctx = await buildViewerContext(viewerId);
  const [visible] = await filterByPrivacy([doc], ctx.viewerId);
  if (!visible) return fail(res, 403, "This post is not available");

  ok(res, { item: shapeFeedItem(visible, ctx) });
});

/* ------------------------------------------------------------------ */
/* 9. Polls — voting                                                   */
/* ------------------------------------------------------------------ */

export const votePoll = wrap(async (req, res) => {
  const voterId = actorId(req);
  const { id } = req.params;
  const { optionIds } = req.body || {};
  if (!isId(id)) return fail(res, 400, "Invalid post id");
  if (!isId(voterId)) return fail(res, 400, "A valid userId is required");

  const chosen = (Array.isArray(optionIds) ? optionIds : [optionIds]).filter(Boolean).map(String);
  if (chosen.length === 0) return fail(res, 400, "Pick at least one option");

  const doc = await Reels.findById(id);
  if (!doc) return fail(res, 404, "Post not found");
  if (!doc.poll) return fail(res, 400, "This post has no poll");

  const ended = doc.poll.closed || (doc.poll.endsAt && new Date(doc.poll.endsAt) < new Date());
  if (ended) return fail(res, 400, "This poll has closed");

  if (!doc.poll.multiple && chosen.length > 1) {
    return fail(res, 400, "This poll only allows one choice");
  }

  const valid = new Set(doc.poll.options.map((o) => o.id));
  if (chosen.some((c) => !valid.has(c))) return fail(res, 400, "Unknown poll option");

  // Re-voting replaces the previous choice rather than stacking
  for (const opt of doc.poll.options) {
    opt.votes = (opt.votes || []).filter((v) => String(v) !== String(voterId));
    if (chosen.includes(opt.id)) opt.votes.push(voterId);
  }

  doc.markModified("poll");
  await doc.save();

  const full = await Reels.findById(id).populate("username", AUTHOR_FIELDS).lean();
  const ctx = await buildViewerContext(voterId);
  ok(res, { message: "Vote recorded", poll: shapeFeedItem(full, ctx).poll });
});

export const closePoll = wrap(async (req, res) => {
  const authorId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "Invalid post id");

  const doc = await Reels.findById(id).select("username poll");
  if (!doc) return fail(res, 404, "Post not found");
  if (!doc.poll) return fail(res, 400, "This post has no poll");
  if (String(doc.username) !== String(authorId)) {
    return fail(res, 403, "Only the author can close this poll");
  }

  doc.poll.closed = true;
  doc.markModified("poll");
  await doc.save();

  const full = await Reels.findById(id).populate("username", AUTHOR_FIELDS).lean();
  const ctx = await buildViewerContext(authorId);
  ok(res, { message: "Poll closed", poll: shapeFeedItem(full, ctx).poll });
});

/* ------------------------------------------------------------------ */
/* 10. Tagging — tagged-in feed and self-removal                       */
/* ------------------------------------------------------------------ */

export const taggedFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const targetId = req.params.userId || viewerId;
  const { page, limit, skip } = paging(req, 20);
  if (!isId(targetId)) return fail(res, 400, "A valid userId is required");

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  // $elemMatch, not two separate dotted keys: those can be satisfied by
  // different array entries, so a post where someone *else* is approved would
  // match a pending tag for this user.
  match.taggedUsers = { $elemMatch: { user: oid(targetId), approved: { $ne: false } } };

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .skip(skip)
    .limit(limit + 10)
    .populate("username", AUTHOR_FIELDS)
    .populate("taggedUsers.user", "name image verifiedBadge")
    .lean();

  const visible = (await filterByPrivacy(docs, ctx.viewerId)).slice(0, limit);
  const total = await Reels.countDocuments(match);

  ok(res, {
    total, page, limit,
    hasMore: skip + visible.length < total,
    items: visible.map((d) => shapeFeedItem(d, ctx)),
  });
});

// Author adds tags after posting, or a tagged user removes themselves.
export const updateTags = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { action, targetId, taggedUsers } = req.body || {};
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid post id and userId are required");

  const doc = await Reels.findById(id).select("username taggedUsers").lean();
  if (!doc) return fail(res, 404, "Post not found");

  const isAuthor = String(doc.username) === String(userId);

  if (action === "removeMe") {
    const isTagged = (doc.taggedUsers || []).some((t) => String(t.user) === String(userId));
    if (!isTagged) return fail(res, 404, "You are not tagged in this post");
    await Reels.findByIdAndUpdate(id, { $pull: { taggedUsers: { user: oid(userId) } } });
    return ok(res, { message: "You've been removed from this post" });
  }

  if (!isAuthor) return fail(res, 403, "Only the author can change tags");

  if (action === "remove") {
    if (!isId(targetId)) return fail(res, 400, "A valid targetId is required");
    await Reels.findByIdAndUpdate(id, { $pull: { taggedUsers: { user: oid(targetId) } } });
    return ok(res, { message: "Tag removed" });
  }

  if (action === "set") {
    const clean = await sanitiseTags(taggedUsers, userId);
    const before = new Set((doc.taggedUsers || []).map((t) => String(t.user)));
    const saved = await Reels.findByIdAndUpdate(id, { taggedUsers: clean }, { new: true })
      .populate("taggedUsers.user", "name image verifiedBadge")
      .lean();

    // Only people who were not already tagged get pinged.
    const added = clean.map((t) => t.user).filter((u) => !before.has(String(u)));
    if (added.length) {
      await notifyMany(added, { actor: userId, type: "tag", post: id });
    }
    const rejected = (taggedUsers || []).length - clean.length;
    return ok(res, {
      message: rejected > 0
        ? `Tags saved. ${rejected} user(s) don't allow tagging from you.`
        : "Tags saved",
      taggedUsers: saved.taggedUsers,
    });
  }

  fail(res, 400, "action must be set, remove or removeMe");
});

// Who can this user tag — used by the tag picker
export const taggableUsers = wrap(async (req, res) => {
  const userId = actorId(req);
  const q = String(req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("following followers").lean();
  if (!me) return fail(res, 404, "User not found");

  // Suggest people they follow or who follow them
  const pool = [...new Set([...(me.following || []), ...(me.followers || [])].map(String))];
  const filter = { _id: { $in: pool.map(oid) }, accountStatus: { $ne: "banned" } };
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const users = await User.find(filter)
    .select("name image verifiedBadge privacy privacySettings followers closeFriends blockedUsers")
    .limit(limit * 2)
    .lean();

  const rows = users
    .filter((u) => {
      if ((u.blockedUsers || []).some((b) => String(b) === String(userId))) return false;
      const setting = effectiveTagSetting(u);
      if (setting === "nobody") return false;
      if (setting === "followers") return (u.followers || []).some((f) => String(f) === String(userId));
      if (setting === "closeFriends") return (u.closeFriends || []).some((f) => String(f) === String(userId));
      return true;
    })
    .slice(0, limit)
    .map((u) => ({ _id: u._id, name: u.name, image: u.image, verifiedBadge: !!u.verifiedBadge }));

  ok(res, { rows, total: rows.length });
});

/* ------------------------------------------------------------------ */
/* 11. Content search                                                  */
/* ------------------------------------------------------------------ */

export const searchContent = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 20);
  const q = String(req.query.q || "").trim();
  if (!q) return fail(res, 400, "A search term is required");

  const ctx = await buildViewerContext(viewerId);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const match = baseMatch(ctx, { type: req.query.type });
  match.$and = [
    ...(match.$and || []),{ $or: [{ videoTitle: rx }, { hashtags: q.replace(/^#/, "").toLowerCase() }, { "place.name": rx }] }];

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .skip(skip)
    .limit(limit + 10)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = (await filterByPrivacy(docs, ctx.viewerId)).slice(0, limit);
  const total = await Reels.countDocuments(match);

  ok(res, {
    query: q, total, page, limit,
    hasMore: skip + visible.length < total,
    items: visible.map((d) => shapeFeedItem(d, ctx)),
  });
});
