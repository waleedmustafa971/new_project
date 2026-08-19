/*
  End-to-end HTTP suite for the Safety & Privacy section
  (/apis/safety and /apis/privacy).

  Covers all eight sheet rows: restricting a user, age restrictions, login
  alerts, per-post visibility, profile privacy, hiding a post, reporting a post,
  and blocking. The last four were already partly built, so they are exercised
  here for the gaps rather than rebuilt.

  This suite mutates real demo state — restrict lists, close friends, dates of
  birth, a post's audience — so it snapshots all of it up front and restores it
  at the end, including from a crash handler.

  Run from the backend directory, with the server already up:
    node scripts/test-safety.mjs
*/

const SAFETY = process.env.SAFETY_BASE || "http://localhost:5000/apis/safety";
const PRIVACY = process.env.PRIVACY_BASE || "http://localhost:5000/apis/privacy";
const FEED = process.env.FEED_BASE || "http://localhost:5000/apis/feed";
const AUTH = process.env.AUTH_BASE || "http://localhost:5000/apis/auth";

/* Demo fixtures. Chosen deliberately:
     OWNER      Layla  — owns the test post; restricts, hides, sets visibility
     RESTRICTED Ali    — follows Layla, gets restricted; his comment is held
     FOLLOWER   Omar   — follows Layla; becomes her close friend mid-suite
     OTHER      Yusuf  — follows Layla but is never a close friend
     STRANGER   Hassan — does NOT follow Layla: the followers-only 403
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  yusuf:  "6a830332316418fdbc512054",
  ali:    "6a830332316418fdbc512056",
  hassan: "6a830332316418fdbc512058",
};

// A real "Post" of Layla's, used as the visibility subject.
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

const request = (root) => async (method, path, { as, body, query, headers } = {}) => {
  const url = new URL(root + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const hasBody = !["GET", "HEAD"].includes(method) && (body || as);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: hasBody ? JSON.stringify({ userId: as, ...(body || {}) }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};
const safety = request(SAFETY);
const privacy = request(PRIVACY);
const feed = request(FEED);
const auth = request(AUTH);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

const EMAIL = "safety-suite@test.local";
const PASSWORD = "SafetyPassw0rd!";
const FIXTURES = Object.values(U);

/* ---- snapshot everything this suite is going to change ---- */
const before = {};
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne(
    { _id: OID(id) },
    { projection: { restrictedUsers: 1, hiddenPosts: 1, closeFriends: 1, dateofbirth: 1 } }
  );
  before[id] = {
    restrictedUsers: u?.restrictedUsers || [],
    hiddenPosts: u?.hiddenPosts || [],
    closeFriends: u?.closeFriends || [],
    dateofbirth: u?.dateofbirth ?? null,
  };
}
const postBefore = await db.collection("reels").findOne(
  { _id: OID(POST) }, { projection: { audience: 1, ageRestricted: 1, comments: 1 } }
);

/*
  Put every mutated field back, even if this run falls over part-way. A crashed
  suite that leaves someone restricted, or a post stuck on "onlyMe", is worse
  than a failing check — the damage is silent and outlives the run.
*/
let restored = false;
const restoreAll = async () => {
  if (restored) return;
  restored = true;
  for (const id of FIXTURES) {
    await db.collection("users").updateOne({ _id: OID(id) }, {
      $set: {
        restrictedUsers: before[id].restrictedUsers,
        hiddenPosts: before[id].hiddenPosts,
        closeFriends: before[id].closeFriends,
        ...(before[id].dateofbirth === null ? {} : { dateofbirth: before[id].dateofbirth }),
      },
      ...(before[id].dateofbirth === null ? { $unset: { dateofbirth: "" } } : {}),
    });
  }
  await db.collection("reels").updateOne({ _id: OID(POST) }, {
    $set: {
      audience: postBefore?.audience ?? "everyone",
      ageRestricted: !!postBefore?.ageRestricted,
      comments: postBefore?.comments || [],
    },
  });
  await db.collection("users").deleteMany({ email: EMAIL });
  await db.collection("loginevents").deleteMany({});
  await db.collection("notifications").deleteMany({ type: "login_alert" });
};
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring safety state before exiting\n`, err);
    try { await restoreAll(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

/* sweep anything a previous interrupted run left behind */
await db.collection("users").deleteMany({ email: EMAIL });
await db.collection("loginevents").deleteMany({});
await db.collection("notifications").deleteMany({ type: "login_alert" });

const baseline = {
  loginEvents: await db.collection("loginevents").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
  users: await db.collection("users").countDocuments({}),
};
console.log(`  baseline: ${baseline.users} users, ${baseline.notifications} notifications, ` +
            `${baseline.loginEvents} login events`);

/* ================================================================== */
section("1. Restrict a User");

const restrictSelf = await safety("POST", "/restrict", { as: U.layla, body: { targetId: U.layla } });
check("you cannot restrict yourself", restrictSelf._http === 400);

const restrictGhost = await safety("POST", "/restrict", { as: U.layla, body: { targetId: "6a830332316418fdbc5120ff" } });
check("restricting an unknown account is a 404", restrictGhost._http === 404);

const restricted = await safety("POST", "/restrict", { as: U.layla, body: { targetId: U.ali } });
check("an account can be restricted", restricted.success === true && restricted.restricted === true);

const restrictTwice = await safety("POST", "/restrict", { as: U.layla, body: { targetId: U.ali } });
check("restricting twice is a 409", restrictTwice._http === 409);

const list = await safety("GET", "/restricted", { as: U.layla });
check("the restricted list reads back", list.total === 1 && list.restricted[0]?.name === "Ali Mansour");

const status = await safety("GET", `/restrict-status/${U.ali}`, { as: U.layla });
check("restrict status is reported to the owner", status.restricted === true);

/*
  The restricted person must never be able to discover it. Asking the endpoint
  the other way round answers about Ali's own list, not about Layla's.
*/
const reverse = await safety("GET", `/restrict-status/${U.layla}`, { as: U.ali });
check("the restricted person cannot discover the restriction", reverse.restricted === false);

const noNotification = await db.collection("notifications").countDocuments({
  recipient: OID(U.ali), type: { $in: ["follow", "subscription"] }, actor: OID(U.layla),
});
check("restricting sends the restricted person nothing", noNotification === 0);

/* A comment from a restricted person is held until the author approves it. */
const commentId = new mongoose.Types.ObjectId();
await db.collection("reels").updateOne({ _id: OID(POST) }, {
  $push: { comments: {
    _id: commentId, username: OID(U.ali), message: "held comment from a restricted user",
    timestamp: new Date(), likes: [], reply: [], parentId: null,
    deleted: false, restrictedApproved: false,
  } },
});

const queue = await safety("GET", "/restricted-comments", { as: U.layla });
check("a restricted person's comment is held for review", queue.total === 1,
  `total=${queue.total}`);
check("the queue names the post it is on", queue.comments?.[0]?.postId === POST);

const decideByOther = await safety("POST", "/restricted-comments/decide",
  { as: U.omar, body: { postId: POST, commentId: String(commentId), action: "approve" } });
check("only the post's author can decide", decideByOther._http === 403);

const badAction = await safety("POST", "/restricted-comments/decide",
  { as: U.layla, body: { postId: POST, commentId: String(commentId), action: "maybe" } });
check("an unknown decision is rejected", badAction._http === 400);

const approved = await safety("POST", "/restricted-comments/decide",
  { as: U.layla, body: { postId: POST, commentId: String(commentId), action: "approve" } });
check("the author can approve a held comment", approved.success === true);

const queueAfter = await safety("GET", "/restricted-comments", { as: U.layla });
check("an approved comment leaves the queue", queueAfter.total === 0);

const unrestricted = await safety("POST", "/unrestrict", { as: U.layla, body: { targetId: U.ali } });
check("a restriction can be lifted", unrestricted.restricted === false);

const unrestrictTwice = await safety("POST", "/unrestrict", { as: U.layla, body: { targetId: U.ali } });
check("lifting a restriction that is not there is a 404", unrestrictTwice._http === 404);

/* ================================================================== */
section("2. Hide a Post");

const hideGhost = await safety("POST", "/hide-post", { as: U.omar, body: { postId: "6a830332316418fdbc5120ff" } });
check("hiding an unknown post is a 404", hideGhost._http === 404);

const feedBefore = await feed("GET", "/home", { as: U.omar, query: { limit: 50 } });
const wasVisible = (feedBefore.items || []).some((i) => String(i._id) === POST);
check("the post is in the follower's feed to begin with", wasVisible === true,
  `${(feedBefore.items || []).length} items`);

const hidden = await safety("POST", "/hide-post", { as: U.omar, body: { postId: POST } });
check("a post can be hidden from your own feed", hidden.hidden === true);

const hideTwice = await safety("POST", "/hide-post", { as: U.omar, body: { postId: POST } });
check("hiding twice is a 409", hideTwice._http === 409);

const hiddenList = await safety("GET", "/hidden-posts", { as: U.omar });
check("the hidden list reads back", hiddenList.total === 1);

const feedAfter = await feed("GET", "/home", { as: U.omar, query: { limit: 50 } });
check("the hidden post is gone from the feed",
  !(feedAfter.items || []).some((i) => String(i._id) === POST));

const otherFeed = await feed("GET", "/home", { as: U.yusuf, query: { limit: 50 } });
check("hiding affects nobody else's feed",
  (otherFeed.items || []).some((i) => String(i._id) === POST));

const unhidden = await safety("POST", "/unhide-post", { as: U.omar, body: { postId: POST } });
check("a post can be unhidden", unhidden.hidden === false);

const unhideTwice = await safety("POST", "/unhide-post", { as: U.omar, body: { postId: POST } });
check("unhiding twice is a 404", unhideTwice._http === 404);

/* ================================================================== */
section("3. Post Visibility Controls");

const setByOther = await privacy("PATCH", `/posts/${POST}/audience`,
  { as: U.omar, body: { audience: "followers" } });
check("only the author can set a post's audience", setByOther._http === 403);

const badAudience = await privacy("PATCH", `/posts/${POST}/audience`,
  { as: U.layla, body: { audience: "everyone-ish" } });
check("an unknown audience is a 422", badAudience._http === 422);

const emptyPatch = await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: {} });
check("an empty visibility change is rejected", emptyPatch._http === 400);

const toFollowers = await privacy("PATCH", `/posts/${POST}/audience`,
  { as: U.layla, body: { audience: "followers" } });
check("a post can be limited to followers", toFollowers.audience === "followers");

const followerSees = await privacy("GET", `/posts/${POST}/visibility`, { as: U.omar });
check("a follower can see a followers-only post", followerSees.allowed === true);

const strangerBlocked = await privacy("GET", `/posts/${POST}/visibility`, { as: U.hassan });
check("a non-follower cannot", strangerBlocked.allowed === false);
check("the refusal says why", strangerBlocked.reason === "followers only", strangerBlocked.reason);

const authorSees = await privacy("GET", `/posts/${POST}/visibility`, { as: U.layla });
check("the author always sees their own post", authorSees.allowed === true);

/* Close friends: Omar is added to the list, Yusuf is not. */
await db.collection("users").updateOne({ _id: OID(U.layla) }, { $addToSet: { closeFriends: OID(U.omar) } });
await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: { audience: "closeFriends" } });

const closeFriendSees = await privacy("GET", `/posts/${POST}/visibility`, { as: U.omar });
check("a close friend can see a close-friends post", closeFriendSees.allowed === true);

const plainFollowerBlocked = await privacy("GET", `/posts/${POST}/visibility`, { as: U.yusuf });
check("an ordinary follower cannot", plainFollowerBlocked.allowed === false,
  plainFollowerBlocked.reason);

const cfFeed = await feed("GET", "/home", { as: U.yusuf, query: { limit: 50 } });
check("the feed honours the close-friends audience",
  !(cfFeed.items || []).some((i) => String(i._id) === POST));

await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: { audience: "onlyMe" } });
const onlyMeOther = await privacy("GET", `/posts/${POST}/visibility`, { as: U.omar });
check("onlyMe hides the post from everyone else", onlyMeOther.allowed === false);
const onlyMeAuthor = await privacy("GET", `/posts/${POST}/visibility`, { as: U.layla });
check("onlyMe still shows it to the author", onlyMeAuthor.allowed === true);

const limited = await privacy("GET", "/posts/limited", { as: U.layla });
check("the author can list their non-public posts", limited.total >= 1 && !!limited.byAudience?.onlyMe);

await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: { audience: "everyone" } });
const backToPublic = await privacy("GET", `/posts/${POST}/visibility`, { as: U.hassan });
check("setting it back to everyone restores access", backToPublic.allowed === true);

/* ================================================================== */
section("4. Age Restrictions");

const unknownAge = await privacy("GET", "/age", { as: U.hassan });
check("an account with no date of birth reports an unknown age", unknownAge.known === false);
check("an unknown age does not clear the gate", unknownAge.canViewRestricted === false);

const badDob = await privacy("POST", "/age", { as: U.hassan, body: { dateofbirth: "not a date" } });
check("an unreadable date of birth is a 422", badDob._http === 422);

const tooYoung = await privacy("POST", "/age", { as: U.hassan, body: { dateofbirth: "2020-01-01" } });
check("an under-age date of birth is refused", tooYoung._http === 403, `got ${tooYoung._http}`);

const adultDob = await privacy("POST", "/age", { as: U.hassan, body: { dateofbirth: "1990-06-15" } });
check("an adult date of birth is accepted", adultDob.success === true && adultDob.isAdult === true);

const minorDob = await privacy("POST", "/age", { as: U.yusuf, body: { dateofbirth: "2012-03-02" } });
check("a minor over the minimum age can hold an account", minorDob.success === true);
check("but is not an adult", minorDob.isAdult === false, `age=${minorDob.age}`);

await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: { ageRestricted: true } });

const minorBlocked = await privacy("GET", `/posts/${POST}/visibility`, { as: U.yusuf });
check("a minor cannot see age-restricted content", minorBlocked.allowed === false);
check("the reason is the age gate", minorBlocked.reason === "age restricted", minorBlocked.reason);

const adultSees = await privacy("GET", `/posts/${POST}/visibility`, { as: U.hassan });
check("an adult can", adultSees.allowed === true);

const minorFeed = await feed("GET", "/home", { as: U.yusuf, query: { limit: 50 } });
check("the feed hides age-restricted posts from a minor",
  !(minorFeed.items || []).some((i) => String(i._id) === POST));

await privacy("PATCH", `/posts/${POST}/audience`, { as: U.layla, body: { ageRestricted: false } });

/* ================================================================== */
section("5. Login Alerts");

const inserted = await db.collection("users").insertOne({
  name: "Safety Suite",
  email: EMAIL,
  password: await bcrypt.hash(PASSWORD, 10),
  // referralCode is uniquely indexed on a nullable field, so only one document
  // in the collection may hold null.
  referralCode: `SAF${Date.now().toString(36).toUpperCase()}`,
  accountStatus: "active",
  followers: [], following: [], coins: 0,
});
const TESTER = String(inserted.insertedId);

const login1 = await auth("POST", "/login", {
  body: { email: EMAIL, password: PASSWORD, deviceId: "device-alpha", platform: "iOS" },
});
check("the test account can sign in", !!login1.token);

const events1 = await db.collection("loginevents").find({ user: OID(TESTER) }).toArray();
check("the sign-in is recorded", events1.length === 1, `${events1.length} events`);
check("the first sign-in counts as a new device", events1[0]?.isNewDevice === true);

const alert1 = await db.collection("notifications").countDocuments({
  recipient: OID(TESTER), type: "login_alert",
});
check("a new device raises an alert", alert1 === 1, `${alert1} alerts`);

const login2 = await auth("POST", "/login", {
  body: { email: EMAIL, password: PASSWORD, deviceId: "device-alpha", platform: "iOS" },
});
check("signing in again from the same device works", !!login2.token);

const events2 = await db.collection("loginevents").find({ user: OID(TESTER) }).toArray();
check("the second sign-in is recorded too", events2.length === 2);
const second = events2.find((e) => !e.isNewDevice);
check("a familiar device is not flagged as new", !!second);

const alert2 = await db.collection("notifications").countDocuments({
  recipient: OID(TESTER), type: "login_alert",
});
check("a familiar device raises no second alert", alert2 === 1, `${alert2} alerts`);

const login3 = await auth("POST", "/login", {
  body: { email: EMAIL, password: PASSWORD, deviceId: "device-beta", platform: "Android" },
});
check("signing in from a second device works", !!login3.token);

const events3 = await db.collection("loginevents").countDocuments({ user: OID(TESTER) });
check("the third sign-in is recorded", events3 === 3);

const history = await safety("GET", "/login-history", { as: TESTER });
check("the history groups sign-ins by device", history.devices?.length === 2,
  `${history.devices?.length} devices`);
check("the history counts repeat sign-ins per device",
  history.devices?.some((d) => d.signIns === 2));
check("the full history is listed", history.total === 3);

const fingerprint = history.devices?.[0]?.fingerprint;
const trustGhost = await safety("POST", "/trust-device", { as: TESTER, body: { fingerprint: "nope" } });
check("trusting an unknown device is a 404", trustGhost._http === 404);

const trusted = await safety("POST", "/trust-device", { as: TESTER, body: { fingerprint } });
check("a device can be trusted", trusted.trusted === true);

const historyAfter = await safety("GET", "/login-history", { as: TESTER });
check("trust is reflected across that device's records",
  historyAfter.devices?.find((d) => d.fingerprint === fingerprint)?.trusted === true);

const untrusted = await safety("POST", "/trust-device", { as: TESTER, body: { fingerprint, trusted: false } });
check("trust can be withdrawn", untrusted.trusted === false);

/* ================================================================== */
section("6. Block & Report (regression on the shipped paths)");

const reasons = await safety("GET", "/report-reasons");
check("the report reasons list", Array.isArray(reasons.reasons) && reasons.reasons.length > 0);

const reported = await safety("POST", "/report", {
  as: U.omar, body: { targetType: "post", targetId: POST, reason: "spam", details: "suite" },
});
check("a post can be reported", reported.success === true, JSON.stringify(reported).slice(0, 120));

const myReports = await safety("GET", "/my-reports", { as: U.omar });
check("the reporter sees their report", myReports.total >= 1);

const blocked = await safety("POST", "/block", { as: U.hassan, body: { targetId: U.ali } });
check("a user can be blocked", blocked.success === true);

const blockedList = await safety("GET", "/blocked", { as: U.hassan });
check("the blocked list reads back", blockedList.total === 1);

const blockedVisibility = await privacy("GET", `/posts/${POST}/visibility`, { as: U.hassan });
check("blocking someone else does not affect unrelated posts", blockedVisibility.allowed === true);

const unblocked = await safety("POST", "/unblock", { as: U.hassan, body: { targetId: U.ali } });
check("a user can be unblocked", unblocked.success === true);

/* ================================================================== */
section("Cleanup");

const reportsRemoved = await db.collection("reports").deleteMany({
  reporter: OID(U.omar), targetId: OID(POST), details: "suite",
});
await restoreAll();
console.log(`  removed ${reportsRemoved.deletedCount} reports, the test account, ` +
            `its login events and alerts; restored restrict lists, close friends, ` +
            `dates of birth and the test post`);

const after = {
  loginEvents: await db.collection("loginevents").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
  users: await db.collection("users").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const stateOk = [];
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { restrictedUsers: 1, hiddenPosts: 1, closeFriends: 1, dateofbirth: 1 } });
  stateOk.push(
    (u.restrictedUsers || []).length === before[id].restrictedUsers.length &&
    (u.hiddenPosts || []).length === before[id].hiddenPosts.length &&
    (u.closeFriends || []).length === before[id].closeFriends.length &&
    (u.dateofbirth ?? null) === before[id].dateofbirth
  );
}
check("every demo account's safety state is back to where it started", stateOk.every(Boolean));

const postAfter = await db.collection("reels").findOne({ _id: OID(POST) },
  { projection: { audience: 1, ageRestricted: 1, comments: 1 } });
check("the test post's visibility is restored",
  (postAfter.audience || "everyone") === (postBefore?.audience || "everyone") &&
  !postAfter.ageRestricted);
check("the suite's comment is gone",
  (postAfter.comments || []).length === (postBefore?.comments || []).length);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
