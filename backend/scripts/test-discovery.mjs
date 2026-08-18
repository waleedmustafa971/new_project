/*
  End-to-end HTTP suite for the Discovery & Search section (/apis/discovery).

  Drives every endpoint against the running server, asserts the failure paths
  as well as the happy ones, and restores the database afterwards.

  The demo data has two gaps this section needs, so the suite seeds them and
  removes them again:
    - no post carries place coordinates, so nothing geo can be exercised
    - no user has a location, a city, or discovery topics

  Run from the backend directory:  node scripts/test-discovery.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/discovery";

/* Demo fixtures. Traits that matter here:
     Sara   — private account; must not leak into people search for a stranger
     Nadia  — the only `business` account
     Ali, Layla, Mariam, Sara — `creator`; Hassan, Omar, Yusuf — `personal`
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  sara:   "6a830332316418fdbc512053",
  yusuf:  "6a830332316418fdbc512054",
  mariam: "6a830332316418fdbc512055",
  ali:    "6a830332316418fdbc512056",
  nadia:  "6a830332316418fdbc512057",
  hassan: "6a830332316418fdbc512058",
};

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
};

const call = async (method, path, { as, query } = {}) => {
  const url = new URL(BASE + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: !["GET", "HEAD"].includes(method) && as ? JSON.stringify({ userId: as }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  // `_http` and not `status`: response bodies carry their own fields.
  return { ...json, _http: res.status };
};
const get = (p, o) => call("GET", p, o);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* ================================================================== */
/* Fixtures                                                            */
/* ================================================================== */

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);

const MARK = "zzdiscoveryprobe";           // hashtag unique to this run
const PLACE = "Jumeirah Probe Beach";      // place name unique to this run
const DUBAI = [55.2708, 25.2048];

/* remove anything an interrupted earlier run left behind */
const sweep = async () => {
  const r1 = await db.collection("reels").deleteMany({ hashtags: { $in: [MARK, `${MARK}two`] } });
  const r2 = await db.collection("searchqueries").deleteMany({});
  const r3 = await db.collection("hashtags").deleteMany({ tag: { $in: [MARK, `${MARK}two`] } });
  await db.collection("users").updateMany(
    { email: /demo\.superapp\.local$/ },
    { $unset: { location: "", city: "", country: "", discoveryTopics: "", followedHashtags: "" } }
  );
  return r1.deletedCount + r2.deletedCount + r3.deletedCount;
};
const swept = await sweep();
if (swept) console.log(`  (swept ${swept} rows from a previous run)`);

/* snapshot what we are about to change, so it can be put back exactly */
const baseline = {
  reels: await db.collection("reels").countDocuments({}),
  hashtags: await db.collection("hashtags").countDocuments({}),
};

const now = new Date();
const seededPosts = [];
const mkPost = async (author, caption, tags, opts = {}) => {
  const doc = {
    videoUrl: { url: opts.video ? "uploads/probe.mp4" : "", type: opts.video ? "video" : "text" },
    videoTitle: caption,
    posttype: opts.video ? "Reel" : "Post",
    username: oid(author),
    status: "active",
    status_draft_publish: "Publish",
    media: opts.video ? [{ url: "uploads/probe.mp4", type: "video", order: 0 }] : [],
    hashtags: tags,
    mentions: [],
    likes: Array.from({ length: opts.likes || 0 }, () => ({ username: oid(U.omar), count: 1, type: "like" })),
    comments: [],
    shares: [],
    savepost: [],
    viewsCount: opts.views || 0,
    group: null,
    groupStatus: "approved",
    xtime: opts.at || now,
  };
  if (opts.place) {
    doc.place = { name: opts.place.name, city: opts.place.city, country: "UAE" };
    if (opts.place.coords) doc.place.location = { type: "Point", coordinates: opts.place.coords };
    doc.location = opts.place.name;
  }
  const r = await db.collection("reels").insertOne(doc);
  seededPosts.push(r.insertedId);
  return r.insertedId;
};

// A topic that is genuinely rising: nothing in the prior window, several now.
await mkPost(U.layla, `Sunset run #${MARK}`, [MARK], { likes: 6, views: 40, video: true, place: { name: PLACE, city: "Dubai", coords: DUBAI } });
await mkPost(U.ali,   `Dunes at dawn #${MARK} #${MARK}two`, [MARK, `${MARK}two`], { likes: 3, views: 20, video: true, place: { name: PLACE, city: "Dubai", coords: DUBAI } });
await mkPost(U.mariam, `Coffee and code #${MARK}`, [MARK], { likes: 1, views: 5 });
// A steady topic: present in both windows, so its velocity stays near 1.
const old = new Date(Date.now() - 100 * 3600 * 1000);
await mkPost(U.yusuf, `Old post #${MARK}two`, [`${MARK}two`], { at: old, likes: 1 });
await mkPost(U.hassan, `Older still #${MARK}two`, [`${MARK}two`], { at: old, likes: 1 });
// Place shapes the resolver has to cope with, all stored as free text:
//   3-part name  -> venue + city + country
//   2-part name  -> city + country, no venue
//   1-part name with a structured city -> venue
await mkPost(U.nadia, `Top of the world #${MARK}`, [MARK],
  { place: { name: "Probe Tower, Dubai, UAE" }, likes: 2 });
await mkPost(U.yusuf, `Just around #${MARK}`, [MARK],
  { place: { name: "Dubai, UAE" }, likes: 1 });

await db.collection("hashtags").insertMany([
  { tag: MARK, postCount: 3, isTrending: false, isBlocked: false, lastUsedAt: now },
  { tag: `${MARK}two`, postCount: 3, isTrending: false, isBlocked: false, lastUsedAt: now },
]);

// Give three creators a real location and a city; leave the rest without one,
// which is the state every demo account is normally in.
await db.collection("users").updateOne({ _id: oid(U.layla) },
  { $set: { location: { type: "Point", coordinates: DUBAI }, city: "Dubai", country: "UAE", discoveryTopics: [MARK] } });
await db.collection("users").updateOne({ _id: oid(U.ali) },
  { $set: { location: { type: "Point", coordinates: [55.28, 25.21] }, city: "Dubai", country: "UAE" } });
// Omar gets the schema's default [0,0] — the Gulf of Guinea trap.
await db.collection("users").updateOne({ _id: oid(U.omar) },
  { $set: { location: { type: "Point", coordinates: [0, 0] } } });

await db.collection("users").createIndex({ location: "2dsphere" }).catch(() => {});
console.log(`  seeded ${seededPosts.length} posts, 2 hashtags, 3 user locations\n`);

/* ================================================================== */
section("1. Search for posts & content");

const noQ = await get("/search", { as: U.omar });
check("search without a term is rejected", noQ._http === 400);

const longQ = await get("/search", { as: U.omar, query: { q: "x".repeat(101) } });
check("an over-long term is rejected", longQ._http === 400);

const badScope = await get("/search", { as: U.omar, query: { q: MARK, scope: "everything" } });
check("an unknown scope is rejected", badScope._http === 400);

const all = await get("/search", { as: U.omar, query: { q: MARK } });
check("unified search returns all four types", all.success === true &&
  all.posts !== undefined && all.users !== undefined &&
  all.hashtags !== undefined && all.places !== undefined);
check("unified search reports per-type counts", all.counts?.posts >= 3, JSON.stringify(all.counts));
check("the hashtag itself is found", (all.hashtags || []).some((h) => h.tag === MARK));

const posts = await get("/search", { as: U.omar, query: { q: MARK, scope: "posts", limit: 10 } });
check("scoped post search paginates", posts.total >= 3 && Array.isArray(posts.items));
check("results carry a relevance score", posts.items?.[0]?.relevance !== undefined);

const place = await get("/search", { as: U.omar, query: { q: "Jumeirah Probe", scope: "places" } });
check("place search finds the seeded place", (place.items || []).some((p) => p.name === PLACE));

const people = await get("/search", { as: U.omar, query: { q: "Layla", scope: "users" } });
check("people search finds by name", (people.items || []).some((u) => u._id === U.layla));

const selfSearch = await get("/search", { as: U.layla, query: { q: "Layla", scope: "users" } });
check("people search excludes the searcher", !(selfSearch.items || []).some((u) => u._id === U.layla));

/* relevance ordering: exact tag beats a caption mention */
const relevance = await get("/search", { as: U.omar, query: { q: MARK, scope: "hashtags" } });
check("exact hashtag ranks above the compound one",
  relevance.items?.[0]?.tag === MARK, relevance.items?.[0]?.tag);

const suggest = await get("/search/suggest", { as: U.omar, query: { q: MARK } });
check("suggest returns a mixed ranked list", (suggest.suggestions || []).length > 0);
check("suggest rows carry a type", ["user", "hashtag", "place"].includes(suggest.suggestions?.[0]?.type));

const emptySuggest = await get("/search/suggest", { as: U.omar, query: { q: "" } });
check("suggest with no term returns empty, not an error",
  emptySuggest.success === true && (emptySuggest.suggestions || []).length === 0);

/* ---- history ---- */
const history = await get("/search/history", { as: U.omar });
check("searches are recorded in history", (history.history || []).some((h) => h.term === MARK));

const histNoUser = await get("/search/history");
check("history without a userId is rejected", histNoUser._http === 400);

await get("/search", { as: U.omar, query: { q: MARK, scope: "posts" } });
const history2 = await get("/search/history", { as: U.omar });
const row = (history2.history || []).find((h) => h.term === MARK);
check("repeating a search bumps its count instead of duplicating",
  row?.count >= 2 && (history2.history || []).filter((h) => h.term === MARK).length === 1,
  `count=${row?.count}`);

const delOne = await call("DELETE", `/search/history/${row?._id}`, { as: U.omar });
check("one history entry can be removed", delOne.removed === 1);

const delMissing = await call("DELETE", `/search/history/${row?._id}`, { as: U.omar });
check("removing it again is a 404", delMissing._http === 404);

const cleared = await call("DELETE", "/search/history", { as: U.omar });
check("the whole history can be cleared", cleared.success === true);
const emptyHist = await get("/search/history", { as: U.omar });
check("history is empty after clearing", (emptyHist.history || []).length === 0);

/* ---- trending searches ---- */
await get("/search", { as: U.omar, query: { q: "desert nights" } });
const oneSearcher = await get("/search/trending", { as: U.omar });
check("one searcher does not make a trend",
  !(oneSearcher.rows || []).some((r) => r.term === "desert nights"),
  JSON.stringify(oneSearcher.rows?.map((r) => r.term)));

await get("/search", { as: U.ali, query: { q: "desert nights" } });
await get("/search", { as: U.mariam, query: { q: "desert nights" } });
const trendSearch = await get("/search/trending", { as: U.omar });
const ds = (trendSearch.rows || []).find((r) => r.term === "desert nights");
check("three searchers make a trend", !!ds, JSON.stringify(trendSearch.rows?.map((r) => r.term)));
check("trending counts distinct searchers", ds?.searchers === 3, `got ${ds?.searchers}`);
check("trending rows carry heat and rank", ds?.heat !== undefined && ds?.rank !== undefined);

/* ================================================================== */
section("2. Search hashtags");

const tagBrowse = await get("/hashtags", { as: U.omar });
check("hashtags with no term returns the browse list", tagBrowse.browse === true && (tagBrowse.rows || []).length > 0);

const tagSearch = await get("/hashtags", { as: U.omar, query: { q: MARK } });
check("hashtag search finds the tag", (tagSearch.rows || []).some((r) => r.tag === MARK));
check("hashtag search is not in browse mode", tagSearch.browse === false);

const tagDetail = await get(`/hashtags/${MARK}`, { as: U.omar });
check("hashtag detail returns counts", tagDetail.posts >= 3, `got ${tagDetail.posts}`);
check("hashtag detail reports contributors", tagDetail.contributors >= 3, `got ${tagDetail.contributors}`);
check("hashtag detail reports velocity", tagDetail.velocity > 0, `got ${tagDetail.velocity}`);
check("hashtag detail returns top posts", (tagDetail.topPosts || []).length > 0);
check("hashtag detail says whether you follow it", tagDetail.isFollowing === false);

const unknownTag = await get("/hashtags/zzzznosuchtagzzzz", { as: U.omar });
check("an unused hashtag is a 404", unknownTag._http === 404);

const related = await get(`/hashtags/${MARK}/related`, { as: U.omar });
check("related hashtags finds the co-occurring tag",
  (related.related || []).some((r) => r.tag === `${MARK}two`),
  JSON.stringify(related.related));
check("related rows carry an affinity share", related.related?.[0]?.affinity > 0);

const follow = await call("POST", `/hashtags/${MARK}/follow`, { as: U.omar });
check("a hashtag can be followed", follow.isFollowing === true);

const following = await get("/hashtags/following", { as: U.omar });
check("followed hashtags are listed", (following.tags || []).some((t) => t.tag === MARK));

const detailAfter = await get(`/hashtags/${MARK}`, { as: U.omar });
check("detail reflects the follow", detailAfter.isFollowing === true);

const unfollow = await call("POST", `/hashtags/${MARK}/follow`, { as: U.omar });
check("following again unfollows (toggle)", unfollow.isFollowing === false);

const followNoUser = await call("POST", `/hashtags/${MARK}/follow`, {});
check("following without a userId is rejected", followNoUser._http === 400);

/* a blocked tag must disappear from search, detail and related */
await db.collection("hashtags").updateOne({ tag: `${MARK}two` }, { $set: { isBlocked: true } });
const blockedSearch = await get("/hashtags", { as: U.omar, query: { q: `${MARK}two` } });
check("a blocked tag is absent from search", !(blockedSearch.rows || []).some((r) => r.tag === `${MARK}two`));
const blockedDetail = await get(`/hashtags/${MARK}two`, { as: U.omar });
check("a blocked tag's detail is a 404", blockedDetail._http === 404);
const relatedAfterBlock = await get(`/hashtags/${MARK}/related`, { as: U.omar });
check("a blocked tag is excluded from related",
  !(relatedAfterBlock.related || []).some((r) => r.tag === `${MARK}two`));
const blockedFollow = await call("POST", `/hashtags/${MARK}two/follow`, { as: U.omar });
check("a blocked tag cannot be followed", blockedFollow._http === 403);
await db.collection("hashtags").updateOne({ tag: `${MARK}two` }, { $set: { isBlocked: false } });

/* ================================================================== */
section("3. Discover creators");

const creators = await get("/creators", { as: U.omar });
check("creator discovery returns a ranked list", (creators.creators || []).length > 0);
check("creators carry reasons", (creators.creators?.[0]?.reasons || []).length > 0);
check("creators carry heat", creators.creators?.[0]?.heat !== undefined);
check("the viewer is not in their own results", !(creators.creators || []).some((c) => c._id === U.omar));

const byType = await get("/creators", { as: U.omar, query: { accountType: "business" } });
check("filtering by accountType works",
  (byType.creators || []).length > 0 && (byType.creators || []).every((c) => c.accountType === "business"));

const badType = await get("/creators", { as: U.omar, query: { accountType: "wizard" } });
check("an unknown accountType is rejected", badType._http === 400);

const verified = await get("/creators", { as: U.omar, query: { verified: "true" } });
check("filtering by verified returns only verified",
  (verified.creators || []).every((c) => c.verifiedBadge === true));

const byCity = await get("/creators", { as: U.omar, query: { city: "Dubai" } });
check("filtering by city works", (byCity.creators || []).some((c) => c._id === U.layla),
  JSON.stringify((byCity.creators || []).map((c) => c.name)));

const byTopic = await get("/creators", { as: U.omar, query: { topic: MARK } });
check("filtering by topic works", (byTopic.creators || []).some((c) => c._id === U.layla));

const sorted = await get("/creators", { as: U.omar, query: { sort: "followers" } });
const fol = (sorted.creators || []).map((c) => c.followers);
check("sort=followers is monotonic", fol.every((v, i) => i === 0 || fol[i - 1] >= v), JSON.stringify(fol));

const top = await get("/creators/top", { as: U.omar, query: { hours: 168 } });
check("top creators ranks by in-window performance", (top.creators || []).length > 0);
check("top creators are ranked from 1", top.creators?.[0]?.rank === 1);

const similar = await get(`/creators/${U.layla}/similar`, { as: U.omar });
check("similar creators returns a basis", ["audience overlap", "shared topics", "none"].includes(similar.basis));
check("similar creators excludes the subject", !(similar.creators || []).some((c) => c._id === U.layla));

const similarBad = await get("/creators/not-an-id/similar", { as: U.omar });
check("similar with a malformed id is a 400", similarBad._http === 400);

const similarMissing = await get("/creators/6a830332316418fdbc5120ff/similar", { as: U.omar });
check("similar for an unknown user is a 404", similarMissing._http === 404);

/* ================================================================== */
section("4. Discover videos");

const videos = await get("/videos", { as: U.omar });
check("video discovery returns the seeded reels",
  (videos.videos || []).some((v) => (v.videoTitle || "").includes(MARK)),
  `${videos.videos?.length} videos`);
check("videos carry heat", videos.videos?.[0]?.heat !== undefined);
check("videos report seen-state", videos.videos?.[0]?.alreadySeen !== undefined);

const vidByTag = await get("/videos", { as: U.omar, query: { hashtag: MARK } });
check("videos can be filtered by hashtag", (vidByTag.videos || []).length >= 2, `got ${vidByTag.videos?.length}`);

const vidRecent = await get("/videos", { as: U.omar, query: { sort: "recent" } });
const times = (vidRecent.videos || []).map((v) => new Date(v.xtime || 0).getTime());
check("sort=recent is monotonic", times.every((t, i) => i === 0 || times[i - 1] >= t));

const cats = await get("/videos/categories", { as: U.omar });
check("video categories includes the seeded tag", (cats.categories || []).some((c) => c.tag === MARK));
check("categories carry a video count", cats.categories?.[0]?.videos > 0);

/* a text-only post must not appear in the video grid */
check("text-only posts stay out of the video grid",
  !(videos.videos || []).some((v) => (v.videoTitle || "").includes("Coffee and code")));

/* ================================================================== */
section("5. Trending topics");

const topics = await get("/topics", { as: U.omar, query: { hours: 72 } });
check("trending topics returns the rising tag", (topics.topics || []).some((t) => t.tag === MARK),
  JSON.stringify((topics.topics || []).map((t) => t.tag)));

const mine = (topics.topics || []).find((t) => t.tag === MARK);
check("topics carry velocity", mine?.velocity > 0, `got ${mine?.velocity}`);
check("topics carry contributor counts", mine?.contributors >= 3, `got ${mine?.contributors}`);
check("a tag with no prior window reads as rising", mine?.rising === true);

const steady = (topics.topics || []).find((t) => t.tag === `${MARK}two`);
check("a steady tag is present but not marked rising",
  steady === undefined || steady.rising === false,
  `velocity=${steady?.velocity}`);

const risingOnly = await get("/topics", { as: U.omar, query: { hours: 72, rising: "true" } });
check("rising=true filters to rising topics only",
  (risingOnly.topics || []).every((t) => t.pinned || t.rising === true));

const topicFeed = await get(`/topics/${MARK}`, { as: U.omar });
check("topic feed returns its posts", topicFeed.total >= 3, `got ${topicFeed.total}`);

const blockedTopic = await get("/topics/zzzznosuch", { as: U.omar });
check("an unknown topic returns an empty feed, not an error",
  blockedTopic.success === true && blockedTopic.total === 0);

/* ================================================================== */
section("6. Location-based discovery");

const noCoords = await get("/nearby", { as: U.omar });
check("nearby without coordinates is rejected", noCoords._http === 400);

const badCoords = await get("/nearby", { as: U.omar, query: { lng: 999, lat: 25 } });
check("out-of-range coordinates are rejected", badCoords._http === 400);

const badNearType = await get("/nearby", { as: U.omar, query: { lng: DUBAI[0], lat: DUBAI[1], type: "aliens" } });
check("an unknown nearby type is rejected", badNearType._http === 400);

const near = await get("/nearby", { as: U.omar, query: { lng: DUBAI[0], lat: DUBAI[1], radiusKm: 25 } });
check("nearby returns posts, creators and places",
  near.posts !== undefined && near.creators !== undefined && near.places !== undefined);
check("nearby finds the seeded posts", (near.posts || []).length >= 2, `got ${near.posts?.length}`);
check("nearby posts carry a distance", near.posts?.[0]?.distanceKm !== undefined);
check("nearby finds the seeded place", (near.places || []).some((p) => p.name === PLACE));
check("nearby finds creators with a real location",
  (near.creators || []).some((c) => c._id === U.layla),
  JSON.stringify((near.creators || []).map((c) => c.name)));

/* the [0,0] trap: Omar's default location must not read as "near Dubai" */
check("an account at the [0,0] default is not near Dubai",
  !(near.creators || []).some((c) => c._id === U.omar));

const nearZero = await get("/nearby", { as: U.layla, query: { lng: 0, lat: 0, radiusKm: 50 } });
check("...nor does it appear when searching from [0,0] itself",
  !(nearZero.creators || []).some((c) => c._id === U.omar),
  JSON.stringify((nearZero.creators || []).map((c) => c.name)));

const scoped = await get("/nearby", { as: U.omar, query: { lng: DUBAI[0], lat: DUBAI[1], type: "creators" } });
check("nearby can be scoped to one type",
  scoped.creators !== undefined && scoped.posts === undefined);

const farAway = await get("/nearby", { as: U.omar, query: { lng: -74, lat: 40.7, radiusKm: 5 } });
check("nearby returns nothing far from the data", (farAway.posts || []).length === 0);

/* name-based browse — the path that works without coordinates */
const locations = await get("/locations", { as: U.omar, query: { limit: 50 } });
const byName = (rows, n) => (rows || []).find((l) => l.name === n);
check("locations browse returns rows", (locations.locations || []).length > 0);

/* A stored name is resolved into venue / city / country rather than grouped
   raw, so a check-in is filed as the specific place it names or as the city it
   only names. */
const tower = byName(locations.locations, "Probe Tower");
check("a 3-part name resolves to a specific place",
  tower?.type === "place" && tower?.city === "Dubai" && tower?.country === "UAE",
  JSON.stringify(tower));

const probeBeach = byName(locations.locations, PLACE);
check("a structured place stays a specific place",
  probeBeach?.type === "place" && probeBeach?.city === "Dubai",
  JSON.stringify(probeBeach));

const abu = byName(locations.locations, "Abu Dhabi");
check("a 2-part city name resolves to a city, not a venue",
  abu?.type === "city" && abu?.country === "UAE",
  JSON.stringify(abu));

check("the country is parsed out of the name string",
  (locations.locations || []).every((l) => l.country !== null || l.type === "place"),
  JSON.stringify((locations.locations || []).map((l) => [l.name, l.country])));

check("no row is labelled with a raw comma-joined name",
  !(locations.locations || []).some((l) => (l.name || "").includes(",")),
  JSON.stringify((locations.locations || []).map((l) => l.name)));

/* the duplicate that started this: "Dubai" and "Dubai, UAE" are one city */
const cities = await get("/locations", { as: U.omar, query: { level: "city", limit: 50 } });
const dubaiRows = (cities.locations || []).filter((l) => l.name === "Dubai");
check("level=city merges 'Dubai' and 'Dubai, UAE' into one row",
  dubaiRows.length === 1,
  JSON.stringify((cities.locations || []).map((l) => l.name)));
check("the merged city counts posts from both shapes",
  dubaiRows[0]?.posts >= 5, `got ${dubaiRows[0]?.posts}`);
check("level=city lists the specific venues inside it",
  (dubaiRows[0]?.venues || []).includes("Probe Tower"),
  JSON.stringify(dubaiRows[0]?.venues));
check("every level=city row is typed as a city",
  (cities.locations || []).every((l) => l.type === "city"));

const badLevel = await get("/locations", { as: U.omar, query: { level: "planet" } });
check("an unknown level is rejected", badLevel._http === 400);

check("browse reports whether coordinates exist",
  (locations.locations || []).some((l) => l.hasCoordinates === true) &&
  (locations.locations || []).some((l) => l.hasCoordinates === false));

const locSearch = await get("/locations", { as: U.omar, query: { q: "Jumeirah" } });
check("locations can be searched by name", (locSearch.locations || []).length > 0);

const searchByCity = await get("/locations", { as: U.omar, query: { q: "Dubai", limit: 50 } });
check("searching a city also finds the venues inside it",
  (searchByCity.locations || []).some((l) => l.name === "Probe Tower"),
  JSON.stringify((searchByCity.locations || []).map((l) => l.name)));

/* feeds resolve the same way */
const locFeed = await get("/locations/Dubai", { as: U.omar });
check("a city feed gathers every shape of that city's check-ins",
  locFeed.total >= 4, `got ${locFeed.total}`);
check("a city feed reports it matched as a city",
  locFeed.resolved?.matchedAs === "city" && locFeed.resolved?.label === "Dubai",
  JSON.stringify(locFeed.resolved));

const venueFeed = await get("/locations/Probe%20Tower", { as: U.omar });
check("a venue feed returns only that venue",
  venueFeed.total === 1, `got ${venueFeed.total}`);
check("a venue feed reports it matched as a place",
  venueFeed.resolved?.matchedAs === "place" && venueFeed.resolved?.city === "Dubai",
  JSON.stringify(venueFeed.resolved));

const locFeedPlace = await get(`/locations/${encodeURIComponent(PLACE)}`, { as: U.omar });
check("location feed also accepts a structured place name", locFeedPlace.total >= 2, `got ${locFeedPlace.total}`);

const locTrend = await get("/locations/trending", { as: U.omar, query: { city: "Dubai" } });
check("location trending returns topics and creators",
  (locTrend.topics || []).length > 0 && (locTrend.creators || []).length > 0);
check("location trending surfaces the seeded topic",
  (locTrend.topics || []).some((t) => t.tag === MARK));
check("location trending lists the specific venues inside the city",
  (locTrend.venues || []).some((v) => v.venue === "Probe Tower"),
  JSON.stringify(locTrend.venues));

const locTrendNoName = await get("/locations/trending", { as: U.omar });
check("location trending without a name is rejected", locTrendNoName._http === 400);

/* route ordering: /locations/trending must not be read as a city name */
check("'trending' is not treated as a location name", locTrend.location === "Dubai");

/* ================================================================== */
section("7. Privacy and isolation");

/* group posts must not leak into any discovery surface */
const grp = await db.collection("socialgroups").insertOne({
  name: "Probe Group", creator: oid(U.layla), members: [oid(U.layla)], admins: [oid(U.layla)],
  pendingRequests: [], isPrivate: true, visibility: "private", createdAt: now, deletedAt: null,
});
const grpPost = await db.collection("reels").insertOne({
  videoUrl: { url: "", type: "text" }, videoTitle: `Secret group post #${MARK}`,
  posttype: "Post", username: oid(U.layla), status: "active", status_draft_publish: "Publish",
  media: [], hashtags: [MARK], mentions: [], likes: [], comments: [], shares: [], savepost: [],
  group: grp.insertedId, groupStatus: "approved", xtime: now,
});

const searchAfterGroup = await get("/search", { as: U.omar, query: { q: MARK, scope: "posts", limit: 50 } });
check("group posts stay out of search",
  !(searchAfterGroup.items || []).some((i) => i._id === String(grpPost.insertedId)));

const topicAfterGroup = await get(`/topics/${MARK}`, { as: U.omar, query: { limit: 50 } });
check("group posts stay out of topic feeds",
  !(topicAfterGroup.items || []).some((i) => i._id === String(grpPost.insertedId)));

const videosAfterGroup = await get("/videos", { as: U.omar, query: { limit: 50 } });
check("group posts stay out of video discovery",
  !(videosAfterGroup.videos || []).some((v) => v._id === String(grpPost.insertedId)));

await db.collection("reels").deleteOne({ _id: grpPost.insertedId });
await db.collection("socialgroups").deleteOne({ _id: grp.insertedId });

/* a private account's posts must not reach a stranger's search */
const saraPost = await db.collection("reels").insertOne({
  videoUrl: { url: "", type: "text" }, videoTitle: `Private thoughts #${MARK}`,
  posttype: "Post", username: oid(U.sara), status: "active", status_draft_publish: "Publish",
  media: [], hashtags: [MARK], mentions: [], likes: [], comments: [], shares: [], savepost: [],
  group: null, groupStatus: "approved", xtime: now,
});

const strangerSearch = await get("/search", { as: U.hassan, query: { q: MARK, scope: "posts", limit: 50 } });
check("a private account's post is hidden from a non-follower",
  !(strangerSearch.items || []).some((i) => i._id === String(saraPost.insertedId)),
  JSON.stringify((strangerSearch.items || []).map((i) => i.videoTitle)));

const ownerSearch = await get("/search", { as: U.sara, query: { q: MARK, scope: "posts", limit: 50 } });
check("...but the author still finds it",
  (ownerSearch.items || []).some((i) => i._id === String(saraPost.insertedId)));

await db.collection("reels").deleteOne({ _id: saraPost.insertedId });

/* ================================================================== */
section("Cleanup");

const delPosts = await db.collection("reels").deleteMany({ _id: { $in: seededPosts } });
const delTags = await db.collection("hashtags").deleteMany({ tag: { $in: [MARK, `${MARK}two`] } });
const delSearches = await db.collection("searchqueries").deleteMany({});
await db.collection("users").updateMany(
  { email: /demo\.superapp\.local$/ },
  { $unset: { location: "", city: "", country: "", discoveryTopics: "", followedHashtags: "" } }
);

console.log(`  removed ${delPosts.deletedCount} posts, ${delTags.deletedCount} hashtags, ` +
            `${delSearches.deletedCount} search rows, and every seeded user field`);

const after = {
  reels: await db.collection("reels").countDocuments({}),
  hashtags: await db.collection("hashtags").countDocuments({}),
};
check("reels back to baseline", after.reels === baseline.reels, `${baseline.reels} -> ${after.reels}`);
check("hashtags back to baseline", after.hashtags === baseline.hashtags, `${baseline.hashtags} -> ${after.hashtags}`);
check("no search rows left", (await db.collection("searchqueries").countDocuments({})) === 0);
check("no seeded user locations left",
  (await db.collection("users").countDocuments({
    email: /demo\.superapp\.local$/, location: { $exists: true },
  })) === 0);

await mongoose.disconnect();

console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
/*
  exitCode rather than process.exit(): forcing an exit while sockets are still
  closing trips a libuv teardown assertion on Windows, which prints a crash
  trace after a clean run. Setting the code lets Node drain and exit on its own.
*/
process.exitCode = failed ? 1 : 0;
