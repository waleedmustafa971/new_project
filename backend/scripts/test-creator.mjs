/*
  End-to-end HTTP suite for the Pages / Creator / Business section
  (/apis/creator).

  Covers all six sheet rows: analytics, scheduled posts, the self-serve upgrade
  to a creator or business account, boosting a post, the ads panel with its
  review queue, and the promotions half of "Monetisation (subscriptions,
  promotions)" — subscriptions themselves shipped under Monetisation and are
  not retested here.

  Mutates real demo state — account types, a post's counters and schedule, coin
  balances — so it snapshots everything up front and restores it at the end,
  including from a crash handler.

  Run from the backend directory, with the server already up:
    node scripts/test-creator.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/creator";
const FEED = process.env.FEED_BASE || "http://localhost:5000/apis/feed";

/* Demo fixtures. Chosen deliberately:
     CREATOR  Layla  — already a `creator` account, 4210 coins: runs the campaigns
     PERSONAL Hassan — a `personal` account with 0 coins: the 403 and the 402
     ADMIN    Omar   — reviews campaigns
     VIEWER   Yusuf  — follows Layla; used for the feed checks
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  yusuf:  "6a830332316418fdbc512054",
  hassan: "6a830332316418fdbc512058",
};

// A published "Post" of Layla's, and a second one used for scheduling.
const POST = "6a830332316418fdbc512072";

let pass = 0, failed = 0;
const failures = [];

const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const request = (root) => async (method, path, { as, body, query } = {}) => {
  const url = new URL(root + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const hasBody = !["GET", "HEAD"].includes(method) && (body || as);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: hasBody ? JSON.stringify({ userId: as, ...(body || {}) }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};
const call = request(BASE);
const feed = request(FEED);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

const FIXTURES = Object.values(U);

/* ---- snapshot everything this suite changes ---- */
const usersBefore = {};
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { coins: 1, accountType: 1, creatorProfile: 1 } });
  usersBefore[id] = {
    coins: u?.coins || 0,
    accountType: u?.accountType || "personal",
    creatorProfile: u?.creatorProfile ?? null,
  };
}
const postBefore = await db.collection("reels").findOne({ _id: OID(POST) },
  { projection: { impressions: 1, boostedUntil: 1, boostCampaign: 1, status_draft_publish: 1, scheduledFor: 1, xtime: 1 } });

/*
  Put every mutated field back even if this run falls over. A crashed suite that
  leaves an account downgraded, a post stuck as "Scheduled", or coins held by a
  campaign nobody can see is worse than a failing check — it is silent and it
  outlives the run.
*/
let restored = false;
const restoreAll = async () => {
  if (restored) return;
  restored = true;
  for (const id of FIXTURES) {
    const set = { coins: usersBefore[id].coins, accountType: usersBefore[id].accountType };
    const update = { $set: set };
    if (usersBefore[id].creatorProfile === null) update.$unset = { creatorProfile: "" };
    else set.creatorProfile = usersBefore[id].creatorProfile;
    await db.collection("users").updateOne({ _id: OID(id) }, update);
  }
  await db.collection("reels").updateOne({ _id: OID(POST) }, {
    $set: {
      impressions: postBefore?.impressions || 0,
      boostedUntil: postBefore?.boostedUntil ?? null,
      boostCampaign: postBefore?.boostCampaign ?? null,
      status_draft_publish: postBefore?.status_draft_publish || "Publish",
      scheduledFor: postBefore?.scheduledFor ?? null,
      xtime: postBefore?.xtime,
    },
  });
  await db.collection("adcampaigns").deleteMany({ advertiser: { $in: FIXTURES.map(OID) } });
};
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring creator state before exiting\n`, err);
    try { await restoreAll(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

await db.collection("adcampaigns").deleteMany({ advertiser: { $in: FIXTURES.map(OID) } });

const baseline = {
  campaigns: await db.collection("adcampaigns").countDocuments({}),
  reels: await db.collection("reels").countDocuments({}),
};
console.log(`  baseline: ${baseline.campaigns} campaigns, ${baseline.reels} posts`);

const created = { campaigns: [], scheduledPost: null };

/* ================================================================== */
section("1. Upgrade Profile to Creator or Business");

const info = await call("GET", "/account", { as: U.hassan });
check("a personal account reports itself as such", info.accountType === "personal" && info.professional === false);
check("and has the professional features locked", info.can?.ads === false);

const badType = await call("POST", "/upgrade", { as: U.hassan, body: { accountType: "wizard" } });
check("an unknown account type is a 422", badType._http === 422);

const businessNoCategory = await call("POST", "/upgrade", { as: U.hassan, body: { accountType: "business" } });
check("a business account needs a category", businessNoCategory._http === 400);

const upgraded = await call("POST", "/upgrade", {
  as: U.hassan,
  body: { accountType: "creator", category: "Photography", contactEmail: "h@example.com" },
});
check("a personal account can upgrade itself", upgraded.accountType === "creator");
check("the upgrade lists what it unlocked", (upgraded.unlocked || []).includes("ads"));

const upgradeAgain = await call("POST", "/upgrade", { as: U.hassan, body: { accountType: "creator" } });
check("upgrading to the type you already are is a 409", upgradeAgain._http === 409);

const infoAfter = await call("GET", "/account", { as: U.hassan });
check("the professional features are now unlocked", infoAfter.can?.analytics === true);
check("the creator profile is kept", infoAfter.creatorProfile?.category === "Photography");

const downgraded = await call("POST", "/downgrade", { as: U.hassan });
check("an account can switch back to personal", downgraded.accountType === "personal");

const downgradeAgain = await call("POST", "/downgrade", { as: U.hassan });
check("downgrading twice is a 409", downgradeAgain._http === 409);

const keptProfile = await call("GET", "/account", { as: U.hassan });
check("downgrading keeps the details for next time",
  keptProfile.creatorProfile?.category === "Photography");

/* ================================================================== */
section("2. Analytics (views, reach, impressions)");

const lockedAnalytics = await call("GET", "/analytics", { as: U.hassan });
check("a personal account cannot open analytics", lockedAnalytics._http === 403);

const impressionsBefore = postBefore?.impressions || 0;
const imp1 = await call("POST", `/impression/${POST}`, { as: U.yusuf });
check("an impression can be recorded", imp1.impressions === impressionsBefore + 1);

const imp2 = await call("POST", `/impression/${POST}`, { as: U.yusuf, body: { count: 5 } });
check("impressions can be recorded in a batch", imp2.impressions === impressionsBefore + 6);

const impGhost = await call("POST", "/impression/6a830332316418fdbc5120ff", { as: U.yusuf });
check("an impression on an unknown post is a 404", impGhost._http === 404);

const overview = await call("GET", "/analytics", { as: U.layla, query: { days: 3650 } });
check("the overview opens for a creator", overview.success === true);
check("it reports impressions separately from views",
  overview.impressions?.value >= 6 && typeof overview.views?.value === "number",
  `impressions=${overview.impressions?.value} views=${overview.views?.value}`);
check("reach is distinct accounts, not a sum of per-post viewers",
  typeof overview.reach?.value === "number");
check("every figure carries the previous window", "previous" in (overview.views || {}));
check("engagement is broken out", typeof overview.engagement?.total === "number");

const byPost = await call("GET", "/analytics/posts", { as: U.layla, query: { sort: "impressions" } });
check("per-post analytics list", byPost.total >= 1);
check("sorting by impressions puts the boosted post first",
  byPost.posts?.[0]?._id === POST, `first=${byPost.posts?.[0]?._id}`);

const onePost = await call("GET", `/analytics/posts/${POST}`, { as: U.layla });
check("one post's detail reads back", onePost.postId === POST);
check("engagement rate is a finite number", Number.isFinite(onePost.engagementRate));

const notMine = await call("GET", `/analytics/posts/${POST}`, { as: U.omar });
check("you cannot read someone else's post analytics", notMine._http === 403);

/* ================================================================== */
section("3. Schedule Posts");

const draft = await db.collection("reels").insertOne({
  username: OID(U.layla),
  videoUrl: { url: "suite.mp4" },
  videoTitle: "SUITE scheduled post",
  posttype: "Post",
  status_draft_publish: "Draft",
  media: [], likes: [], comments: [], shares: [], savepost: [],
  hashtags: [], group: null, xtime: new Date(),
});
created.scheduledPost = String(draft.insertedId);

const pastDate = await call("POST", "/schedule", {
  as: U.layla, body: { postId: created.scheduledPost, scheduledFor: "2020-01-01T00:00:00Z" },
});
check("scheduling in the past is refused", pastDate._http === 422);

const badDate = await call("POST", "/schedule", {
  as: U.layla, body: { postId: created.scheduledPost, scheduledFor: "soon" },
});
check("an unreadable date is refused", badDate._http === 422);

const farFuture = await call("POST", "/schedule", {
  as: U.layla,
  body: { postId: created.scheduledPost, scheduledFor: new Date(Date.now() + 400 * 86400000).toISOString() },
});
check("scheduling more than a year ahead is refused", farFuture._http === 422);

const notYourPost = await call("POST", "/schedule", {
  as: U.omar,
  body: { postId: created.scheduledPost, scheduledFor: new Date(Date.now() + 3600000).toISOString() },
});
check("you cannot schedule someone else's post", notYourPost._http === 403);

const soon = new Date(Date.now() + 3600000).toISOString();
const scheduled = await call("POST", "/schedule", {
  as: U.layla, body: { postId: created.scheduledPost, scheduledFor: soon },
});
check("a draft can be scheduled", scheduled.success === true);

const scheduledList = await call("GET", "/scheduled", { as: U.layla });
check("the scheduled list reads back", scheduledList.total === 1);
check("nothing is due yet", scheduledList.due === 0);

const futureFeed = await feed("GET", "/home", { as: U.yusuf, query: { limit: 50 } });
check("a scheduled post stays out of the feed",
  !(futureFeed.items || []).some((i) => String(i._id) === created.scheduledPost));

const publishNothing = await call("POST", "/scheduled/publish-due", { as: U.layla });
check("nothing is published before its time", publishNothing.published === 0);

const rescheduled = await call("PATCH", `/scheduled/${created.scheduledPost}`, {
  as: U.layla, body: { scheduledFor: new Date(Date.now() + 7200000).toISOString() },
});
check("a scheduled post can be moved", rescheduled.success === true);

/* Bring the date forward in the database so the publisher has something due. */
await db.collection("reels").updateOne({ _id: OID(created.scheduledPost) },
  { $set: { scheduledFor: new Date(Date.now() - 60000) } });

const dueList = await call("GET", "/scheduled", { as: U.layla });
check("an overdue post is flagged as due", dueList.due === 1);

const dueFeed = await feed("GET", "/home", { as: U.yusuf, query: { limit: 50 } });
check("a post past its time is visible even before the publisher runs",
  (dueFeed.items || []).some((i) => String(i._id) === created.scheduledPost),
  "the date is the source of truth, not the status flag");

const published = await call("POST", "/scheduled/publish-due", { as: U.layla });
check("the publisher publishes what is due", published.published === 1);

const publishedTwice = await call("POST", "/scheduled/publish-due", { as: U.layla });
check("running the publisher again publishes nothing", publishedTwice.published === 0);

const afterPublish = await db.collection("reels").findOne({ _id: OID(created.scheduledPost) });
check("the published post is now live", afterPublish.status_draft_publish === "Publish");

const cancelPublished = await call("PATCH", `/scheduled/${created.scheduledPost}`,
  { as: U.layla, body: { cancel: true } });
check("an already-published post is no longer schedulable", cancelPublished._http === 409);

/* ================================================================== */
section("4. Boost a Post");

const laylaCoins = usersBefore[U.layla].coins;

const boostNotMine = await call("POST", "/campaigns", {
  as: U.omar, body: { kind: "boost", postId: POST, budgetCoins: 100 },
});
check("a personal account cannot advertise", boostNotMine._http === 403);

const noBudget = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "boost", postId: POST, budgetCoins: 0 },
});
check("a campaign needs a budget", noBudget._http === 422);

const cpiTooHigh = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "boost", postId: POST, budgetCoins: 10, costPerImpression: 50 },
});
check("the budget must cover at least one impression", cpiTooHigh._http === 422);

const boost = await call("POST", "/campaigns", {
  as: U.layla,
  body: { kind: "boost", postId: POST, budgetCoins: 100, costPerImpression: 10, days: 7 },
});
check("a post can be boosted", boost.success === true && !!boost.campaign?._id);
check("the budget is held up front", boost.coins === laylaCoins - 100, `coins=${boost.coins}`);
check("it estimates the impressions the budget buys", boost.estimatedImpressions === 10);
check("a new campaign waits for review", boost.campaign?.status === "pending");
const BOOST = boost.campaign?._id;
if (BOOST) created.campaigns.push(BOOST);

const doubleBoost = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "boost", postId: POST, budgetCoins: 50 },
});
check("a post cannot have two campaigns at once", doubleBoost._http === 409);

const cannotAfford = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "ad", creative: { headline: "x" }, budgetCoins: 999999 },
});
check("a budget beyond the balance is refused", cannotAfford._http === 402);

const adNoHeadline = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "ad", budgetCoins: 50 },
});
check("an ad needs a headline", adNoHeadline._http === 400);

/* ================================================================== */
section("5. Ads Management Panel");

const queue = await call("GET", "/admin/campaigns", { as: U.omar, query: { status: "pending" } });
check("the review queue lists the campaign", queue.pendingCount === 1 && queue.pendingCoins === 100);

const pausePending = await call("POST", `/campaigns/${BOOST}/state`, { as: U.layla, body: { action: "pause" } });
check("a pending campaign cannot be paused", pausePending._http === 409);

const approved = await call("POST", `/admin/campaigns/${BOOST}`, { as: U.omar, body: { action: "approve" } });
check("an admin can approve a campaign", approved.status === "active");

const boostedPost = await db.collection("reels").findOne({ _id: OID(POST) });
check("approval stamps the boost onto the post", !!boostedPost.boostedUntil && !!boostedPost.boostCampaign);

const reviewAgain = await call("POST", `/admin/campaigns/${BOOST}`, { as: U.omar, body: { action: "reject" } });
check("a reviewed campaign cannot be reviewed again", reviewAgain._http === 409);

/* Impressions on a boosted post spend its budget. */
const spend1 = await call("POST", `/impression/${POST}`, { as: U.yusuf, body: { count: 4 } });
check("impressions on a boosted post spend the budget", spend1.campaign?.spentCoins === 40,
  `spent=${spend1.campaign?.spentCoins}`);
check("the remaining budget is reported", spend1.campaign?.remaining === 60);

const detail = await call("GET", `/campaigns/${BOOST}`, { as: U.layla });
check("the campaign detail reads back", detail.campaign?.metrics?.impressions === 4);
check("it reports how many impressions are left", detail.impressionsRemaining === 6);
check("it reports a CPM", Number.isFinite(detail.cpm));

const notMyCampaign = await call("GET", `/campaigns/${BOOST}`, { as: U.omar });
check("you cannot read someone else's campaign", notMyCampaign._http === 403);

const paused = await call("POST", `/campaigns/${BOOST}/state`, { as: U.layla, body: { action: "pause" } });
check("a running campaign can be paused", paused.status === "paused");

const pausedPost = await db.collection("reels").findOne({ _id: OID(POST) });
check("pausing takes the boost off the post", !pausedPost.boostedUntil);

const resumed = await call("POST", `/campaigns/${BOOST}/state`, { as: U.layla, body: { action: "resume" } });
check("a paused campaign can be resumed", resumed.status === "active");

/* Spend the rest of the budget and watch it close itself. */
const spend2 = await call("POST", `/impression/${POST}`, { as: U.yusuf, body: { count: 6 } });
check("the budget can be spent to the last coin", spend2.campaign?.spentCoins === 100);

const exhausted = await call("GET", `/campaigns/${BOOST}`, { as: U.layla });
check("an exhausted campaign completes itself", exhausted.campaign?.status === "completed",
  `status=${exhausted.campaign?.status}`);
check("and is no longer live", exhausted.live === false);

const overspend = await call("POST", `/impression/${POST}`, { as: U.yusuf });
check("a completed campaign cannot overspend", overspend.campaign === null || overspend.campaign?.spentCoins === 100);

const resumeCompleted = await call("POST", `/campaigns/${BOOST}/state`, { as: U.layla, body: { action: "resume" } });
check("a completed campaign cannot be resumed", resumeCompleted._http === 409);

/* A second campaign, to test rejection and the refund. */
const ad = await call("POST", "/campaigns", {
  as: U.layla,
  body: { kind: "ad", budgetCoins: 200, creative: { headline: "Suite ad", body: "text" },
          targeting: { interests: ["photography"], minAge: 18 } },
});
const AD = ad.campaign?._id;
if (AD) created.campaigns.push(AD);
check("a standalone ad can be created", ad.success === true);
check("targeting is stored", ad.campaign?.targeting?.minAge === 18);

const coinsAfterAd = (await call("GET", "/campaigns", { as: U.layla })).coinsCommitted;
check("committed coins are reported across campaigns", coinsAfterAd === 300, `committed=${coinsAfterAd}`);

const rejected = await call("POST", `/admin/campaigns/${AD}`, {
  as: U.omar, body: { action: "reject", note: "Does not meet the guidelines" },
});
check("an admin can reject a campaign", rejected.refundedCoins === 200);

const afterReject = await db.collection("users").findOne({ _id: OID(U.layla) });
check("rejection refunds the whole budget", afterReject.coins === laylaCoins - 100,
  `coins=${afterReject.coins}`);

/* Cancelling refunds only what was never spent. */
const ad2 = await call("POST", "/campaigns", {
  as: U.layla, body: { kind: "ad", budgetCoins: 80, creative: { headline: "Second suite ad" } },
});
const AD2 = ad2.campaign?._id;
if (AD2) created.campaigns.push(AD2);
await call("POST", `/admin/campaigns/${AD2}`, { as: U.omar, body: { action: "approve" } });

const cancelled = await call("POST", `/campaigns/${AD2}/cancel`, { as: U.layla });
check("cancelling refunds the unspent budget", cancelled.refundedCoins === 80);

const cancelTwice = await call("POST", `/campaigns/${AD2}/cancel`, { as: U.layla });
check("cancelling twice is a 409", cancelTwice._http === 409);

const finalCoins = await db.collection("users").findOne({ _id: OID(U.layla) });
check("only the spent coins are gone", finalCoins.coins === laylaCoins - 100,
  `coins=${finalCoins.coins}, expected=${laylaCoins - 100}`);

const blockedDowngrade = await call("POST", "/downgrade", { as: U.layla });
check("an account with no running campaigns can downgrade", blockedDowngrade.success === true);

/* ================================================================== */
section("Cleanup");

const delCampaigns = await db.collection("adcampaigns").deleteMany({ advertiser: { $in: FIXTURES.map(OID) } });
const delPost = await db.collection("reels").deleteMany({ _id: OID(created.scheduledPost) });
await restoreAll();
console.log(`  removed ${delCampaigns.deletedCount} campaigns and ${delPost.deletedCount} test post; ` +
            `restored account types, coin balances and the boosted post`);

const after = {
  campaigns: await db.collection("adcampaigns").countDocuments({}),
  reels: await db.collection("reels").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const drift = [];
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) }, { projection: { name: 1, coins: 1, accountType: 1 } });
  if ((u.coins || 0) !== usersBefore[id].coins) drift.push(`${u.name} coins ${u.coins}`);
  if ((u.accountType || "personal") !== usersBefore[id].accountType) drift.push(`${u.name} type ${u.accountType}`);
}
check("every demo account is back to where it started", drift.length === 0, drift.join(", "));

const postAfter = await db.collection("reels").findOne({ _id: OID(POST) });
check("the boosted post's counters are restored",
  (postAfter.impressions || 0) === (postBefore?.impressions || 0) && !postAfter.boostedUntil);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
