/*
  Discovery & Search — mobile-facing API.

  Covers the whole "Discovery & Search" section of the module sheet:
    unified search for posts & content, hashtag search, creator discovery,
    video discovery, trending topics, and location-based discovery.

  Mounted at /apis/discovery. The narrower endpoints already on /apis/feed
  (search, hashtags/search, places/search, nearby, recommendations/users) are
  left exactly as they are — screens migrate one at a time.

  Two things are shared across every surface here, and both live in
  helpers/discovery.js so they mean one thing:
    - relevance: exact > prefix > word-boundary > substring, never raw contains
    - heat: a raw score rescaled 0-100 against the leader of its own list
*/

import Reels from "../models/Reels.js";
import User from "../models/users.js";
import Hashtag from "../models/Hashtag.js";
import SearchQuery from "../models/SearchQuery.js";
import {
  buildViewerContext, baseMatch, filterByPrivacy, shapeFeedItem,
  POSTTYPE, AUTHOR_FIELDS,
} from "../helpers/feed.js";
import { needsFollowApproval } from "../helpers/privacy.js";
import {
  isId, oid, escapeRx, normalizeTerm, textRelevance, recencyBoost,
  engagementOf, heatScale, velocityOf, HAS_REAL_LOCATION, distanceKm,
  shapeCreator, resolvePlace, placeMatches,
} from "../helpers/discovery.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[discovery]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const clampHours = (v, def, max = 24 * 30) =>
  Math.min(Math.max(parseInt(v, 10) || def, 1), max);

const since = (hours) => new Date(Date.now() - hours * 3600 * 1000);

/*
  A term has to be typed by this many *different* people inside the window
  before it can appear as a trending search. One person searching the same
  thing fifty times is not a trend, and without this the board is trivially
  self-servable by a single account.
*/
const MIN_DISTINCT_SEARCHERS = 2;

/* Only accounts that can actually be surfaced in discovery. */
const discoverableUsers = (exclude = []) => ({
  _id: { $nin: exclude.filter(isId).map(oid) },
  accountStatus: { $nin: ["banned", "deleted"] },
  $or: [
    { "privacySettings.discoverable": { $ne: false } },
    { privacySettings: { $exists: false } },
  ],
});

/*
  Record a search so it can feed both the user's history and the trending
  board. Deliberately fire-and-forget: a logging failure must never turn a
  successful search into a 500.
*/
const recordSearch = async (userId, term, scope, resultCount) => {
  const t = normalizeTerm(term);
  if (!t || t.length < 2) return;
  try {
    await SearchQuery.findOneAndUpdate(
      { user: isId(userId) ? oid(userId) : null, term: t },
      {
        $set: { display: String(term).trim().slice(0, 100), scope, resultCount, lastAt: new Date() },
        $inc: { count: 1 },
        $setOnInsert: { firstAt: new Date() },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error("[discovery] recordSearch", err.message);
  }
};

/* ================================================================== */
/* 1. Search for posts & content                                       */
/* ================================================================== */

/* Posts matching a term, ranked by relevance rather than pure recency. */
const searchPosts = async (q, ctx, { limit, skip = 0, type }) => {
  const rx = new RegExp(escapeRx(q), "i");
  const tag = normalizeTerm(q);

  const match = baseMatch(ctx, { type: POSTTYPE[type] ? type : undefined });
  match.$and = [
    ...(match.$and || []),{ $or: [{ videoTitle: rx }, { hashtags: tag }, { "place.name": rx }] }];

  const total = await Reels.countDocuments(match);

  /*
    Over-fetch, then rank. Relevance cannot be expressed in the Mongo sort —
    a caption where the term is the first word must beat one where it appears
    in passing, and both must lose to a post whose hashtag is exactly the term.
  */
  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(300)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(docs, ctx.viewerId);

  const ranked = visible
    .map((doc) => {
      const exactTag = (doc.hashtags || []).includes(tag) ? 60 : 0;
      const caption = textRelevance(doc.videoTitle || "", q);
      const place = textRelevance(doc.place?.name || "", q) * 0.6;
      const relevance = Math.max(caption, place) + exactTag;
      const score = relevance * (1 + Math.log10(engagementOf(doc) + 1)) * recencyBoost(doc.xtime);
      return { doc, relevance, score };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.score - a.score);

  const page = ranked.slice(skip, skip + limit);
  const heat = heatScale(ranked, (r) => r.score);

  return {
    total,
    matched: ranked.length,
    items: page.map((r) => shapeFeedItem(r.doc, ctx, { relevance: heat(r) })),
  };
};

/* People matching a term. */
const searchUsers = async (q, ctx, { limit, skip = 0 }) => {
  const rx = new RegExp(escapeRx(q), "i");
  const exclude = [...ctx.hidden];
  if (ctx.viewerId) exclude.push(ctx.viewerId);

  const filter = discoverableUsers(exclude);
  filter.$and = [{ $or: [{ name: rx }, { email: rx }, { bio: rx }] }];

  const pool = await User.find(filter)
    .select("name image bio email followers verifiedBadge accountType privacy privacySettings city country")
    .limit(300)
    .lean();

  const followingSet = new Set(ctx.following);

  const ranked = pool
    .map((u) => {
      // Name is what people search for; a bio hit is a much weaker signal.
      const relevance = Math.max(
        textRelevance(u.name || "", q),
        textRelevance(String(u.email || "").split("@")[0], q) * 0.7,
        textRelevance(u.bio || "", q) * 0.25
      );
      const reach = Math.log10((u.followers || []).length + 1) * 8;
      const known = followingSet.has(String(u._id)) ? 15 : 0;
      return { u, relevance, score: relevance + reach + known + (u.verifiedBadge ? 6 : 0) };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.score - a.score);

  const page = ranked.slice(skip, skip + limit);
  return {
    total: ranked.length,
    matched: ranked.length,
    items: page.map((r) =>
      shapeCreator(r.u, {
        isFollowing: followingSet.has(String(r.u._id)),
        isPrivate: needsFollowApproval(r.u),
      })
    ),
  };
};

/* Hashtags matching a term. */
const searchTags = async (q, { limit, skip = 0 }) => {
  const t = normalizeTerm(q);
  const rows = await Hashtag.find({
    isBlocked: { $ne: true },
    tag: new RegExp(escapeRx(t), "i"),
  })
    .limit(200)
    .lean();

  const ranked = rows
    .map((h) => ({
      h,
      relevance: textRelevance(h.tag, t),
      score: textRelevance(h.tag, t) + Math.log10((h.postCount || 0) + 1) * 10,
    }))
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.score - a.score);

  return {
    total: ranked.length,
    matched: ranked.length,
    items: ranked.slice(skip, skip + limit).map((r) => ({
      tag: r.h.tag,
      posts: r.h.postCount || 0,
      isTrending: !!r.h.isTrending,
    })),
  };
};

/* Places matching a term, built from real check-ins. */
const searchPlacesFor = async (q, { limit, skip = 0 }) => {
  const rx = new RegExp(escapeRx(q), "i");
  const rows = await Reels.aggregate([
    { $match: { "place.name": rx, group: null } },
    {
      $group: {
        _id: "$place.name",
        posts: { $sum: 1 },
        city: { $first: "$place.city" },
        country: { $first: "$place.country" },
        location: { $first: "$place.location" },
        lastUsed: { $max: "$xtime" },
      },
    },
    { $sort: { posts: -1 } },
    { $limit: 200 },
  ]);

  const ranked = rows
    .map((r) => ({ r, relevance: textRelevance(r._id, q) }))
    .filter((x) => x.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.r.posts - a.r.posts);

  return {
    total: ranked.length,
    matched: ranked.length,
    items: ranked.slice(skip, skip + limit).map(({ r }) => ({
      name: r._id, posts: r.posts, city: r.city || null,
      country: r.country || null, location: r.location || null,
      lastUsed: r.lastUsed,
    })),
  };
};

/*
  Unified search.

  `scope=all` returns a capped slice of each type plus per-type totals, which
  is what the tabbed search screen needs to label its tabs before any tab is
  opened. A specific scope returns one type, paginated.
*/
export const search = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req);
  const q = String(req.query.q || "").trim();
  const scope = String(req.query.scope || "all");

  if (!q) return fail(res, 400, "A search term is required");
  if (q.length > 100) return fail(res, 400, "Search term is too long (100 characters max)");
  if (!["all", "posts", "users", "hashtags", "places"].includes(scope)) {
    return fail(res, 400, "scope must be all, posts, users, hashtags or places");
  }

  const ctx = await buildViewerContext(viewerId);

  if (scope === "all") {
    // Small slice of each — the tab bar needs counts, not four full pages.
    const per = Math.min(limit, 5);
    const [posts, users, hashtags, places] = await Promise.all([
      searchPosts(q, ctx, { limit: per, type: req.query.type }),
      searchUsers(q, ctx, { limit: per }),
      searchTags(q, { limit: per }),
      searchPlacesFor(q, { limit: per }),
    ]);

    const counts = {
      posts: posts.matched, users: users.matched,
      hashtags: hashtags.matched, places: places.matched,
    };
    const totalMatched = Object.values(counts).reduce((a, b) => a + b, 0);
    await recordSearch(viewerId, q, scope, totalMatched);

    return ok(res, {
      query: q, scope, counts, totalMatched,
      posts: posts.items, users: users.items,
      hashtags: hashtags.items, places: places.items,
    });
  }

  const runner = { posts: searchPosts, users: searchUsers }[scope];
  const result = runner
    ? await runner(q, ctx, { limit, skip, type: req.query.type })
    : scope === "hashtags"
      ? await searchTags(q, { limit, skip })
      : await searchPlacesFor(q, { limit, skip });

  await recordSearch(viewerId, q, scope, result.matched);

  ok(res, {
    query: q, scope, page, limit,
    total: result.matched,
    hasMore: skip + result.items.length < result.matched,
    items: result.items,
  });
});

/*
  Typeahead. Returns a single ranked list mixing types, because the suggestion
  dropdown is one list — deciding a person outranks a hashtag is this
  endpoint's job, not the client's.
*/
export const suggest = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const q = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 25);
  if (!q) return ok(res, { query: "", suggestions: [] });

  const ctx = await buildViewerContext(viewerId);
  const [users, tags, places] = await Promise.all([
    searchUsers(q, ctx, { limit: limit }),
    searchTags(q, { limit }),
    searchPlacesFor(q, { limit }),
  ]);

  const rows = [
    ...users.items.map((u, i) => ({
      type: "user", id: u._id, label: u.name, sub: u.bio || "",
      image: u.image, verifiedBadge: u.verifiedBadge,
      // Position within its own already-ranked list, so cross-type ordering
      // keeps each list's internal order.
      rank: textRelevance(u.name || "", q) + (u.isFollowing ? 20 : 0) - i,
    })),
    ...tags.items.map((t, i) => ({
      type: "hashtag", id: t.tag, label: `#${t.tag}`,
      sub: `${t.posts} post${t.posts === 1 ? "" : "s"}`,
      rank: textRelevance(t.tag, q) + (t.isTrending ? 10 : 0) - i,
    })),
    ...places.items.map((p, i) => ({
      type: "place", id: p.name, label: p.name,
      sub: [p.city, p.country].filter(Boolean).join(", "),
      rank: textRelevance(p.name, q) * 0.9 - i,
    })),
  ].sort((a, b) => b.rank - a.rank).slice(0, limit);

  ok(res, { query: q, suggestions: rows });
});

export const searchHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const rows = await SearchQuery.find({ user: oid(userId) })
    .sort({ lastAt: -1 })
    .limit(limit)
    .lean();

  ok(res, {
    history: rows.map((r) => ({
      _id: r._id, term: r.display || r.term, scope: r.scope,
      count: r.count, lastAt: r.lastAt,
    })),
  });
});

export const clearSearchHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  // One entry when an id is given, the whole history otherwise.
  const { id } = req.params;
  if (id) {
    if (!isId(id)) return fail(res, 400, "Invalid history id");
    const r = await SearchQuery.deleteOne({ _id: oid(id), user: oid(userId) });
    if (!r.deletedCount) return fail(res, 404, "No such entry in your history");
    return ok(res, { message: "Removed from your searches", removed: 1 });
  }

  const r = await SearchQuery.deleteMany({ user: oid(userId) });
  ok(res, { message: "Search history cleared", removed: r.deletedCount });
});

/*
  Trending searches — what people are looking for, as opposed to what is being
  posted. Counts distinct searchers, never raw query volume.
*/
export const trendingSearches = wrap(async (req, res) => {
  const hours = clampHours(req.query.hours, 168);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  const from = since(hours);
  const priorFrom = since(hours * 2);

  const [now, prior] = await Promise.all([
    SearchQuery.aggregate([
      { $match: { lastAt: { $gte: from } } },
      { $group: { _id: "$term", searchers: { $addToSet: "$user" }, hits: { $sum: "$count" }, display: { $first: "$display" } } },
    ]),
    SearchQuery.aggregate([
      { $match: { lastAt: { $gte: priorFrom, $lt: from } } },
      { $group: { _id: "$term", searchers: { $addToSet: "$user" } } },
    ]),
  ]);

  const priorBy = Object.fromEntries(prior.map((p) => [p._id, p.searchers.length]));

  const rows = now
    .map((r) => ({
      term: r.display || r._id,
      searchers: r.searchers.length,
      hits: r.hits,
      velocity: velocityOf(r.searchers.length, priorBy[r._id] || 0),
    }))
    .filter((r) => r.searchers >= MIN_DISTINCT_SEARCHERS)
    .map((r) => ({ ...r, score: r.searchers * r.velocity }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const heat = heatScale(rows, (r) => r.score);
  ok(res, {
    windowHours: hours,
    minSearchers: MIN_DISTINCT_SEARCHERS,
    rows: rows.map((r, i) => ({ rank: i + 1, ...r, heat: heat(r) })),
  });
});

/* ================================================================== */
/* 2. Search hashtags                                                  */
/* ================================================================== */

export const hashtagSearch = wrap(async (req, res) => {
  const { limit, skip } = paging(req);
  const q = String(req.query.q || "").trim();

  // No term: the browse state, which is the trending/biggest tags.
  if (!q) {
    const rows = await Hashtag.find({ isBlocked: { $ne: true } })
      .sort({ isTrending: -1, postCount: -1 })
      .skip(skip).limit(limit)
      .lean();
    return ok(res, {
      query: "", browse: true,
      rows: rows.map((h) => ({ tag: h.tag, posts: h.postCount || 0, isTrending: !!h.isTrending })),
    });
  }

  const result = await searchTags(q, { limit, skip });
  await recordSearch(actorId(req), q, "hashtags", result.matched);
  ok(res, { query: q, browse: false, total: result.matched, rows: result.items });
});

export const hashtagDetail = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const tag = normalizeTerm(req.params.tag);
  if (!tag) return fail(res, 400, "A hashtag is required");

  const doc = await Hashtag.findOne({ tag }).lean();
  if (doc?.isBlocked) return fail(res, 404, "That hashtag isn't available");

  const ctx = await buildViewerContext(viewerId);
  const hours = clampHours(req.query.hours, 168);
  const from = since(hours);

  const match = baseMatch(ctx);
  match.hashtags = tag;

  const [total, recent, prior, docs, me] = await Promise.all([
    Reels.countDocuments(match),
    Reels.countDocuments({ ...match, xtime: { $gte: from } }),
    Reels.countDocuments({ ...match, xtime: { $gte: since(hours * 2), $lt: from } }),
    Reels.find(match).sort({ xtime: -1 }).limit(120).populate("username", AUTHOR_FIELDS).lean(),
    isId(viewerId) ? User.findById(viewerId).select("followedHashtags").lean() : null,
  ]);

  // A tag that exists in no visible post is a 404 rather than an empty page.
  if (!doc && total === 0) return fail(res, 404, "No posts use that hashtag yet");

  const visible = await filterByPrivacy(docs, ctx.viewerId);
  const top = visible
    .map((d) => ({ d, score: engagementOf(d) * recencyBoost(d.xtime) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 9);

  const contributors = new Set(visible.map((d) => String(d.username?._id || d.username)));

  ok(res, {
    tag,
    posts: total,
    isTrending: !!doc?.isTrending,
    isFollowing: (me?.followedHashtags || []).includes(tag),
    windowHours: hours,
    recentPosts: recent,
    velocity: velocityOf(recent, prior),
    contributors: contributors.size,
    topPosts: top.map(({ d }) => shapeFeedItem(d, ctx)),
  });
});

/*
  Related hashtags, by co-occurrence: tags that appear on the same posts as
  this one, ranked by how often they travel together rather than by their own
  size — otherwise every tag is "related" to the biggest tag on the platform.
*/
export const relatedHashtags = wrap(async (req, res) => {
  const tag = normalizeTerm(req.params.tag);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  if (!tag) return fail(res, 400, "A hashtag is required");

  const ctx = await buildViewerContext(actorId(req));
  const match = baseMatch(ctx);
  match.hashtags = tag;

  const docs = await Reels.find(match).select("hashtags").limit(400).lean();
  if (!docs.length) return ok(res, { tag, related: [] });

  const blocked = new Set(
    (await Hashtag.find({ isBlocked: true }).select("tag").lean()).map((h) => h.tag)
  );

  const together = {};
  for (const d of docs) {
    for (const t of d.hashtags || []) {
      if (t === tag || blocked.has(t)) continue;
      together[t] = (together[t] || 0) + 1;
    }
  }

  const rows = Object.entries(together)
    .map(([t, n]) => ({
      tag: t,
      together: n,
      // Share of this tag's posts that also carry the other tag.
      affinity: Math.round((n / docs.length) * 100),
    }))
    .sort((a, b) => b.together - a.together)
    .slice(0, limit);

  ok(res, { tag, basedOn: docs.length, related: rows });
});

export const followHashtag = wrap(async (req, res) => {
  const userId = actorId(req);
  const tag = normalizeTerm(req.params.tag);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!tag) return fail(res, 400, "A hashtag is required");

  const blocked = await Hashtag.findOne({ tag, isBlocked: true }).lean();
  if (blocked) return fail(res, 403, "That hashtag isn't available");

  const me = await User.findById(userId).select("followedHashtags").lean();
  if (!me) return fail(res, 404, "User not found");

  const following = (me.followedHashtags || []).includes(tag);
  // A toggle, so the button is idempotent from the client's point of view.
  await User.updateOne(
    { _id: oid(userId) },
    following ? { $pull: { followedHashtags: tag } } : { $addToSet: { followedHashtags: tag } }
  );

  ok(res, {
    tag,
    isFollowing: !following,
    message: following ? `Unfollowed #${tag}` : `Following #${tag}`,
  });
});

export const followedHashtags = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("followedHashtags").lean();
  if (!me) return fail(res, 404, "User not found");

  const tags = me.followedHashtags || [];
  const rows = await Hashtag.find({ tag: { $in: tags } }).lean();
  const byTag = Object.fromEntries(rows.map((r) => [r.tag, r]));

  ok(res, {
    tags: tags.map((t) => ({
      tag: t,
      posts: byTag[t]?.postCount || 0,
      isTrending: !!byTag[t]?.isTrending,
    })),
  });
});

/* ================================================================== */
/* 3. Discover creators                                                */
/* ================================================================== */

/*
  Creator discovery, distinct from "who to follow" on the feed: this is a
  browsable, filterable directory rather than a short personalised rail. It
  ranks on what the creator publishes, not only on who follows them, so a new
  account posting good work is reachable.
*/
export const discoverCreators = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 15);
  const { accountType, topic, city, country, verified, sort = "relevant" } = req.query;
  const hours = clampHours(req.query.hours, 24 * 30);

  const ctx = await buildViewerContext(viewerId);
  const exclude = [...ctx.hidden];
  if (ctx.viewerId) exclude.push(ctx.viewerId);

  const filter = discoverableUsers(exclude);
  if (accountType) {
    if (!["personal", "creator", "business"].includes(accountType)) {
      return fail(res, 400, "accountType must be personal, creator or business");
    }
    filter.accountType = accountType;
  }
  if (verified === "true") filter.verifiedBadge = true;
  if (city) filter.city = new RegExp(`^${escapeRx(city)}$`, "i");
  if (country) filter.country = new RegExp(`^${escapeRx(country)}$`, "i");
  if (topic) {
    const t = normalizeTerm(topic);
    filter.$and = [...(filter.$and || []), { $or: [{ discoveryTopics: t }, { followedHashtags: t }] }];
  }

  const pool = await User.find(filter)
    .select("name image bio followers following verifiedBadge accountType privacy privacySettings city country discoveryTopics")
    .limit(400)
    .lean();
  if (!pool.length) return ok(res, { page, limit, total: 0, creators: [] });

  // One aggregate for the whole pool's publishing activity, not one query each.
  const activity = await Reels.aggregate([
    {
      $match: {
        username: { $in: pool.map((u) => u._id) },
        group: null,
        status: { $nin: ["hidden", "deleted"] },
        status_draft_publish: { $ne: "Draft" },
        xtime: { $gte: since(hours) },
      },
    },
    {
      $group: {
        _id: "$username",
        posts: { $sum: 1 },
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        lastPost: { $max: "$xtime" },
        tags: { $push: "$hashtags" },
      },
    },
  ]);
  const actBy = Object.fromEntries(activity.map((a) => [String(a._id), a]));

  const followingSet = new Set(ctx.following);
  const myTags = new Set(ctx.interestTags || []);

  const ranked = pool
    .map((u) => {
      const a = actBy[String(u._id)];
      const reasons = [];
      let score = 0;

      if (a) {
        const engagement = a.likes + a.comments * 3;
        score += Math.log10(engagement + 1) * 18;
        score += Math.min(a.posts, 20) * 1.5;
        if (a.posts >= 3) reasons.push(`${a.posts} posts recently`);
      } else {
        // Nothing published in the window: still listed, ranked below anyone
        // who is actually active. A directory of dormant accounts is useless.
        score -= 20;
      }

      const mutuals = (u.followers || []).filter((f) => followingSet.has(String(f))).length;
      if (mutuals) {
        score += Math.min(mutuals * 10, 40);
        reasons.push(`${mutuals} mutual connection${mutuals > 1 ? "s" : ""}`);
      }

      // Topic overlap with what the viewer already engages with
      const theirTags = new Set((a?.tags || []).flat());
      const shared = [...theirTags].filter((t) => myTags.has(t));
      if (shared.length) {
        score += Math.min(shared.length * 8, 32);
        reasons.push(`posts about ${shared.slice(0, 2).map((t) => `#${t}`).join(", ")}`);
      }

      // Reach, damped so the biggest accounts don't own every slot
      score += Math.log10((u.followers || []).length + 1) * 6;
      if (u.verifiedBadge) { score += 6; reasons.push("verified"); }
      if (u.accountType === "creator" || u.accountType === "business") score += 4;
      if (!reasons.length) reasons.push("new to you");

      return {
        u, score,
        posts: a?.posts || 0,
        engagement: a ? a.likes + a.comments : 0,
        lastPost: a?.lastPost || null,
        reasons,
      };
    })
    .sort((a, b) =>
      sort === "followers" ? (b.u.followers || []).length - (a.u.followers || []).length
      : sort === "active" ? new Date(b.lastPost || 0) - new Date(a.lastPost || 0)
      : b.score - a.score
    );

  const pageRows = ranked.slice(skip, skip + limit);
  const heat = heatScale(ranked, (r) => Math.max(r.score, 0));

  ok(res, {
    page, limit, total: ranked.length,
    hasMore: skip + pageRows.length < ranked.length,
    filters: { accountType: accountType || null, topic: topic || null, city: city || null, sort },
    creators: pageRows.map((r) =>
      shapeCreator(r.u, {
        isFollowing: followingSet.has(String(r.u._id)),
        isPrivate: needsFollowApproval(r.u),
        posts: r.posts,
        engagement: r.engagement,
        lastPost: r.lastPost,
        heat: heat(r),
        reasons: r.reasons,
      })
    ),
  });
});

/* Leaderboard: whose content actually performed inside the window. */
export const topCreators = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  const hours = clampHours(req.query.hours, 168);

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match.xtime = { $gte: since(hours) };
  match.posttype = { $not: POSTTYPE.story };

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(500)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(docs, ctx.viewerId);

  const byAuthor = {};
  for (const d of visible) {
    const id = String(d.username?._id || d.username);
    if (id === ctx.viewerId) continue;
    if (!byAuthor[id]) byAuthor[id] = { author: d.username, posts: 0, score: 0, engagement: 0 };
    byAuthor[id].posts += 1;
    byAuthor[id].engagement += engagementOf(d);
    byAuthor[id].score += engagementOf(d) * recencyBoost(d.xtime, hours);
  }

  const rows = Object.entries(byAuthor).sort((a, b) => b[1].score - a[1].score).slice(0, limit);
  const heat = heatScale(rows, (r) => r[1].score);

  ok(res, {
    windowHours: hours,
    creators: rows.map((row, i) => {
      const [id, v] = row;
      return shapeCreator(v.author || { _id: id }, {
        rank: i + 1,
        posts: v.posts,
        engagement: Math.round(v.engagement),
        heat: heat(row),
        isFollowing: ctx.following.includes(id),
      });
    }),
  });
});

/*
  Creators similar to one account, by audience overlap: people followed by the
  same accounts that follow this one. Falls back to topic overlap when the
  account is too new to have a distinctive audience.
*/
export const similarCreators = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { userId: targetId } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  if (!isId(targetId)) return fail(res, 400, "A valid userId is required");

  const target = await User.findById(targetId).select("followers name discoveryTopics").lean();
  if (!target) return fail(res, 404, "User not found");

  const ctx = await buildViewerContext(viewerId);
  const exclude = new Set([String(targetId), ...ctx.hidden, ...(ctx.viewerId ? [ctx.viewerId] : [])]);

  // Who else this account's followers follow.
  const audience = (target.followers || []).slice(0, 300);
  const overlap = {};
  if (audience.length) {
    const fans = await User.find({ _id: { $in: audience } }).select("following").lean();
    for (const f of fans) {
      for (const id of f.following || []) {
        const s = String(id);
        if (exclude.has(s)) continue;
        overlap[s] = (overlap[s] || 0) + 1;
      }
    }
  }

  let ids = Object.entries(overlap).sort((a, b) => b[1] - a[1]).slice(0, limit * 2).map(([id]) => id);
  let basis = "audience overlap";

  // Too new to have an audience — fall back to what they post about.
  if (ids.length < 3) {
    const theirTags = (await Reels.find({ username: oid(targetId) }).select("hashtags").limit(50).lean())
      .flatMap((d) => d.hashtags || []);
    if (theirTags.length) {
      const others = await Reels.find({
        hashtags: { $in: [...new Set(theirTags)] },
        username: { $nin: [...exclude].filter(isId).map(oid) },
        group: null,
      }).select("username").limit(300).lean();
      const count = {};
      for (const o of others) count[String(o.username)] = (count[String(o.username)] || 0) + 1;
      ids = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, limit * 2).map(([id]) => id);
      basis = "shared topics";
    }
  }

  if (!ids.length) return ok(res, { of: targetId, basis: "none", creators: [] });

  const users = await User.find({
    ...discoverableUsers([]),
    _id: { $in: ids.filter(isId).map(oid) },
  })
    .select("name image bio followers verifiedBadge accountType privacy privacySettings city country")
    .lean();

  const rank = Object.fromEntries(ids.map((id, i) => [id, ids.length - i]));
  const rows = users
    .sort((a, b) => (rank[String(b._id)] || 0) - (rank[String(a._id)] || 0))
    .slice(0, limit);

  ok(res, {
    of: targetId,
    basis,
    creators: rows.map((u) =>
      shapeCreator(u, {
        sharedFollowers: overlap[String(u._id)] || 0,
        isFollowing: ctx.following.includes(String(u._id)),
        isPrivate: needsFollowApproval(u),
      })
    ),
  });
});

/* ================================================================== */
/* 4. Discover videos                                                  */
/* ================================================================== */

/*
  The video discovery grid. Ranked on engagement against a gentle recency
  decay, with what the viewer has already seen pushed down rather than removed
  — dropping seen content entirely empties the grid for an active user.
*/
export const discoverVideos = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 18);
  const hours = clampHours(req.query.hours, 24 * 14);
  const { hashtag, trackId, sort = "top" } = req.query;

  const ctx = await buildViewerContext(viewerId);

  const match = baseMatch(ctx);
  match.xtime = { $gte: since(hours) };
  /*
    Reels and video posts, identified by the media that is actually attached
    rather than by posttype alone — plenty of rows carry posttype "Post" with
    a video in media[], and a grid that trusts posttype misses them.
  */
  match.$and = [
    ...(match.$and || []),
    ...(match.$and || []),
    {
      $or: [
        { posttype: POSTTYPE.reel },
        { "media.type": "video" },
        { "videoUrl.type": "video" },
      ],
    },
  ];
  if (hashtag) match.hashtags = normalizeTerm(hashtag);
  if (trackId && isId(trackId)) match["music.track"] = oid(trackId);

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(400)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(docs, ctx.viewerId);
  const seen = new Set(ctx.seen || []);

  const ranked = visible
    .map((d) => {
      const base = engagementOf(d) * recencyBoost(d.xtime, hours * 2) + 1;
      // Seen content is demoted, not dropped.
      const score = seen.has(String(d._id)) ? base * 0.25 : base;
      return { d, score, seen: seen.has(String(d._id)) };
    })
    .sort((a, b) =>
      sort === "recent" ? new Date(b.d.xtime) - new Date(a.d.xtime) : b.score - a.score
    );

  const pageRows = ranked.slice(skip, skip + limit);
  const heat = heatScale(ranked, (r) => r.score);

  ok(res, {
    page, limit, total: ranked.length,
    hasMore: skip + pageRows.length < ranked.length,
    windowHours: hours,
    filters: { hashtag: hashtag || null, trackId: trackId || null, sort },
    videos: pageRows.map((r) =>
      shapeFeedItem(r.d, ctx, { heat: heat(r), alreadySeen: r.seen })
    ),
  });
});

/* The category rail above the grid: which topics have video behind them. */
export const videoCategories = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 30);
  const hours = clampHours(req.query.hours, 24 * 14);

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match.xtime = { $gte: since(hours) };
  match.$and = [
    ...(match.$and || []),
    ...(match.$and || []),
    { $or: [{ posttype: POSTTYPE.reel }, { "media.type": "video" }, { "videoUrl.type": "video" }] },
  ];

  const docs = await Reels.find(match).select("hashtags media videoUrl").limit(400).lean();
  const blocked = new Set(
    (await Hashtag.find({ isBlocked: true }).select("tag").lean()).map((h) => h.tag)
  );

  const count = {};
  const cover = {};
  for (const d of docs) {
    for (const t of d.hashtags || []) {
      if (blocked.has(t)) continue;
      count[t] = (count[t] || 0) + 1;
      if (!cover[t]) cover[t] = d.media?.[0]?.thumbnail || d.media?.[0]?.url || null;
    }
  }

  ok(res, {
    windowHours: hours,
    categories: Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, videos]) => ({ tag, videos, cover: cover[tag] })),
  });
});

/* ================================================================== */
/* 5. Trending topics                                                  */
/* ================================================================== */

/*
  Trending topics, separate from the trending *posts* on /apis/feed/trending.

  A topic ranks on movement, not size: `velocity` compares this window's post
  rate against the window before it, so a tag that always has fifty posts does
  not permanently occupy the board while a tag going from two to twenty does.
*/
export const trendingTopics = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 30);
  const hours = clampHours(req.query.hours, 72);
  const { city, rising } = req.query;

  const ctx = await buildViewerContext(viewerId);
  const from = since(hours);

  const scope = (extra = {}) => {
    const m = baseMatch(ctx);
    m.posttype = { $not: POSTTYPE.story };
    if (city) m["place.city"] = new RegExp(`^${escapeRx(city)}$`, "i");
    return { ...m, ...extra };
  };

  const [nowDocs, priorDocs, pinned, blockedRows] = await Promise.all([
    Reels.find(scope({ xtime: { $gte: from } })).select("hashtags likes comments shares username xtime").limit(600).lean(),
    Reels.find(scope({ xtime: { $gte: since(hours * 2), $lt: from } })).select("hashtags").limit(600).lean(),
    Hashtag.find({ isTrending: true, isBlocked: { $ne: true } }).sort({ trendingRank: 1 }).limit(limit).lean(),
    Hashtag.find({ isBlocked: true }).select("tag").lean(),
  ]);

  const blocked = new Set(blockedRows.map((h) => h.tag));
  const pinnedTags = new Set(pinned.map((h) => h.tag));

  const stats = {};
  for (const d of nowDocs) {
    for (const t of d.hashtags || []) {
      if (blocked.has(t)) continue;
      if (!stats[t]) stats[t] = { posts: 0, engagement: 0, authors: new Set() };
      stats[t].posts += 1;
      stats[t].engagement += engagementOf(d);
      stats[t].authors.add(String(d.username));
    }
  }

  const priorCount = {};
  for (const d of priorDocs) {
    for (const t of d.hashtags || []) priorCount[t] = (priorCount[t] || 0) + 1;
  }

  let rows = Object.entries(stats)
    .filter(([tag]) => !pinnedTags.has(tag))
    .map(([tag, s]) => {
      const v = velocityOf(s.posts, priorCount[tag] || 0);
      return {
        tag,
        posts: s.posts,
        priorPosts: priorCount[tag] || 0,
        // Distinct authors matters: fifty posts from one account is not a topic.
        contributors: s.authors.size,
        engagement: Math.round(s.engagement),
        velocity: v,
        rising: v > 1.5,
        score: (s.posts + s.engagement * 0.15) * Math.min(v, 3) * Math.log10(s.authors.size + 1 + 1),
      };
    })
    .sort((a, b) => b.score - a.score);

  if (rising === "true") rows = rows.filter((r) => r.rising);

  const top = rows.slice(0, Math.max(limit - pinned.length, 0));
  const heat = heatScale(rows, (r) => r.score);

  ok(res, {
    windowHours: hours,
    city: city || null,
    topics: [
      ...pinned.map((h) => ({
        tag: h.tag, posts: h.postCount || 0, pinned: true,
        velocity: null, rising: false, heat: 100,
      })),
      ...top.map((r) => ({ ...r, pinned: false, heat: heat(r) })),
    ].slice(0, limit),
  });
});

/* Everything posted under one topic. */
export const topicFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 15);
  const topic = normalizeTerm(req.params.topic);
  const hours = clampHours(req.query.hours, 24 * 30);
  if (!topic) return fail(res, 400, "A topic is required");

  const blocked = await Hashtag.findOne({ tag: topic, isBlocked: true }).lean();
  if (blocked) return fail(res, 404, "That topic isn't available");

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match.hashtags = topic;
  match.xtime = { $gte: since(hours) };

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(300)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const visible = await filterByPrivacy(docs, ctx.viewerId);
  const ranked = visible
    .map((d) => ({ d, score: engagementOf(d) * recencyBoost(d.xtime, hours) }))
    .sort((a, b) =>
      req.query.sort === "recent" ? new Date(b.d.xtime) - new Date(a.d.xtime) : b.score - a.score
    );

  const pageRows = ranked.slice(skip, skip + limit);
  ok(res, {
    topic, page, limit, total: ranked.length,
    hasMore: skip + pageRows.length < ranked.length,
    items: pageRows.map((r) => shapeFeedItem(r.d, ctx)),
  });
});

/* ================================================================== */
/* 6. Location-based discovery                                         */
/* ================================================================== */

/*
  Nearby, by coordinates. Returns posts, creators and places together so the
  map screen is one request; `type` narrows it.

  Note that a check-in can carry a place name with no coordinates — that is the
  common case in this data — so anything geo here is deliberately paired with
  the name-based browse endpoints below rather than replacing them.
*/
export const nearby = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const lng = parseFloat(req.query.lng);
  const lat = parseFloat(req.query.lat);
  const radiusKm = Math.min(Math.max(parseFloat(req.query.radiusKm) || 25, 0.1), 500);
  const type = String(req.query.type || "all");

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return fail(res, 400, "lng and lat are required");
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return fail(res, 400, "lng must be between -180 and 180, lat between -90 and 90");
  }
  if (!["all", "posts", "creators", "places"].includes(type)) {
    return fail(res, 400, "type must be all, posts, creators or places");
  }

  const ctx = await buildViewerContext(viewerId);
  const centre = [lng, lat];
  const out = { center: { lng, lat }, radiusKm };

  if (type === "all" || type === "posts" || type === "places") {
    const docs = await Reels.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: centre },
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          key: "place.location",
          query: baseMatch(ctx),
          spherical: true,
        },
      },
      { $limit: 300 },
      { $lookup: { from: "users", localField: "username", foreignField: "_id", as: "author" } },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      { $addFields: { username: "$author" } },
    ]);

    const visible = await filterByPrivacy(docs, ctx.viewerId);

    if (type === "all" || type === "posts") {
      out.posts = visible.slice(0, limit).map((d) =>
        shapeFeedItem(d, ctx, { distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10 })
      );
    }

    if (type === "all" || type === "places") {
      const byPlace = {};
      for (const d of visible) {
        const name = d.place?.name;
        if (!name) continue;
        if (!byPlace[name]) {
          byPlace[name] = {
            name, posts: 0, city: d.place.city || null, country: d.place.country || null,
            location: d.place.location || null,
            distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10,
          };
        }
        byPlace[name].posts += 1;
      }
      out.places = Object.values(byPlace)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
    }
  }

  if (type === "all" || type === "creators") {
    const exclude = [...ctx.hidden];
    if (ctx.viewerId) exclude.push(ctx.viewerId);

    const rows = await User.find({
      ...discoverableUsers(exclude),
      ...HAS_REAL_LOCATION,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: centre },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .select("name image bio followers verifiedBadge accountType privacy privacySettings location city country")
      .limit(limit)
      .lean();

    out.creators = rows.map((u) =>
      shapeCreator(u, {
        distanceKm: distanceKm(centre, u.location?.coordinates || centre),
        isFollowing: ctx.following.includes(String(u._id)),
        isPrivate: needsFollowApproval(u),
      })
    );
  }

  ok(res, out);
});

/*
  Browse locations by name.

  This is the path that works on real data: check-ins reliably carry a place
  name and often a city, but coordinates are optional, so a geo-only location
  feature is empty for most content. Cities are aggregated from the check-ins
  themselves rather than from a fixed gazetteer.
*/
export const browseLocations = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 50);
  const q = String(req.query.q || "").trim();
  const hours = clampHours(req.query.hours, 24 * 90);
  const level = String(req.query.level || "place");

  if (!["place", "city"].includes(level)) {
    return fail(res, 400, "level must be place or city");
  }

  const ctx = await buildViewerContext(viewerId);
  const match = baseMatch(ctx);
  match["place.name"] = { $exists: true, $ne: null };
  match.xtime = { $gte: since(hours) };

  /*
    Resolved in application code rather than in the aggregation pipeline: the
    venue/city/country split lives inside a free-text field, so the key to
    group on does not exist in the documents. The window bounds the set.
  */
  const docs = await Reels.find(match)
    .select("place username xtime")
    .limit(1000)
    .lean();

  const buckets = new Map();
  for (const d of docs) {
    const r = resolvePlace(d.place || {});
    // A city-level check-in carries no venue, so at level=place it is reported
    // as the city it names rather than invented as a specific place.
    const isVenue = !!r.venueKey;
    const key = level === "city"
      ? (r.cityKey || r.venueKey)
      : (isVenue ? "v:" + r.venueKey : "c:" + r.cityKey);
    if (!key || key === "c:null" || key === "v:null") continue;

    if (!buckets.has(key)) {
      buckets.set(key, {
        type: level === "city" ? "city" : (isVenue ? "place" : "city"),
        name: level === "city" ? (r.city || r.label) : r.label,
        city: r.city || null,
        country: r.country || null,
        posts: 0,
        creators: new Set(),
        venues: new Set(),
        location: null,
        lastPost: null,
      });
    }
    const b = buckets.get(key);
    b.posts += 1;
    b.creators.add(String(d.username));
    if (r.venue) b.venues.add(r.venue);
    // First real coordinate wins; a name-only check-in leaves this null.
    if (!b.location && d.place?.location?.coordinates?.length) b.location = d.place.location;
    if (!b.country && r.country) b.country = r.country;
    if (!b.lastPost || d.xtime > b.lastPost) b.lastPost = d.xtime;
  }

  let rows = [...buckets.values()];

  // Filtered after resolving, so searching "Dubai" also matches a check-in
  // stored as "Dubai, UAE" and any venue sitting inside Dubai.
  if (q) {
    const want = normalizeTerm(q);
    rows = rows.filter((r) =>
      [r.name, r.city, r.country].filter(Boolean).some((v) => normalizeTerm(v).includes(want))
    );
  }

  rows.sort((a, b) => b.posts - a.posts);

  ok(res, {
    query: q || null,
    level,
    windowHours: hours,
    locations: rows.slice(0, limit).map((r) => ({
      name: r.name,
      // "place" is a specific venue; "city" is the region that contains them.
      type: r.type,
      city: r.city,
      country: r.country,
      posts: r.posts,
      creators: r.creators.size,
      // Populated only at level=city: the specific places inside it.
      venues: level === "city" ? [...r.venues].slice(0, 10) : [],
      location: r.location,
      hasCoordinates: !!r.location,
      lastPost: r.lastPost,
    })),
  });
});

/* Everything posted at one named place or city. */
export const locationFeed = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { page, limit, skip } = paging(req, 15);
  const name = String(req.params.name || "").trim();
  if (!name) return fail(res, 400, "A location name is required");

  const ctx = await buildViewerContext(viewerId);
  /*
    Broad match in Mongo, exact match after resolving. An anchored regex on
    "Dubai" cannot match a name stored as "Dubai, UAE", and a venue stored as
    "Burj Khalifa, Dubai, UAE" belongs to Dubai without saying so in any single
    field — so candidates are fetched on a contains match and then filtered on
    the resolved venue/city/raw parts.
  */
  const loose = new RegExp(escapeRx(name), "i");
  const match = baseMatch(ctx);
  match.$and = [...(match.$and || []), { $or: [{ "place.city": loose }, { "place.name": loose }] }];

  const docs = await Reels.find(match)
    .sort({ xtime: -1 })
    .limit(300)
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const exact = docs.filter((d) => placeMatches(d.place || {}, name));
  const visible = await filterByPrivacy(exact, ctx.viewerId);
  const ranked = visible
    .map((d) => ({ d, score: engagementOf(d) * recencyBoost(d.xtime) }))
    .sort((a, b) =>
      req.query.sort === "recent" ? new Date(b.d.xtime) - new Date(a.d.xtime) : b.score - a.score
    );

  const pageRows = ranked.slice(skip, skip + limit);
  // Report what the name resolved to, so the screen can title itself
  // "Burj Khalifa - Dubai" rather than echoing whatever the caller typed.
  let resolved = null;
  if (visible.length) {
    const want = normalizeTerm(name);
    // Prefer a post whose *venue* is what was asked for; only then does the
    // request name a specific place. Reading the first post regardless would
    // label a whole city with whichever venue happened to sort first.
    const asVenue = visible.find((d) => resolvePlace(d.place || {}).venueKey === want);
    const r = resolvePlace((asVenue || visible[0]).place || {});
    resolved = asVenue
      ? { label: r.venue, city: r.city, country: r.country, matchedAs: "place" }
      : { label: r.city || name, city: r.city, country: r.country, matchedAs: "city" };
  }

  ok(res, {
    location: name, page, limit, total: ranked.length,
    resolved,
    hasMore: skip + pageRows.length < ranked.length,
    items: pageRows.map((r) => shapeFeedItem(r.d, ctx)),
  });
});

/* Who and what is active in one place right now. */
export const locationTrending = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const name = String(req.query.city || req.query.name || "").trim();
  const hours = clampHours(req.query.hours, 168);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  if (!name) return fail(res, 400, "A city or place name is required");

  const ctx = await buildViewerContext(viewerId);
  const loose = new RegExp(escapeRx(name), "i");

  const match = baseMatch(ctx);
  match.xtime = { $gte: since(hours) };
  match.$and = [...(match.$and || []), { $or: [{ "place.city": loose }, { "place.name": loose }] }];

  const docs = await Reels.find(match)
    .limit(400)
    .populate("username", AUTHOR_FIELDS)
    .lean();
  // Same resolve-then-match as locationFeed, so the two agree on what is in a city.
  const visible = await filterByPrivacy(
    docs.filter((d) => placeMatches(d.place || {}, name)),
    ctx.viewerId
  );

  const tagCount = {};
  const byAuthor = {};
  for (const d of visible) {
    for (const t of d.hashtags || []) tagCount[t] = (tagCount[t] || 0) + 1;
    const id = String(d.username?._id || d.username);
    if (!byAuthor[id]) byAuthor[id] = { author: d.username, posts: 0, engagement: 0 };
    byAuthor[id].posts += 1;
    byAuthor[id].engagement += engagementOf(d);
  }

  const creatorRows = Object.entries(byAuthor)
    .sort((a, b) => b[1].engagement - a[1].engagement)
    .slice(0, limit);

  const venues = {};
  for (const d of visible) {
    const r = resolvePlace(d.place || {});
    if (r.venue) venues[r.venue] = (venues[r.venue] || 0) + 1;
  }

  ok(res, {
    location: name,
    windowHours: hours,
    posts: visible.length,
    // The specific places people actually checked in to inside this area.
    venues: Object.entries(venues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([venue, posts]) => ({ venue, posts })),
    topics: Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, posts]) => ({ tag, posts })),
    creators: creatorRows.map(([id, v]) =>
      shapeCreator(v.author || { _id: id }, {
        posts: v.posts,
        engagement: Math.round(v.engagement),
        isFollowing: ctx.following.includes(id),
      })
    ),
  });
});
