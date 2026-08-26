/*
  End-to-end HTTP suite for the reel viewer's interactions (/apis/reel).

  Covers what the reel screen does to a reel that is already on the phone:
  reading it back with the viewer's own relationship to it, liking and
  unliking, gifting coins to its author, and the author deleting it. Each was
  reported broken from the handset, and each failure had the same shape — the
  client and the server disagreeing about who the viewer was, or an endpoint
  that existed for live but not for a post.

  Drives the running server, asserts the refusals as well as the happy paths,
  and puts the database back exactly as it found it: the test reel is removed,
  and every coin balance, earnings row and gift transaction it created is
  reverted.

  Run from the backend directory, with the server already up:
    node scripts/test-reel-interactions.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000";

/* Demo fixtures, chosen for what they already are:
     AUTHOR   Layla  — owns the test reel; the only one who may delete it
     VIEWER   Omar   — an ordinary viewer: likes, cannot delete
     RICH     Nadia  — 2100 coins, sends the gift that must actually be charged
     BROKE    Hassan — 0 coins, so 402 is a real balance and not a contrivance
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  nadia:  "6a830332316418fdbc512057",
  hassan: "6a830332316418fdbc512058",
};

let pass = 0, failed = 0;
const failures = [];

const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const call = async (method, path, { body, query } = {}) => {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: ["GET", "HEAD", "DELETE"].includes(method) ? undefined : JSON.stringify(body || {}),
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

const TEST_TITLE = "TESTREEL reel-interactions suite";

const coinsOf = async (id) =>
  (await db.collection("users").findOne({ _id: OID(id) }, { projection: { coins: 1 } }))?.coins ?? 0;

/* Anything a previous interrupted run left behind. */
const sweep = async () => {
  const stale = await db.collection("reels").find({ videoTitle: TEST_TITLE }).project({ _id: 1 }).toArray();
  const ids = stale.map((r) => r._id);
  if (ids.length) {
    await db.collection("reels").deleteMany({ _id: { $in: ids } });
    await db.collection("notifications").deleteMany({ post: { $in: ids } });
  }
  return ids.length;
};

const swept = await sweep();
if (swept) console.log(`(swept ${swept} leftover test reel(s))`);

const openingCoins = {
  layla: await coinsOf(U.layla),
  nadia: await coinsOf(U.nadia),
  hassan: await coinsOf(U.hassan),
};

/* A reel of our own, so the user's real reels are never touched. */
const inserted = await db.collection("reels").insertOne({
  videoUrl: "uploads/reels/reel-test.jpeg",
  videoTitle: TEST_TITLE,
  posttype: "Reel",
  username: OID(U.layla),
  xtime: new Date(),
  likes: [], dislikes: [], comments: [], favorites: [], shares: [],
  savepost: [], sharepost: [], stars: [], media: [], taggedUsers: [],
  hashtags: [], mentions: [], stickers: [], viewedBy: [],
  audience: "everyone",
  status_draft_publish: "Publish",
  viewsCount: 0, impressions: 0, engagementScore: 0,
  group: null, groupStatus: "approved",
});
const REEL = String(inserted.insertedId);
console.log(`test reel: ${REEL}\n`);

const giftDoc = await db.collection("gifts").findOne({}, { sort: { coinCost: 1 } });
const GIFT = String(giftDoc._id);
const GIFT_COST = giftDoc.coinCost;

const feedFor = async (userid) => {
  const res = await call("GET", "/apis/reel/getReelFeed", { query: { page: 1, limit: 10, userid } });
  return (res.reels || []).find((r) => String(r._id) === REEL);
};

/* ================================================================= */
section("1. The feed answers who the viewer is");

{
  const mine = await feedFor(U.layla);
  check("author sees the reel in the feed", !!mine);
  check("author gets isOwner: true", mine?.isOwner === true, `got ${mine?.isOwner}`);
  check("author gets liked: false before liking", mine?.liked === false, `got ${mine?.liked}`);

  const theirs = await feedFor(U.omar);
  check("viewer gets isOwner: false", theirs?.isOwner === false, `got ${theirs?.isOwner}`);
  check("viewer gets liked: false", theirs?.liked === false, `got ${theirs?.liked}`);

  const anon = await feedFor("");
  check("anonymous viewer is not treated as the owner", anon?.isOwner === false, `got ${anon?.isOwner}`);
}

/* ================================================================= */
section("2. Like, re-like, unlike");

{
  const first = await call("POST", "/apis/reel/addlike", { body: { username: U.omar, id: REEL } });
  check("a first like is accepted", first._http === 200, `http ${first._http}`);
  check("it reports one like", first.totalLikes === 1, `got ${first.totalLikes}`);
  check("it reports liked: true", first.liked === true, `got ${first.liked}`);

  const shaped = await feedFor(U.omar);
  check("the feed now says liked: true for that viewer", shaped?.liked === true, `got ${shaped?.liked}`);
  const other = await feedFor(U.layla);
  check("...and still false for everyone else", other?.liked === false, `got ${other?.liked}`);

  /*
    The reported bug. Liking twice used to answer 400 "Already liked", which is
    what the handset logged on every tap of a reel it had liked days earlier.
  */
  const again = await call("POST", "/apis/reel/addlike", { body: { username: U.omar, id: REEL } });
  check("liking an already-liked reel is not an error", again._http === 200, `http ${again._http}`);
  check("...and does not double-count", again.totalLikes === 1, `got ${again.totalLikes}`);
  check("...and still reports liked: true", again.liked === true, `got ${again.liked}`);

  const off = await call("POST", "/apis/reel/removeslike", { body: { username: U.omar, id: REEL } });
  check("unlike is accepted", off._http === 200, `http ${off._http}`);
  check("unlike reports zero likes", off.totalLikes === 0, `got ${off.totalLikes}`);
  check("unlike reports liked: false", off.liked === false, `got ${off.liked}`);

  const bad = await call("POST", "/apis/reel/addlike", { body: { username: U.omar, id: "not-an-id" } });
  check("a malformed reel id is refused, not crashed", [400, 404].includes(bad._http), `http ${bad._http}`);
}

/* ================================================================= */
section("3. Gifting a reel");

{
  const before = await coinsOf(U.nadia);
  const authorBefore = await coinsOf(U.layla);

  const sent = await call("POST", "/apis/reel/gift", {
    body: { userId: U.nadia, reelId: REEL, giftId: GIFT, quantity: 2 },
  });
  check("a gift is accepted", sent._http === 200, `http ${sent._http} ${sent.error || ""}`);
  check("it charges unit price x quantity", sent.coinsSpent === GIFT_COST * 2, `got ${sent.coinsSpent}`);

  const after = await coinsOf(U.nadia);
  check("the sender's wallet actually moves", after === before - GIFT_COST * 2, `${before} -> ${after}`);

  const authorAfter = await coinsOf(U.layla);
  check("the author is credited the net", authorAfter === authorBefore + (sent.creatorEarned ?? 0),
        `${authorBefore} -> ${authorAfter}, net ${sent.creatorEarned}`);
  check("gross splits into fee + net", (sent.creatorEarned + sent.platformFee) === GIFT_COST * 2,
        `${sent.creatorEarned} + ${sent.platformFee}`);

  check("the reel's star count reflects it", sent.stars === 2, `got ${sent.stars}`);
  const shaped = await feedFor(U.nadia);
  check("...and the feed reports the same count", shaped?.stars === 2, `got ${shaped?.stars}`);

  const ledger = await db.collection("earningsentries").countDocuments({
    creator: OID(U.layla), from: OID(U.nadia), sourceId: OID(sent.transactionId),
  });
  check("an earnings row explains the credit", ledger === 1, `found ${ledger}`);

  const notif = await db.collection("notifications").countDocuments({ post: OID(REEL), type: "post_gift" });
  check("the author is notified", notif === 1, `found ${notif}`);

  const own = await call("POST", "/apis/reel/gift", {
    body: { userId: U.layla, reelId: REEL, giftId: GIFT },
  });
  check("gifting your own reel is refused", own._http === 400, `http ${own._http}`);

  const broke = await call("POST", "/apis/reel/gift", {
    body: { userId: U.hassan, reelId: REEL, giftId: GIFT },
  });
  check("an empty wallet is refused with 402", broke._http === 402, `http ${broke._http}`);
  check("...and says what it would have cost", /needed/.test(broke.error || ""), broke.error);
  check("...and charges nothing", (await coinsOf(U.hassan)) === openingCoins.hassan);

  const noGift = await call("POST", "/apis/reel/gift", {
    body: { userId: U.nadia, reelId: REEL, giftId: "6a830332316418fdbc5120ff" },
  });
  check("an unknown gift is refused", noGift._http === 404, `http ${noGift._http}`);

  const noReel = await call("POST", "/apis/reel/gift", {
    body: { userId: U.nadia, reelId: "6a830332316418fdbc5120ff", giftId: GIFT },
  });
  check("an unknown reel is refused", noReel._http === 404, `http ${noReel._http}`);

  const junk = await call("POST", "/apis/reel/gift", { body: { userId: U.nadia, reelId: REEL } });
  check("a missing giftId is refused", junk._http === 400, `http ${junk._http}`);
}

/* ================================================================= */
section("4. Deleting your own reel");

/* Everything that can hand a reel back to a client. */
const LISTINGS = [
  ["reel feed",          "/apis/reel/getReelFeed",      { page: 1, limit: 20, userid: U.layla }],
  ["reel list",          "/apis/reel/getreel",          { page: 1, limit: 20, username: U.layla }],
  ["a user's reels",     "/apis/reel/userreels",        { email: U.layla, page: 1 }],
  ["reel search",        "/apis/reel/search-reels",     { search: "TESTREEL", userid: U.layla }],
  ["your content",       "/apis/postreel/your-content", { userid: U.layla, page: 1, limit: 20, posttype: "Reel" }],
  ["recent by posttype", "/apis/postreel/recentstory",  { userid: U.layla, posttype: "Reel" }],
];

/* Serialised whole: these endpoints disagree about what the array is called
   (reels / posts / rows / data), and the point is only whether the id is in it. */
const listsReel = async ([, path, query]) =>
  JSON.stringify(await call("GET", path, { query })).includes(REEL);

{
  /*
    Sampled before the delete as well as after.

    "The id is absent" is also what a misspelled parameter or a 404 looks like,
    so an endpoint that never carried the reel would pass the after-check
    silently forever and guard nothing. Establishing that all six carry it first
    is what makes their absence afterwards mean something.
  */
  const before = new Map();
  for (const row of LISTINGS) before.set(row[0], await listsReel(row));
  const missing = [...before].filter(([, v]) => !v).map(([k]) => k);
  check("every listing under test carries the reel before it is deleted",
        missing.length === 0, missing.join(", "));

  const notMine = await call("DELETE", `/apis/posting/posts/${REEL}`, { query: { userId: U.omar } });
  check("someone else's reel cannot be deleted", notMine._http === 403, `http ${notMine._http}`);
  check("...and it is still in the feed", !!(await feedFor(U.layla)));

  const mine = await call("DELETE", `/apis/posting/posts/${REEL}`, { query: { userId: U.layla } });
  check("the author can delete it", mine._http === 200, `http ${mine._http}`);

  const row = await db.collection("reels").findOne({ _id: OID(REEL) }, { projection: { status: 1 } });
  check("it is soft-deleted, not destroyed", row?.status === "deleted", `status ${row?.status}`);

  /*
    A soft delete only looks like a delete if nothing lists the tombstone, and
    the filter has to be repeated in every hand-rolled query -- so forgetting one
    is invisible: the delete succeeds, the row is marked, and the reel carries on
    appearing in whichever list was missed. It was missed in three (`getreel`,
    `your-content`, `recentstory`), which is what "I deleted a reel and it is
    still showing" meant. Every listing is asked here so the next query added
    without the filter fails in this file rather than on a handset.
  */
  for (const row of LISTINGS) {
    check(`...and gone from ${row[0]}`, !(await listsReel(row)), row[1]);
  }

  check("...and gone for a different viewer too", !(await feedFor(U.omar)));
}

/* ================================================================= */
section("Cleanup");

{
  const gifted = await db.collection("giftstransactions").find({
    receiver: OID(U.layla), gift: OID(GIFT),
  }).sort({ createdAt: -1 }).limit(1).toArray();

  await db.collection("reels").deleteMany({ videoTitle: TEST_TITLE });
  await db.collection("notifications").deleteMany({ post: OID(REEL) });
  if (gifted.length) {
    await db.collection("earningsentries").deleteMany({ sourceId: gifted[0]._id });
    await db.collection("giftstransactions").deleteOne({ _id: gifted[0]._id });
  }

  /* Coins moved for real, so put every balance back to what it opened at. */
  for (const [who, coins] of Object.entries(openingCoins)) {
    await db.collection("users").updateOne({ _id: OID(U[who]) }, { $set: { coins } });
  }

  check("the gift transaction it created is gone", gifted.length === 1
    && (await db.collection("giftstransactions").countDocuments({ _id: gifted[0]._id })) === 0,
    `matched ${gifted.length} transaction(s)`);
  check("...and so is its earnings row", gifted.length === 1
    && (await db.collection("earningsentries").countDocuments({ sourceId: gifted[0]._id })) === 0);
  check("the test reel is gone", (await db.collection("reels").countDocuments({ videoTitle: TEST_TITLE })) === 0);
  check("Layla's coins are back to baseline", (await coinsOf(U.layla)) === openingCoins.layla);
  check("Nadia's coins are back to baseline", (await coinsOf(U.nadia)) === openingCoins.nadia);
  check("Hassan's coins are back to baseline", (await coinsOf(U.hassan)) === openingCoins.hassan);
}

console.log(`\n${"=".repeat(66)}`);
console.log(`${pass} passed, ${failed} failed`);
if (failed) console.log(`failing: ${failures.join(", ")}`);
console.log("=".repeat(66));

await mongoose.disconnect();
process.exitCode = failed ? 1 : 0;
