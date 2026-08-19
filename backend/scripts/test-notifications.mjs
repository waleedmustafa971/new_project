/*
  End-to-end HTTP suite for the Notifications section (/apis/notification).

  Covers all seven sheet rows. Three of them — likes/comments/follows, mention
  & tag, and the group half of group & page notifications — restate work that
  shipped with Engagement and Groups, so they are *verified against the running
  server* rather than rebuilt; the checks below drive those paths from a
  notification's point of view, which the original builds never did. The
  genuinely new work is quiet hours, muting, story views, page subscriptions
  and offline messages.

  Everything the suite touches it makes itself: its own posts, its own story,
  its own group, its own broadcast. The seeded rows are read, never written.

  Run from the backend directory, with the server already up:
    node scripts/test-notifications.mjs
*/

const HOST = process.env.HOST || "http://localhost:5000";
/* Mounted singular — /apis/notification, not /apis/notifications. */
const BASE = `${HOST}/apis/notification`;

/* Demo fixtures. Chosen deliberately:
     LAYLA   creator account, the subject everyone acts on
     OMAR    personal account, the actor
     NADIA   business account — the "page" a subscription can point at
     YUSUF   personal, used wherever a third party is needed
*/
const U = {
  layla: "6a830332316418fdbc512051",
  omar:  "6a830332316418fdbc512052",
  yusuf: "6a830332316418fdbc512054",
  nadia: "6a830332316418fdbc512057",
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

const call    = request(BASE);
const feed    = request(`${HOST}/apis/feed`);
const eng     = request(`${HOST}/apis/engagement`);
const live    = request(`${HOST}/apis/live`);
const groups  = request(`${HOST}/apis/groups`);
const creator = request(`${HOST}/apis/creator`);
const api     = request(`${HOST}/apis`);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

/*
  The quiet-hours window is pure arithmetic on the recipient's own clock, and
  the case that matters — a window running past midnight — cannot be observed
  over HTTP without waiting until 3am. Import the function and check the maths
  directly; the HTTP checks below cover the wiring around it.
*/
const { inQuietHours } = await import("../services/notificationService.js");

const FIXTURES = Object.values(U);

/* ---- snapshot everything this suite could disturb ---- */
const before = {};
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) }, {
    projection: { notificationPrefs: 1, mutedNotificationsFrom: 1, pageNotificationsFor: 1, tagReview: 1 },
  });
  before[id] = {
    notificationPrefs: u?.notificationPrefs ?? null,
    mutedNotificationsFrom: u?.mutedNotificationsFrom || [],
    pageNotificationsFor: u?.pageNotificationsFor || [],
    tagReview: u?.tagReview ?? false,
  };
}

/*
  Notifications, messages and conversations are collections this suite adds rows
  to while real seeded rows already sit in them. Remembering which ids existed
  beforehand is the only way to delete exactly what the run created — deleting
  by type would take the five seeded follow notifications with it.
*/
const idsIn = async (coll) =>
  new Set((await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));

const preexisting = {
  notifications: await idsIn("notifications"),
  messages: await idsIn("messages"),
  conversations: await idsIn("conversations"),
};

const baseline = {
  reels: await db.collection("reels").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
  livestreams: await db.collection("livestreams").countDocuments({}),
  socialgroups: await db.collection("socialgroups").countDocuments({}),
  groupmembers: await db.collection("groupmembers").countDocuments({}),
  messages: await db.collection("messages").countDocuments({}),
  conversations: await db.collection("conversations").countDocuments({}),
};

const created = { posts: [], streams: [], groups: [] };
let restored = false;

/*
  Restore even if this run falls over. A crashed suite that leaves someone muted,
  or a page subscription in place, is worse than a failing check — it is quiet,
  and the next run would snapshot the drift as its own baseline.
*/
const restoreAll = async () => {
  if (restored) return;
  restored = true;

  for (const id of FIXTURES) {
    const b = before[id];
    const $set = {
      mutedNotificationsFrom: b.mutedNotificationsFrom,
      pageNotificationsFor: b.pageNotificationsFor,
      tagReview: b.tagReview,
    };
    const update = { $set };
    // An account that had no prefs subdocument must go back to having none, not
    // to having the defaults written out.
    if (b.notificationPrefs === null) update.$unset = { notificationPrefs: "" };
    else $set.notificationPrefs = b.notificationPrefs;
    await db.collection("users").updateOne({ _id: OID(id) }, update);
  }

  if (created.posts.length) {
    await db.collection("reels").deleteMany({ _id: { $in: created.posts.filter(Boolean).map(OID) } });
  }
  if (created.streams.length) {
    await db.collection("livestreams").deleteMany({ _id: { $in: created.streams.map(OID) } });
  }
  if (created.groups.length) {
    const gids = created.groups.map(OID);
    await db.collection("groupmembers").deleteMany({ group: { $in: gids } });
    await db.collection("socialgroups").deleteMany({ _id: { $in: gids } });
  }

  for (const coll of ["notifications", "messages", "conversations"]) {
    const now = await db.collection(coll).find({}, { projection: { _id: 1 } }).toArray();
    const fresh = now.filter((d) => !preexisting[coll].has(String(d._id))).map((d) => d._id);
    if (fresh.length) await db.collection(coll).deleteMany({ _id: { $in: fresh } });
  }
};

for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring notification state before exiting\n`, err);
    try { await restoreAll(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

/* Sweep leftovers from an interrupted run. */
const SUITE_TAG = "SUITE notif";
const staleReels = await db.collection("reels").find({ videoTitle: new RegExp(`^${SUITE_TAG}`) }).toArray();
if (staleReels.length) {
  await db.collection("reels").deleteMany({ _id: { $in: staleReels.map((r) => r._id) } });
  console.log(`  swept ${staleReels.length} leftover post(s) from an interrupted run`);
}
const staleGroups = await db.collection("socialgroups").find({ name: new RegExp(`^${SUITE_TAG}`) }).toArray();
if (staleGroups.length) {
  const gids = staleGroups.map((g) => g._id);
  await db.collection("groupmembers").deleteMany({ group: { $in: gids } });
  await db.collection("socialgroups").deleteMany({ _id: { $in: gids } });
  console.log(`  swept ${staleGroups.length} leftover group(s) from an interrupted run`);
}
const staleStreams = await db.collection("livestreams").find({ title: new RegExp(`^${SUITE_TAG}`) }).toArray();
if (staleStreams.length) {
  await db.collection("livestreams").deleteMany({ _id: { $in: staleStreams.map((s) => s._id) } });
  console.log(`  swept ${staleStreams.length} leftover stream(s) from an interrupted run`);
}

/* Read a recipient's rows straight from the database — the list endpoint
   collapses and paginates, which is not what most of these checks want. */
const rowsFor = async (recipient, type) =>
  db.collection("notifications")
    .find({ recipient: OID(recipient), ...(type ? { type } : {}) })
    .sort({ createdAt: -1 })
    .toArray();

const countFor = async (recipient, type) => (await rowsFor(recipient, type)).length;
const wipe = async (recipient, type) =>
  db.collection("notifications").deleteMany({ recipient: OID(recipient), ...(type ? { type } : {}) });

/* ================================================================== */
section("1. Custom Notification Settings — the switches exist and are reachable");

const prefs0 = await call("GET", "/preferences", { as: U.layla });
check("preferences read back", prefs0.success === true);
check("the server says whether push is configured at all", typeof prefs0.pushConfigured === "boolean");

/*
  Every key in NotificationPrefsSchema must be settable. A switch present in the
  schema but missing from PREF_KEYS is a switch the settings screen cannot
  reach — which is exactly how storyViews, a preference defaulting to *off*,
  made story-view notifications impossible to turn on.
*/
const ALL_SWITCHES = [
  "push", "inApp", "likes", "comments", "replies", "commentLikes",
  "mentions", "tags", "follows", "shares", "live", "groups",
  "messages", "storyViews", "pages", "subscriptions", "security",
];

const flipped = await call("PUT", "/preferences", {
  as: U.layla,
  body: Object.fromEntries(ALL_SWITCHES.map((k) => [k, false])),
});
check("every switch accepts a write", flipped.success === true);

const offAll = flipped.preferences || {};
const unreachable = ALL_SWITCHES.filter((k) => offAll[k] !== false);
check("and every switch actually took the value", unreachable.length === 0,
  unreachable.length ? `unreachable: ${unreachable.join(", ")}` : "");

const backOn = await call("PUT", "/preferences", {
  as: U.layla,
  body: Object.fromEntries(ALL_SWITCHES.map((k) => [k, true])),
});
check("and flips back on again", ALL_SWITCHES.every((k) => backOn.preferences?.[k] === true));

const junk = await call("PUT", "/preferences", { as: U.layla, body: { nonsense: true } });
check("an unknown preference is refused rather than silently ignored", junk._http === 400);

const tagRev = await call("PUT", "/preferences", { as: U.layla, body: { tagReview: true } });
check("tag review rides along with the preferences", tagRev.tagReview === true);
await call("PUT", "/preferences", { as: U.layla, body: { tagReview: false } });

/* ================================================================== */
section("2. Quiet hours");

const qh = await call("PUT", "/preferences", {
  as: U.layla,
  body: { quietHours: { enabled: true, start: "22:30", end: "07:00", tzOffsetMinutes: 240 } },
});
check("quiet hours accept clock strings", qh.success === true);
check("22:30 is stored as minutes past midnight", qh.preferences?.quietHours?.start === 1350);
check("07:00 likewise", qh.preferences?.quietHours?.end === 420);
check("and the viewer's own offset is kept", qh.preferences?.quietHours?.tzOffsetMinutes === 240);

const qhNum = await call("PUT", "/preferences", { as: U.layla, body: { quietHours: { start: 1380 } } });
check("a raw minute count is accepted too", qhNum.preferences?.quietHours?.start === 1380);
check("and a partial write leaves the rest of the window alone",
  qhNum.preferences?.quietHours?.end === 420 && qhNum.preferences?.quietHours?.enabled === true);

const qhBad = await call("PUT", "/preferences", { as: U.layla, body: { quietHours: { start: "25:00" } } });
check("an impossible clock time is refused", qhBad._http === 400);

const qhBadTz = await call("PUT", "/preferences", {
  as: U.layla, body: { quietHours: { tzOffsetMinutes: 86400 } },
});
check("an offset outside ±14h is refused (seconds sent as minutes)", qhBadTz._http === 400);

/* the arithmetic, including the case that only happens after midnight */
const W = (start, end, tz = 0) => ({ quietHours: { enabled: true, start, end, tzOffsetMinutes: tz } });
const at = (h, m = 0) => new Date(Date.UTC(2026, 7, 19, h, m));

check("disabled quiet hours are never quiet",
  inQuietHours({ quietHours: { enabled: false, start: 0, end: 1439 } }, at(3)) === false);
check("inside a daytime window is quiet", inQuietHours(W(9 * 60, 17 * 60), at(12)) === true);
check("outside a daytime window is not", inQuietHours(W(9 * 60, 17 * 60), at(20)) === false);
check("a window that wraps midnight is quiet before midnight",
  inQuietHours(W(22 * 60, 7 * 60), at(23)) === true);
check("and still quiet after it", inQuietHours(W(22 * 60, 7 * 60), at(3)) === true);
check("and not quiet in the middle of the day", inQuietHours(W(22 * 60, 7 * 60), at(12)) === false);
check("the window is half-open, so it ends exactly on the end minute",
  inQuietHours(W(22 * 60, 7 * 60), at(7)) === false);
check("and starts exactly on the start minute", inQuietHours(W(22 * 60, 7 * 60), at(22)) === true);
check("a zero-width window is never quiet", inQuietHours(W(60, 60), at(1)) === false);
check("the offset is the recipient's, not the server's",
  inQuietHours(W(22 * 60, 7 * 60, 240), at(19)) === true, "19:00 UTC is 23:00 at UTC+4");
check("and the same instant is not quiet for someone on another clock",
  inQuietHours(W(22 * 60, 7 * 60, -300), at(19)) === false, "19:00 UTC is 14:00 at UTC-5");

/*
  Quiet hours silence the push, never the record. Layla sits inside a window
  covering the whole day; Omar's like must still reach her list.
*/
await call("PUT", "/preferences", {
  as: U.layla, body: { quietHours: { enabled: true, start: 0, end: 1439, tzOffsetMinutes: 0 } },
});

const madePost = await feed("POST", "/posts", {
  as: U.layla,
  body: { caption: `${SUITE_TAG} post`, posttype: "Post", media: [{ url: "https://example.com/1.jpg", type: "image" }] },
});
const POST = madePost.item?._id;
check("the suite's own post was created", !!POST, JSON.stringify(madePost).slice(0, 140));
if (POST) created.posts.push(POST);

await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "like" } });
const quietLikes = await rowsFor(U.layla, "like");
check("a like inside quiet hours is still recorded", quietLikes.length === 1);
check("but it was not pushed", quietLikes[0]?.pushed !== true);

await call("PUT", "/preferences", { as: U.layla, body: { quietHours: { enabled: false } } });

/* ================================================================== */
section("3. Muting an account's notifications");

const muted = await call("POST", "/mute", { as: U.layla, body: { targetId: U.omar } });
check("an account can be muted", muted.success === true && muted.muted === true);

const mutedList = await call("GET", "/muted", { as: U.layla });
check("and appears on the caller's own mute list",
  (mutedList.muted || []).some((m) => String(m._id) === U.omar));
check("with enough detail to render a row", !!(mutedList.muted || [])[0]?.name);

await wipe(U.layla, "like");
await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "love" } });
check("a muted account's reaction writes nothing at all", await countFor(U.layla, "like") === 0);

await eng("POST", `/posts/${POST}/comments`, { as: U.omar, body: { message: "muted comment" } });
check("not a comment either", await countFor(U.layla, "comment") === 0);

const selfMute = await call("POST", "/mute", { as: U.layla, body: { targetId: U.layla } });
check("you cannot mute yourself", selfMute._http === 400);

const ghostMute = await call("POST", "/mute", { as: U.layla, body: { targetId: "6a830332316418fdbc5120ff" } });
check("muting an account that does not exist is refused", ghostMute._http === 404);

const unmuted = await call("POST", "/unmute", { as: U.layla, body: { targetId: U.omar } });
check("and the mute can be lifted", unmuted.muted === false);

await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "like" } });
check("after unmuting, notifications arrive again", await countFor(U.layla, "like") === 1);

/* ================================================================== */
section("4. Story View Notifications");

const madeStory = await feed("POST", "/posts", {
  as: U.layla,
  body: { caption: `${SUITE_TAG} story`, posttype: "Story", media: [{ url: "https://example.com/s.jpg", type: "image" }] },
});
const STORY = madeStory.item?._id;
check("the suite's own story was created", !!STORY, JSON.stringify(madeStory).slice(0, 140));
if (STORY) created.posts.push(STORY);

/* storyViews defaults to off — being told about every viewer is the noisiest
   thing a social app can do, so it is opt-in rather than opt-out. */
await call("PUT", "/preferences", { as: U.layla, body: { storyViews: false } });
const viewOff = await feed("POST", `/content/${STORY}/view`, { as: U.omar });
check("a story view is counted", viewOff.viewed === true);
check("but with the preference off it notifies nobody", await countFor(U.layla, "story_view") === 0);

await call("PUT", "/preferences", { as: U.layla, body: { storyViews: true } });
const viewOn = await feed("POST", `/content/${STORY}/view`, { as: U.yusuf });
check("a second viewer is counted", viewOn.counted === true);
const svRows = await rowsFor(U.layla, "story_view");
check("and with the preference on, the owner is told", svRows.length === 1);
check("by the person who actually watched", String(svRows[0]?.actor) === U.yusuf);
check("and it points at the story", String(svRows[0]?.post) === String(STORY));

const viewAgain = await feed("POST", `/content/${STORY}/view`, { as: U.yusuf });
check("watching twice does not count twice", viewAgain.counted === false);
check("and does not notify twice", await countFor(U.layla, "story_view") === 1);

const selfView = await feed("POST", `/content/${STORY}/view`, { as: U.layla });
check("the owner watching their own story notifies nobody",
  selfView.viewed === true && await countFor(U.layla, "story_view") === 1);

await feed("POST", `/content/${POST}/view`, { as: U.nadia });
check("viewing an ordinary post is not a story view", await countFor(U.layla, "story_view") === 1);

/* ================================================================== */
section("5. Page Notifications");

const notAPage = await call("POST", "/pages/subscribe", { as: U.omar, body: { pageId: U.yusuf } });
check("a personal account is not a page", notAPage._http === 400);

const subbed = await call("POST", "/pages/subscribe", { as: U.omar, body: { pageId: U.nadia } });
check("a business account can be subscribed to", subbed.subscribed === true);

const subbedCreator = await call("POST", "/pages/subscribe", { as: U.omar, body: { pageId: U.layla } });
check("so can a creator account", subbedCreator.subscribed === true);

const pageList = await call("GET", "/pages", { as: U.omar });
check("both appear on the subscription list", (pageList.pages || []).length === 2);
check("with the account type that made them eligible",
  (pageList.pages || []).every((p) => ["creator", "business"].includes(p.accountType)));

const selfSub = await call("POST", "/pages/subscribe", { as: U.nadia, body: { pageId: U.nadia } });
check("a page cannot subscribe to itself", selfSub._http === 400);

const pagePost = await feed("POST", "/posts", {
  as: U.nadia, body: { caption: `${SUITE_TAG} page post`, posttype: "Post" },
});
if (pagePost.item?._id) created.posts.push(pagePost.item._id);
const ppRows = await rowsFor(U.omar, "page_post");
check("a page's post reaches its subscribers", ppRows.length === 1);
check("from the page", String(ppRows[0]?.actor) === U.nadia);
check("and points at the post", String(ppRows[0]?.post) === String(pagePost.item?._id));

const laylaStory2 = await feed("POST", "/posts", {
  as: U.layla, body: { caption: `${SUITE_TAG} page story`, posttype: "Story" },
});
if (laylaStory2.item?._id) created.posts.push(laylaStory2.item._id);
check("a page's story does not notify subscribers — it has its own ring",
  await countFor(U.omar, "page_post") === 1);

const draft = await feed("POST", "/posts", {
  as: U.nadia, body: { caption: `${SUITE_TAG} draft`, posttype: "Post", status_draft_publish: "Draft" },
});
const DRAFT = draft.item?._id;
if (DRAFT) created.posts.push(DRAFT);
check("a draft notifies nobody", await countFor(U.omar, "page_post") === 1);

/* a scheduled post notifies when it publishes, not when it was written */
const sched = await creator("POST", "/schedule", {
  as: U.nadia,
  body: { postId: DRAFT, scheduledFor: new Date(Date.now() + 3600000).toISOString() },
});
check("the draft can be scheduled", sched.success === true, JSON.stringify(sched).slice(0, 140));
check("scheduling it notifies nobody yet", await countFor(U.omar, "page_post") === 1);

await db.collection("reels").updateOne({ _id: OID(DRAFT) }, { $set: { scheduledFor: new Date(Date.now() - 1000) } });
const published = await creator("POST", "/scheduled/publish-due", { as: U.nadia });
check("its due date arriving publishes it", (published.published || 0) >= 1);
check("and that is when subscribers hear about it", await countFor(U.omar, "page_post") === 2);

const unsub = await call("POST", "/pages/unsubscribe", { as: U.omar, body: { pageId: U.nadia } });
check("a subscription can be dropped", unsub.subscribed === false);

await wipe(U.omar, "page_post");
const afterUnsub = await feed("POST", "/posts", {
  as: U.nadia, body: { caption: `${SUITE_TAG} after unsub`, posttype: "Post" },
});
if (afterUnsub.item?._id) created.posts.push(afterUnsub.item._id);
check("and then the page goes quiet", await countFor(U.omar, "page_post") === 0);

const pagesOff = await call("PUT", "/preferences", { as: U.omar, body: { pages: false } });
check("the pages switch is settable", pagesOff.preferences?.pages === false);
await call("POST", "/pages/subscribe", { as: U.omar, body: { pageId: U.nadia } });
const quietPage = await feed("POST", "/posts", {
  as: U.nadia, body: { caption: `${SUITE_TAG} pref off`, posttype: "Post" },
});
if (quietPage.item?._id) created.posts.push(quietPage.item._id);
check("and it overrides the subscription", await countFor(U.omar, "page_post") === 0);
await call("PUT", "/preferences", { as: U.omar, body: { pages: true } });

/* ================================================================== */
section("6. Offline Message Notifications");

/*
  Every demo account is offline — nothing holds a socket — which is the state
  this feature exists for. A connected recipient is already being shown the
  message by the socket that delivered it, so presence is checked first.
*/
const sent = await api("POST", "/send-message", {
  body: { sender: U.omar, receiver: U.layla, text: "Are you coming tonight?" },
});
check("a message is delivered", sent.success === true);

const msgRows = await rowsFor(U.layla, "message");
check("and an offline recipient is notified", msgRows.length === 1);
check("by the sender", String(msgRows[0]?.actor) === U.omar);
check("with enough of the message to recognise it", msgRows[0]?.preview === "Are you coming tonight?");

await api("POST", "/send-message", { body: { sender: U.omar, receiver: U.layla, text: "Second message" } });
check("a second message from the same person is one row, not two",
  await countFor(U.layla, "message") === 1);
check("and the row shows the newer message",
  (await rowsFor(U.layla, "message"))[0]?.preview === "Second message");

await api("POST", "/send-message", {
  body: { sender: U.omar, receiver: U.layla, imageUrl: "https://example.com/photo.jpg" },
});
check("an attachment is described rather than left blank",
  (await rowsFor(U.layla, "message"))[0]?.preview === "📷 Photo");

await api("POST", "/send-message", { body: { sender: U.omar, receiver: U.layla, text: "x".repeat(200) } });
check("a long message is truncated",
  ((await rowsFor(U.layla, "message"))[0]?.preview || "").length < 100);

await api("POST", "/send-message", { body: { sender: U.layla, receiver: U.layla, text: "note to self" } });
check("a note to yourself notifies nobody", await countFor(U.layla, "message") === 1);

const msgOff = await call("PUT", "/preferences", { as: U.yusuf, body: { messages: false } });
check("the messages switch is settable", msgOff.preferences?.messages === false);
await api("POST", "/send-message", { body: { sender: U.omar, receiver: U.yusuf, text: "hello" } });
check("and it silences message notifications", await countFor(U.yusuf, "message") === 0);

/* a muted thread stays muted on the lock screen too */
await api("POST", "/send-message", { body: { sender: U.omar, receiver: U.nadia, text: "first" } });
await db.collection("conversations").updateMany(
  { $or: [{ sender: OID(U.omar), receiver: OID(U.nadia) }, { sender: OID(U.nadia), receiver: OID(U.omar) }] },
  { $addToSet: { mutedBy: OID(U.nadia) } }
);
await wipe(U.nadia, "message");
await api("POST", "/send-message", { body: { sender: U.omar, receiver: U.nadia, text: "second" } });
check("a muted conversation does not reach the lock screen", await countFor(U.nadia, "message") === 0);

/* ================================================================== */
section("7. Likes, Comments & Follows (verification of the Engagement build)");

await wipe(U.layla, "like");
await wipe(U.layla, "comment");

await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "like" } });
const likeRows = await rowsFor(U.layla, "like");
check("a reaction notifies the author", likeRows.length === 1);
check("and records which reaction it was", likeRows[0]?.reactionType === "like");

await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "love" } });
check("changing the reaction updates the row instead of adding one",
  await countFor(U.layla, "like") === 1);

const commented = await eng("POST", `/posts/${POST}/comments`, { as: U.omar, body: { message: "lovely shot" } });
const COMMENT = commented.comment?._id;
check("a comment notifies the author", await countFor(U.layla, "comment") === 1);

if (COMMENT) {
  await eng("POST", `/posts/${POST}/comments`, { as: U.yusuf, body: { message: "agreed", parentId: COMMENT } });
  check("a reply notifies the commenter, not the author", await countFor(U.omar, "reply") === 1);

  await eng("POST", `/posts/${POST}/comments/${COMMENT}/like`, { as: U.layla });
  check("hearting a comment notifies its author", await countFor(U.omar, "comment_like") === 1);
}

const likesOff = await call("PUT", "/preferences", { as: U.layla, body: { likes: false } });
check("the likes switch is settable", likesOff.preferences?.likes === false);
await wipe(U.layla, "like");
await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "like" } });
check("and it silences reaction notifications", await countFor(U.layla, "like") === 0);
await call("PUT", "/preferences", { as: U.layla, body: { likes: true } });

const inAppOff = await call("PUT", "/preferences", { as: U.layla, body: { inApp: false } });
check("the master in-app switch is settable", inAppOff.preferences?.inApp === false);
await eng("DELETE", `/posts/${POST}/react`, { as: U.omar });
await eng("POST", `/posts/${POST}/react`, { as: U.omar, body: { type: "wow" } });
check("and with it off nothing is recorded at all", await countFor(U.layla, "like") === 0);
await call("PUT", "/preferences", { as: U.layla, body: { inApp: true } });

/* ================================================================== */
section("8. Mention & Tag Notifications (verification of the Engagement build)");

const mentionPost = await feed("POST", "/posts", {
  as: U.layla,
  body: {
    caption: `${SUITE_TAG} hey @OmarKhalid look at this`,
    posttype: "Post",
    taggedUsers: [{ user: U.yusuf }],
  },
});
if (mentionPost.item?._id) created.posts.push(mentionPost.item._id);

check("an @mention in a post notifies the person named", await countFor(U.omar, "mention_post") === 1);
check("a photo tag notifies the person tagged", await countFor(U.yusuf, "tag") === 1);

await eng("POST", `/posts/${POST}/comments`, { as: U.yusuf, body: { message: "look @OmarKhalid" } });
check("an @mention in a comment notifies too", await countFor(U.omar, "mention_comment") === 1);

const mentionsOff = await call("PUT", "/preferences", { as: U.omar, body: { mentions: false } });
check("the mentions switch is settable", mentionsOff.preferences?.mentions === false);
await wipe(U.omar, "mention_post");
const mention2 = await feed("POST", "/posts", {
  as: U.layla, body: { caption: `${SUITE_TAG} again @OmarKhalid`, posttype: "Post" },
});
if (mention2.item?._id) created.posts.push(mention2.item._id);
check("and it silences mentions", await countFor(U.omar, "mention_post") === 0);
await call("PUT", "/preferences", { as: U.omar, body: { mentions: true } });

/* ================================================================== */
section("9. Live Stream Invite Notification (verification of the Live build)");

const bcast = await live("POST", "/streams", { as: U.layla, body: { title: `${SUITE_TAG} live`, force: true } });
const STREAM = bcast.stream?._id;
check("a broadcast starts", !!STREAM, JSON.stringify(bcast).slice(0, 140));
if (STREAM) {
  created.streams.push(STREAM);

  const invited = await live("POST", `/streams/${STREAM}/seats/invite`, {
    as: U.layla, body: { targetId: U.omar, role: "guest" },
  });
  check("the host can invite a viewer onto the live", invited.success === true,
    JSON.stringify(invited).slice(0, 140));

  const liRows = await rowsFor(U.omar, "live_invite");
  check("and the invitee is notified", liRows.length === 1);
  check("by the host", String(liRows[0]?.actor) === U.layla);
  check("with copy that says what it is", /invit/i.test(liRows[0]?.preview || ""));

  const liveOff = await call("PUT", "/preferences", { as: U.yusuf, body: { live: false } });
  check("the live switch is settable", liveOff.preferences?.live === false);
  await live("POST", `/streams/${STREAM}/seats/invite`, { as: U.layla, body: { targetId: U.yusuf, role: "guest" } });
  check("and it silences live invites", await countFor(U.yusuf, "live_invite") === 0);

  await live("POST", `/streams/${STREAM}/end`, { as: U.layla });
}

/* ================================================================== */
section("10. Group Notifications (verification of the Groups build)");

const madeGroup = await groups("POST", "/create", {
  as: U.layla, body: { name: `${SUITE_TAG} group`, visibility: "private" },
});
const GROUP = madeGroup.group?._id;
check("a private group is created", !!GROUP, JSON.stringify(madeGroup).slice(0, 140));
if (GROUP) {
  created.groups.push(GROUP);

  const joined = await groups("POST", `/${GROUP}/join`, { as: U.omar, body: { note: "please" } });
  check("joining a private group asks rather than joins", joined.status === "pending",
    JSON.stringify(joined).slice(0, 140));

  const grRows = await rowsFor(U.layla, "group_request");
  check("and the moderator is notified", grRows.length === 1);
  check("with the group as context", String(grRows[0]?.group) === String(GROUP));

  await groups("POST", `/${GROUP}/requests/${U.omar}/approve`, { as: U.layla });
  check("approval notifies the person who asked", await countFor(U.omar, "group_approved") === 1);

  const groupsOff = await call("PUT", "/preferences", { as: U.yusuf, body: { groups: false } });
  check("the groups switch is settable", groupsOff.preferences?.groups === false);
  await groups("POST", `/${GROUP}/invite`, { as: U.layla, body: { userIds: [U.yusuf] } });
  check("and it silences group invites", await countFor(U.yusuf, "group_invite") === 0);
}

/* ================================================================== */
section("11. The notification list itself");

const list = await call("GET", "/", { as: U.layla });
check("the list reads back", list.success === true && Array.isArray(list.notifications));
check("and reports an unread count", typeof list.unread === "number");

const byType = await call("GET", "/", { as: U.layla, query: { type: "message" } });
check("the list can be filtered to one type",
  (byType.notifications || []).every((n) => n.type === "message"));

const badge = await call("GET", "/unread-count", { as: U.layla });
check("the badge count agrees with the list", badge.unread === list.unread);

const read = await call("POST", "/read", { as: U.layla });
check("everything can be marked read", read.unread === 0);

const nobody = await call("GET", "/", { as: "not-an-id" });
check("a bad userId is refused", nobody._http === 400);

/* ================================================================== */
section("Cleanup");

await restoreAll();

const after = {
  reels: await db.collection("reels").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
  livestreams: await db.collection("livestreams").countDocuments({}),
  socialgroups: await db.collection("socialgroups").countDocuments({}),
  groupmembers: await db.collection("groupmembers").countDocuments({}),
  messages: await db.collection("messages").countDocuments({}),
  conversations: await db.collection("conversations").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const drift = [];
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) }, {
    projection: { name: 1, notificationPrefs: 1, mutedNotificationsFrom: 1, pageNotificationsFor: 1 },
  });
  if ((u.mutedNotificationsFrom || []).length !== before[id].mutedNotificationsFrom.length) drift.push(`${u.name} muted`);
  if ((u.pageNotificationsFor || []).length !== before[id].pageNotificationsFor.length) drift.push(`${u.name} pages`);
  if (!!u.notificationPrefs !== (before[id].notificationPrefs !== null)) drift.push(`${u.name} prefs`);
}
check("every demo account is back to where it started", drift.length === 0, drift.join(", "));

const survivors = await db.collection("notifications").countDocuments({ type: { $ne: "follow" } });
check("only the seeded follow notifications remain", survivors === 0, `${survivors} others left`);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
