/*
  End-to-end HTTP suite for the Live Streaming section (/apis/live).

  Covers the seven rows the module sheet still had open: starting a broadcast,
  live chat, floating reactions, moderation tools, inviting a co-host, guests
  joining a seat, and gift coins.

  Drives every endpoint against the running server, asserts the failure paths as
  well as the happy ones, and restores the database — including coin balances,
  which gifting moves for real — before it exits.

  Run from the backend directory, with the server already up:
    node scripts/test-live.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/live";

/* Demo fixtures. Chosen deliberately:
     HOST      Layla  — hosts every stream here
     MOD       Omar   — appointed moderator, does the moderating
     VIEWER    Ali    — ordinary viewer; gets muted, kicked and banned
     VIEWER2   Yusuf  — second viewer, tests slow mode and the mod-vs-mod rule
     GUEST     Mariam — takes a seat, then gets kicked off it
     RICH      Nadia  — 2100 coins, sends the gifts
     OUTSIDER  Hassan — does NOT follow Layla and holds 0 coins, so he is the
                        fixture for both followers-only chat and a failed gift
     STRANGER  Sara   — never joins any room; tests the "not in the room" path
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
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const call = async (method, path, { as, body, query } = {}) => {
  const url = new URL(BASE + path);
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
  // `_http` and not `status`: several responses carry their own `status` field
  // (a seat state), and spreading would shadow the code.
  return { ...json, _http: res.status };
};

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* This file is run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

/*
  Every stream this suite creates is named by startBroadcast as `live_<id>_<ts>`.
  The two demo streams are named `layla-live-demo` and `sara-live-demo`, so the
  prefix sweeps this suite's rows without ever touching the seeded data.
*/
const TEST_CHANNEL = /^live_/;
const TEST_GIFT_PREFIX = "TESTGIFT ";

const sweep = async () => {
  const stale = await db.collection("livestreamtbls").find({ channelName: { $regex: TEST_CHANNEL } }).toArray();
  const ids = stale.map((s) => s._id);
  if (ids.length) {
    await db.collection("livechatmessages").deleteMany({ stream: { $in: ids } });
    await db.collection("livereactions").deleteMany({ stream: { $in: ids } });
    await db.collection("giftstransactions").deleteMany({ channelName: { $regex: TEST_CHANNEL } });
    await db.collection("livestreamtbls").deleteMany({ _id: { $in: ids } });
  }
  await db.collection("gifts").deleteMany({ name: { $regex: `^${TEST_GIFT_PREFIX}` } });
  return ids.length;
};

const swept = await sweep();
if (swept) console.log(`  (swept ${swept} leftover streams from a previous run)`);

/* Baseline snapshot. Coins are restored explicitly at the end because gifting
   genuinely moves them between the demo accounts. */
const FIXTURES = Object.values(U);
const coinsBefore = Object.fromEntries(
  (await db.collection("users").find({ _id: { $in: FIXTURES.map(OID) } }, { projection: { coins: 1 } }).toArray())
    .map((u) => [String(u._id), u.coins || 0])
);

/*
  Put the coin balances back even if this run falls over.

  Two crashed runs in development drifted the demo data exactly this way: the
  suite died part-way, the cleanup at the bottom never ran, and the *next* run
  then snapshotted the already-wrong balances and faithfully restored those —
  so the drift looked like the baseline and survived. A crash must not be able
  to leave the owner's demo accounts holding coins they never had.
*/
let coinsRestored = false;
const restoreCoins = async () => {
  if (coinsRestored) return;
  coinsRestored = true;
  for (const [id, coins] of Object.entries(coinsBefore)) {
    await db.collection("users").updateOne({ _id: OID(id) }, { $set: { coins } });
  }
};
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring coin balances before exiting\n`, err);
    try { await restoreCoins(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

const baseline = {
  earnings: await db.collection("earningsentries").countDocuments({}),
  streams: await db.collection("livestreamtbls").countDocuments({}),
  chat: await db.collection("livechatmessages").countDocuments({}),
  reactions: await db.collection("livereactions").countDocuments({}),
  gifts: await db.collection("gifts").countDocuments({}),
  giftTx: await db.collection("giftstransactions").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
console.log(`  baseline: ${baseline.streams} streams, ${baseline.chat} chat rows, ` +
            `${baseline.reactions} reactions, ${baseline.notifications} notifications`);

const created = { streams: [], gifts: [] };

/* ================================================================== */
section("1. Start a Live Broadcast");

const live1 = await call("POST", "/streams", { as: U.layla, body: { title: "Friday brunch test" } });
check("the host can go live", live1.success === true && !!live1.stream?._id, JSON.stringify(live1).slice(0, 160));
const S = live1.stream?._id;
if (S) created.streams.push(S);
check("going live returns an Agora token", !!live1.token?.token && !!live1.token?.appId);
check("a new room starts with every seat free", live1.stream?.seatsFree === 4);

const live2 = await call("POST", "/streams", { as: U.layla, body: { title: "second attempt" } });
check("a second concurrent broadcast is refused", live2._http === 409);
check("the refusal hands back the stream already live", live2.stream?._id === S,
  `got ${live2.stream?._id}`);

const browse = await call("GET", "/streams", { as: U.ali });
check("the browse rail lists the live stream", (browse.streams || []).some((s) => s._id === S));
check("the rail reports the host", (browse.streams || []).find((s) => s._id === S)?.host?.name === "Layla Hassan");

const retitle = await call("PATCH", `/streams/${S}`, { as: U.layla, body: { title: "Renamed brunch" } });
check("the host can retitle a live room", retitle.stream?.title === "Renamed brunch");

const retitleByOther = await call("PATCH", `/streams/${S}`, { as: U.omar, body: { title: "hijack" } });
check("a non-host cannot retitle the room", retitleByOther._http === 403);

const emptyPatch = await call("PATCH", `/streams/${S}`, { as: U.layla, body: {} });
check("an empty edit is rejected", emptyPatch._http === 400);

const hostToken = await call("GET", `/streams/${S}/token`, { as: U.layla });
check("the host gets a publishing token", hostToken.role === "host" && hostToken.canPublish === true);

const audienceToken = await call("GET", `/streams/${S}/token`, { as: U.ali });
check("a viewer gets a subscriber token, not a publisher one",
  audienceToken.role === "audience" && audienceToken.canPublish === false);

const missingStream = await call("GET", "/streams/6a830332316418fdbc5120ff", { as: U.ali });
check("an unknown stream id reads as 404", missingStream._http === 404);

/* ================================================================== */
section("2. Viewers joining and leaving");

const joinAli = await call("POST", `/streams/${S}/join`, { as: U.ali });
check("a viewer can join", joinAli.viewers === 1, `viewers=${joinAli.viewers}`);

const joinYusuf = await call("POST", `/streams/${S}/join`, { as: U.yusuf });
check("a second viewer is counted", joinYusuf.viewers === 2);

const rejoinAli = await call("POST", `/streams/${S}/join`, { as: U.ali });
check("a reconnect does not double-count the same viewer", rejoinAli.viewers === 2);

const viewerList = await call("GET", `/streams/${S}/viewers`, { as: U.layla });
check("the viewer list matches the count", viewerList.total === 2);

const leaveAli = await call("POST", `/streams/${S}/leave`, { as: U.ali });
check("a viewer can leave", leaveAli.viewers === 1);

const leaveTwice = await call("POST", `/streams/${S}/leave`, { as: U.ali });
check("leaving twice is a 404, not a negative count", leaveTwice._http === 404);

await call("POST", `/streams/${S}/join`, { as: U.ali });
await call("POST", `/streams/${S}/join`, { as: U.mariam });

/* ================================================================== */
section("3. Invite a Co-Host (host-initiated)");

const invite1 = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.mariam } });
check("the host can invite a co-host", invite1.success === true && invite1.status === "invited");

const inviteAgain = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.mariam } });
check("a duplicate invitation is refused", inviteAgain._http === 409);

const inviteByViewer = await call("POST", `/streams/${S}/seats/invite`, { as: U.omar, body: { targetId: U.yusuf } });
check("only the host can invite", inviteByViewer._http === 403);

const inviteSelf = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.layla } });
check("the host cannot invite themselves", inviteSelf._http === 400);

const mariamInvites = await call("GET", "/streams/invites", { as: U.mariam });
check("the invitee sees the pending invitation", mariamInvites.total === 1
  && mariamInvites.invites?.[0]?.streamId === S);

const hostCannotApproveInvite = await call("POST", `/streams/${S}/seats/respond`,
  { as: U.layla, body: { targetId: U.mariam, action: "approve" } });
check("the host cannot approve their own invitation into a seat", hostCannotApproveInvite._http === 404);

const decline = await call("POST", `/streams/${S}/seats/invite/respond`, { as: U.mariam, body: { action: "decline" } });
check("the invitee can decline", decline.status === "declined");

const invitesAfterDecline = await call("GET", "/streams/invites", { as: U.mariam });
check("a declined invitation leaves the pending list", invitesAfterDecline.total === 0);

await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.mariam } });
const accept = await call("POST", `/streams/${S}/seats/invite/respond`, { as: U.mariam, body: { action: "accept" } });
check("the invitee can accept and take the seat", accept.status === "approved" && accept.seatsUsed === 1);

const acceptTwice = await call("POST", `/streams/${S}/seats/invite/respond`, { as: U.mariam, body: { action: "accept" } });
check("accepting twice is a 404", acceptTwice._http === 404);

const inviteSeated = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.mariam } });
check("someone already on the broadcast cannot be re-invited", inviteSeated._http === 409);

const seatedToken = await call("GET", `/streams/${S}/token`, { as: U.mariam });
check("a seat holder gets a publishing token", seatedToken.role === "publisher" && seatedToken.canPublish === true);

const badAction = await call("POST", `/streams/${S}/seats/invite/respond`, { as: U.yusuf, body: { action: "maybe" } });
check("an unknown invite action is rejected", badAction._http === 400);

const noInvite = await call("POST", `/streams/${S}/seats/invite/respond`, { as: U.sara, body: { action: "accept" } });
check("answering an invitation you never had is a 404", noInvite._http === 404);

/* Seats are finite, and pending invitations reserve one. Mariam already holds
   seat 1, so three more invitations fill the room and a fourth is refused. */
await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.ali } });
await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.yusuf } });
await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.nadia } });
const overSubscribed = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.hassan } });
check("pending invitations count against the seat limit", overSubscribed._http === 409,
  `got ${overSubscribed._http}`);

for (const who of [U.ali, U.yusuf, U.nadia]) {
  await call("POST", `/streams/${S}/seats/invite/respond`, { as: who, body: { action: "decline" } });
}

/* ================================================================== */
section("4. Viewers join as a guest (regression on the shipped path)");

const guestReq = await call("POST", `/streams/${S}/seats/request`, { as: U.ali, body: { role: "guest" } });
check("a viewer can ask to come up as a guest", guestReq.status === "requested" && guestReq.role === "guest");

const queue = await call("GET", `/streams/${S}/seats/requests`, { as: U.layla });
check("the host sees the request queue", queue.total === 1);

const queueByViewer = await call("GET", `/streams/${S}/seats/requests`, { as: U.ali });
check("a viewer cannot read the host's queue", queueByViewer._http === 403);

const approve = await call("POST", `/streams/${S}/seats/respond`,
  { as: U.layla, body: { targetId: U.ali, action: "approve" } });
check("the host can approve a guest", approve.seatsUsed === 2);

const aliLeavesSeat = await call("POST", `/streams/${S}/seats/leave`, { as: U.ali });
check("a guest can step down from the seat", aliLeavesSeat.success === true);

/* ================================================================== */
section("5. Live Chat During Stream");

const chat1 = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "great stream" } });
check("a viewer in the room can chat", chat1.success === true && !!chat1.chatMessage?._id);
const MSG = chat1.chatMessage?._id;

const chatByStranger = await call("POST", `/streams/${S}/chat`, { as: U.sara, body: { text: "hello" } });
check("someone who never joined cannot chat", chatByStranger._http === 403);

const emptyChat = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "   " } });
check("an empty message is rejected", emptyChat._http === 400);

const longChat = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "x".repeat(501) } });
check("an over-long message is a 422", longChat._http === 422);

const hostChat = await call("POST", `/streams/${S}/chat`, { as: U.layla, body: { text: "welcome everyone" } });
check("the host can chat without being a viewer", hostChat.success === true);

const chatList = await call("GET", `/streams/${S}/chat`, { as: U.ali });
check("the backlog is persisted and readable", chatList.total === 2, `total=${chatList.total}`);
check("messages come back newest first", chatList.messages?.[0]?.text === "welcome everyone");
check("the backlog carries the author", chatList.messages?.[0]?.user?.name === "Layla Hassan");

const pin = await call("POST", `/streams/${S}/chat/${MSG}/pin`, { as: U.layla, body: { action: "pin" } });
check("the host can pin a message", pin.pinnedMessage === MSG);

const listPinned = await call("GET", `/streams/${S}/chat`, { as: U.ali });
check("the pinned message is surfaced separately", listPinned.pinned?._id === MSG);

const pinByViewer = await call("POST", `/streams/${S}/chat/${MSG}/pin`, { as: U.ali, body: { action: "pin" } });
check("a viewer cannot pin", pinByViewer._http === 403);

const unpin = await call("POST", `/streams/${S}/chat/${MSG}/pin`, { as: U.layla, body: { action: "unpin" } });
check("the host can unpin", unpin.pinnedMessage === null);

const yusufMsg = await call("POST", `/streams/${S}/chat`, { as: U.yusuf, body: { text: "hi from yusuf" } });
const YMSG = yusufMsg.chatMessage?._id;

const deleteOthers = await call("DELETE", `/streams/${S}/chat/${YMSG}`, { as: U.ali });
check("a viewer cannot delete someone else's message", deleteOthers._http === 403);

const deleteOwn = await call("DELETE", `/streams/${S}/chat/${MSG}`, { as: U.ali });
check("the author can delete their own message", deleteOwn.success === true);

const deleteTwice = await call("DELETE", `/streams/${S}/chat/${MSG}`, { as: U.ali });
check("deleting twice is a 409", deleteTwice._http === 409);

const audienceView = await call("GET", `/streams/${S}/chat`, { as: U.ali });
check("a deleted message is gone for the audience", !(audienceView.messages || []).some((m) => m._id === MSG));

const staffView = await call("GET", `/streams/${S}/chat`, { as: U.layla });
const tomb = (staffView.messages || []).find((m) => m._id === MSG);
check("the host still sees the tombstone", !!tomb && tomb.deleted === true);
check("the tombstone records who deleted it", tomb?.deletedBy?.name === "Ali Mansour");

const badSlow = await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { slowModeSeconds: 9999 } });
check("an out-of-range slow mode is a 422", badSlow._http === 422);

const settingsByViewer = await call("PATCH", `/streams/${S}/chat/settings`, { as: U.ali, body: { enabled: false } });
check("only the host can change chat settings", settingsByViewer._http === 403);

const slowOn = await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { slowModeSeconds: 30 } });
check("slow mode can be turned on", slowOn.chat?.slowModeSeconds === 30);

await call("POST", `/streams/${S}/chat`, { as: U.yusuf, body: { text: "first under slow mode" } });
const slowed = await call("POST", `/streams/${S}/chat`, { as: U.yusuf, body: { text: "second too fast" } });
check("slow mode rate-limits a viewer", slowed._http === 429, `got ${slowed._http}`);
check("the rate limit says how long to wait", Number(slowed.retryAfterSeconds) > 0);

const hostIgnoresSlow = await call("POST", `/streams/${S}/chat`, { as: U.layla, body: { text: "host is exempt" } });
check("slow mode does not apply to the host", hostIgnoresSlow.success === true);

await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { slowModeSeconds: 0 } });

await call("POST", `/streams/${S}/join`, { as: U.hassan });
await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { followersOnly: true } });
const nonFollower = await call("POST", `/streams/${S}/chat`, { as: U.hassan, body: { text: "let me in" } });
check("followers-only chat blocks a non-follower", nonFollower._http === 403, `got ${nonFollower._http}`);
const follower = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "I follow Layla" } });
check("followers-only chat still admits a follower", follower.success === true);
await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { followersOnly: false } });

await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { enabled: false } });
const chatOff = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "anyone there" } });
check("closing chat stops the audience", chatOff._http === 403);
const hostWhenOff = await call("POST", `/streams/${S}/chat`, { as: U.layla, body: { text: "chat is closed" } });
check("the host can still talk with chat closed", hostWhenOff.success === true);
await call("PATCH", `/streams/${S}/chat/settings`, { as: U.layla, body: { enabled: true } });

/* ================================================================== */
section("6. Live Reactions");

const react1 = await call("POST", `/streams/${S}/reactions`, { as: U.ali, body: { type: "heart", count: 5 } });
check("a viewer can send a burst of reactions", react1.total === 5, `total=${react1.total}`);

const badType = await call("POST", `/streams/${S}/reactions`, { as: U.ali, body: { type: "banana" } });
check("an unknown reaction type is a 422", badType._http === 422);

const react2 = await call("POST", `/streams/${S}/reactions`, { as: U.yusuf, body: { type: "fire", count: 3 } });
check("a second type is tallied separately", react2.byType?.heart === 5 && react2.byType?.fire === 3);

const react3 = await call("POST", `/streams/${S}/reactions`, { as: U.ali, body: { type: "heart", count: 2 } });
check("a repeat burst increments the same row", react3.byType?.heart === 7);

const oversized = await call("POST", `/streams/${S}/reactions`, { as: U.mariam, body: { type: "clap", count: 9999 } });
check("a burst is capped rather than rejected", oversized.byType?.clap === 50, `clap=${oversized.byType?.clap}`);

const totals = await call("GET", `/streams/${S}/reactions`);
check("totals add up across everyone", totals.total === 60, `total=${totals.total}`);
check("the top reactor is the biggest sender", totals.topReactors?.[0]?.count === 50);
check("the breakdown reports how many people sent each type",
  totals.breakdown?.find((b) => b.type === "heart")?.people === 1);

const before = new Date(Date.now() - 60_000).toISOString();
const recent = await call("GET", `/streams/${S}/reactions`, { query: { since: before } });
check("`since` returns the bursts to animate", (recent.recent || []).length > 0);

const future = await call("GET", `/streams/${S}/reactions`, { query: { since: new Date(Date.now() + 60_000).toISOString() } });
check("`since` in the future returns nothing to draw", (future.recent || []).length === 0);

/* ================================================================== */
section("7. Moderation Tools");

const addMod = await call("POST", `/streams/${S}/moderators`, { as: U.layla, body: { targetId: U.omar } });
check("the host can appoint a moderator", addMod.success === true);

const addModTwice = await call("POST", `/streams/${S}/moderators`, { as: U.layla, body: { targetId: U.omar } });
check("appointing the same moderator twice is a 409", addModTwice._http === 409);

const modAppointsMod = await call("POST", `/streams/${S}/moderators`, { as: U.omar, body: { targetId: U.yusuf } });
check("a moderator cannot appoint another moderator", modAppointsMod._http === 403);

const modList = await call("GET", `/streams/${S}/moderators`);
check("the moderator list reads back", modList.total === 1 && modList.moderators?.[0]?.user?.name === "Omar Khalid");

const mute = await call("POST", `/streams/${S}/moderation/mute`,
  { as: U.omar, body: { targetId: U.ali, minutes: 10, reason: "spamming" } });
check("a moderator can mute a viewer", mute.success === true && !!mute.mutedUntil);

const mutedChat = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "still here" } });
check("a muted viewer cannot chat", mutedChat._http === 403);
check("the rejection tells them when the mute lifts", !!mutedChat.mutedUntil);

const mutedReacts = await call("POST", `/streams/${S}/reactions`, { as: U.ali, body: { type: "heart" } });
check("a chat mute does not stop reactions", mutedReacts.success === true);

const muteTwice = await call("POST", `/streams/${S}/moderation/mute`, { as: U.omar, body: { targetId: U.ali } });
check("muting an already-muted viewer is a 409", muteTwice._http === 409);

const muteHost = await call("POST", `/streams/${S}/moderation/mute`, { as: U.omar, body: { targetId: U.layla } });
check("a moderator cannot mute the host", muteHost._http === 403);

const muteSelf = await call("POST", `/streams/${S}/moderation/mute`, { as: U.omar, body: { targetId: U.omar } });
check("a moderator cannot mute themselves", muteSelf._http === 403);

await call("POST", `/streams/${S}/moderators`, { as: U.layla, body: { targetId: U.yusuf } });
const modVsMod = await call("POST", `/streams/${S}/moderation/mute`, { as: U.omar, body: { targetId: U.yusuf } });
check("a moderator cannot mute another moderator", modVsMod._http === 403);
await call("POST", `/streams/${S}/moderators`, { as: U.layla, body: { targetId: U.yusuf, action: "remove" } });

const logByMod = await call("GET", `/streams/${S}/moderation`, { as: U.omar });
check("the moderation log shows the active mute", logByMod.activeMutes === 1);
check("the log names who was muted", logByMod.active?.[0]?.user?.name === "Ali Mansour");

const logByViewer = await call("GET", `/streams/${S}/moderation`, { as: U.ali });
check("a viewer cannot read the moderation log", logByViewer._http === 403);

const unmute = await call("POST", `/streams/${S}/moderation/lift`, { as: U.omar, body: { targetId: U.ali, type: "mute" } });
check("a moderator can lift a mute", unmute.success === true);

const chatAfterUnmute = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "back again" } });
check("an unmuted viewer can chat again", chatAfterUnmute.success === true);

const liftNothing = await call("POST", `/streams/${S}/moderation/lift`, { as: U.omar, body: { targetId: U.nadia, type: "ban" } });
check("lifting a restriction that is not there is a 404", liftNothing._http === 404);

/* Kicking someone who holds a seat has to release the seat as well. */
const seatsBeforeKick = (await call("GET", `/streams/${S}`, { as: U.layla })).stream?.seats?.length || 0;
const kickSeated = await call("POST", `/streams/${S}/moderation/kick`,
  { as: U.layla, body: { targetId: U.mariam, reason: "off-topic" } });
check("the host can kick a seat holder", kickSeated.success === true);
const detailAfterKick = await call("GET", `/streams/${S}`, { as: U.layla });
check("kicking a seat holder releases their seat",
  (detailAfterKick.stream?.seats?.length || 0) === seatsBeforeKick - 1,
  `${seatsBeforeKick} -> ${detailAfterKick.stream?.seats?.length}`);

const kickHost = await call("POST", `/streams/${S}/moderation/kick`, { as: U.omar, body: { targetId: U.layla } });
check("the host cannot be kicked from their own stream", kickHost._http === 400);

const kick = await call("POST", `/streams/${S}/moderation/kick`, { as: U.omar, body: { targetId: U.ali, reason: "abuse" } });
check("a moderator can kick a viewer", kick.success === true);
check("a kick with no duration is permanent for the stream", kick.permanent === true);

const rejoinBanned = await call("POST", `/streams/${S}/join`, { as: U.ali });
check("a banned viewer cannot rejoin", rejoinBanned._http === 403, `got ${rejoinBanned._http}`);

const bannedToken = await call("GET", `/streams/${S}/token`, { as: U.ali });
check("a banned viewer gets no Agora token", bannedToken._http === 403);

const bannedReacts = await call("POST", `/streams/${S}/reactions`, { as: U.ali, body: { type: "heart" } });
check("a banned viewer cannot react", bannedReacts._http === 403);

const bannedChats = await call("POST", `/streams/${S}/chat`, { as: U.ali, body: { text: "let me back" } });
check("a banned viewer cannot chat", bannedChats._http === 403);

const railForBanned = await call("GET", "/streams", { as: U.ali });
check("the rail marks the room the viewer is banned from",
  (railForBanned.streams || []).find((s) => s._id === S)?.banned === true);

const inviteBanned = await call("POST", `/streams/${S}/seats/invite`, { as: U.layla, body: { targetId: U.ali } });
check("a banned viewer cannot be invited to a seat", inviteBanned._http === 409);

const logWithBan = await call("GET", `/streams/${S}/moderation`, { as: U.layla });
check("the log counts the active bans", logWithBan.activeBans === 2, `bans=${logWithBan.activeBans}`);
check("the lifted mute has moved to history", (logWithBan.history || []).some((r) => r.type === "mute"));

const unban = await call("POST", `/streams/${S}/moderation/lift`, { as: U.layla, body: { targetId: U.ali, type: "ban" } });
check("the host can unban", unban.success === true);

const rejoinAfterUnban = await call("POST", `/streams/${S}/join`, { as: U.ali });
check("an unbanned viewer can rejoin", rejoinAfterUnban.success === true);

const removeMod = await call("POST", `/streams/${S}/moderators`, { as: U.layla, body: { targetId: U.omar, action: "remove" } });
check("the host can stand a moderator down", removeMod.success === true);

const exModActs = await call("POST", `/streams/${S}/moderation/mute`, { as: U.omar, body: { targetId: U.yusuf } });
check("a stood-down moderator can no longer moderate", exModActs._http === 403);

/* ================================================================== */
section("8. Send Gift Coins During Live (regression)");

const giftRows = await db.collection("gifts").insertMany([
  { name: `${TEST_GIFT_PREFIX}Rose`, icon: "rose.png", coinCost: 10, groupname: "Basic" },
  { name: `${TEST_GIFT_PREFIX}Crown`, icon: "crown.png", coinCost: 5000, groupname: "Premium" },
]);
const ROSE = String(giftRows.insertedIds[0]);
const CROWN = String(giftRows.insertedIds[1]);
created.gifts.push(giftRows.insertedIds[0], giftRows.insertedIds[1]);

const catalogue = await call("GET", "/gifts");
check("the gift catalogue lists the seeded gifts", catalogue.total === 2);
check("the catalogue is grouped", !!catalogue.byGroup?.Premium);

const nadiaBefore = coinsBefore[U.nadia];
const gift = await call("POST", `/streams/${S}/gift`, { as: U.nadia, body: { giftId: ROSE, quantity: 3 } });
check("a viewer can send a gift", gift.success === true && gift.coinsSpent === 30);
check("the sender is debited exactly once", gift.senderCoins === nadiaBefore - 30,
  `${nadiaBefore} -> ${gift.senderCoins}`);
check("the stream's gift total goes up", gift.streamGiftCoins === 30);

const cannotAfford = await call("POST", `/streams/${S}/gift`, { as: U.hassan, body: { giftId: CROWN } });
check("a gift beyond the balance is refused", cannotAfford._http === 402);

const selfGift = await call("POST", `/streams/${S}/gift`, { as: U.layla, body: { giftId: ROSE } });
check("the host cannot gift their own stream", selfGift._http === 400);

const board = await call("GET", `/streams/${S}/gifts/leaderboard`);
check("the leaderboard ranks the giver", board.leaderboard?.[0]?.user?.name === "Nadia Farouk");
check("the leaderboard totals the coins", board.totalCoins === 30);

/* ================================================================== */
section("9. Ending the broadcast");

const endByViewer = await call("POST", `/streams/${S}/end`, { as: U.yusuf });
check("a viewer cannot end the stream", endByViewer._http === 403);

const end = await call("POST", `/streams/${S}/end`, { as: U.layla });
check("the host can end the stream", end.success === true);
check("ending returns a summary with the gift total", end.summary?.giftCoins === 30);
check("the summary carries the peak viewer count", Number(end.summary?.peakViewers) > 0);

const endTwice = await call("POST", `/streams/${S}/end`, { as: U.layla });
check("ending twice is a 409", endTwice._http === 409);

const chatAfterEnd = await call("POST", `/streams/${S}/chat`, { as: U.yusuf, body: { text: "still on?" } });
check("chat closes when the stream ends", chatAfterEnd._http === 409);

const reactAfterEnd = await call("POST", `/streams/${S}/reactions`, { as: U.yusuf, body: { type: "heart" } });
check("reactions close when the stream ends", reactAfterEnd._http === 409);

const joinAfterEnd = await call("POST", `/streams/${S}/join`, { as: U.yusuf });
check("nobody can join an ended stream", joinAfterEnd._http === 409);

const backlogAfterEnd = await call("GET", `/streams/${S}/chat`, { as: U.yusuf });
check("the chat backlog survives the stream ending", backlogAfterEnd.total > 0);

/* A host whose previous room ended can go live again straight away. */
const live3 = await call("POST", "/streams", { as: U.layla, body: { title: "second broadcast" } });
check("the host can start a new broadcast once the old one ended", live3.success === true);
if (live3.stream?._id) created.streams.push(live3.stream._id);

const forced = await call("POST", "/streams", { as: U.layla, body: { title: "forced replacement", force: true } });
check("`force` replaces a room that is still live", forced.success === true && forced.replaced === true);
if (forced.stream?._id) created.streams.push(forced.stream._id);
await call("POST", `/streams/${forced.stream?._id}/end`, { as: U.layla });

/* ================================================================== */
section("Cleanup");

const streamIds = created.streams.filter(Boolean).map(OID);

/*
  Gifts now write to the creator earnings ledger, so the rows this suite's
  gifting creates have to be swept too — otherwise every run leaves an earnings
  entry behind and the demo data drifts a little further each time.
*/
const giftTxIds = (await db.collection("giftstransactions")
  .find({ channelName: { $regex: TEST_CHANNEL } }).toArray()).map((t) => t._id);
const delEarnings = await db.collection("earningsentries")
  .deleteMany({ sourceId: { $in: giftTxIds } });

const delChat = await db.collection("livechatmessages").deleteMany({ stream: { $in: streamIds } });
const delReactions = await db.collection("livereactions").deleteMany({ stream: { $in: streamIds } });
const delTx = await db.collection("giftstransactions").deleteMany({ channelName: { $regex: TEST_CHANNEL } });
const delGifts = await db.collection("gifts").deleteMany({ _id: { $in: created.gifts } });
const delStreams = await db.collection("livestreamtbls").deleteMany({ _id: { $in: streamIds } });
const delNotifs = await db.collection("notifications").deleteMany({
  type: { $in: ["live_invite", "live_request", "live_gift"] },
});

console.log(`  removed ${delEarnings.deletedCount} earnings rows, ` +
            `${delStreams.deletedCount} streams, ${delChat.deletedCount} chat rows, ` +
            `${delReactions.deletedCount} reaction rows, ${delGifts.deletedCount} gifts, ` +
            `${delTx.deletedCount} gift transactions, ${delNotifs.deletedCount} notifications`);

/* Gifting moved real coins between two demo accounts — put them back. */
await restoreCoins();
const coinsAfter = Object.fromEntries(
  (await db.collection("users").find({ _id: { $in: FIXTURES.map(OID) } }, { projection: { coins: 1 } }).toArray())
    .map((u) => [String(u._id), u.coins || 0])
);
check("every demo coin balance is back to where it started",
  FIXTURES.every((id) => coinsAfter[id] === coinsBefore[id]),
  JSON.stringify(coinsAfter));

const after = {
  earnings: await db.collection("earningsentries").countDocuments({}),
  streams: await db.collection("livestreamtbls").countDocuments({}),
  chat: await db.collection("livechatmessages").countDocuments({}),
  reactions: await db.collection("livereactions").countDocuments({}),
  gifts: await db.collection("gifts").countDocuments({}),
  giftTx: await db.collection("giftstransactions").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key],
    `now ${after[key]}`);
}

const demoStreamsIntact = await db.collection("livestreamtbls")
  .countDocuments({ channelName: { $in: ["layla-live-demo", "sara-live-demo"] } });
check("the two seeded demo streams are untouched", demoStreamsIntact === 2);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
/*
  exitCode rather than process.exit(): forcing an exit while sockets are still
  closing trips a libuv teardown assertion on Windows, which prints a crash
  trace after a clean run.
*/
process.exitCode = failed ? 1 : 0;
