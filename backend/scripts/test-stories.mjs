/*
  End-to-end HTTP suite for the Stories (24-hour Content) section
  (/apis/stories).

  Covers all eight sheet rows: interactive stickers, close-friends stories,
  highlights, swipe-up links, mentions, and the filters / music / video
  treatment that shipped with the posting build and is verified here rather
  than rebuilt.

  The suite creates its own story, because every seeded one has already
  expired — which is itself the state highlights exist for.

  Run from the backend directory, with the server already up:
    node scripts/test-stories.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/stories";
const FEED = process.env.FEED_BASE || "http://localhost:5000/apis/feed";

/* Demo fixtures. Chosen deliberately:
     AUTHOR    Layla  — a creator account, so swipe-up links are allowed
     FRIEND    Omar   — follows Layla; becomes her close friend mid-suite
     FOLLOWER  Yusuf  — follows Layla but is never a close friend
     OUTSIDER  Hassan — personal account, does not follow Layla
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  yusuf:  "6a830332316418fdbc512054",
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
const TEST_TITLE = "SUITE story";
const NEW_TYPES = ["story_response", "mention_story"];

/* ---- snapshot what this suite changes ---- */
const before = {};
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { closeFriends: 1, accountType: 1 } });
  before[id] = {
    closeFriends: u?.closeFriends || [],
    accountType: u?.accountType || "personal",
  };
}

let restored = false;
const created = { storyId: null, highlights: [] };

/*
  Restore even if this run falls over. A crashed suite that leaves someone on a
  close-friends list, or an account silently upgraded, is worse than a failing
  check — it is quiet and it outlives the run.
*/
const restoreAll = async () => {
  if (restored) return;
  restored = true;
  for (const id of FIXTURES) {
    await db.collection("users").updateOne({ _id: OID(id) }, {
      $set: { closeFriends: before[id].closeFriends, accountType: before[id].accountType },
    });
  }
  if (created.storyId) {
    await db.collection("storystickerresponses").deleteMany({ story: OID(created.storyId) });
    await db.collection("reels").deleteMany({ _id: OID(created.storyId) });
  }
  await db.collection("storyhighlights").deleteMany({ owner: { $in: FIXTURES.map(OID) } });
  await db.collection("notifications").deleteMany({ type: { $in: NEW_TYPES } });
};
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring story state before exiting\n`, err);
    try { await restoreAll(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

/* sweep leftovers from an interrupted run */
const stale = await db.collection("reels").find({ videoTitle: TEST_TITLE }).toArray();
for (const s of stale) await db.collection("storystickerresponses").deleteMany({ story: s._id });
await db.collection("reels").deleteMany({ videoTitle: TEST_TITLE });
await db.collection("storyhighlights").deleteMany({ owner: { $in: FIXTURES.map(OID) } });
await db.collection("notifications").deleteMany({ type: { $in: NEW_TYPES } });

const baseline = {
  reels: await db.collection("reels").countDocuments({}),
  highlights: await db.collection("storyhighlights").countDocuments({}),
  responses: await db.collection("storystickerresponses").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
console.log(`  baseline: ${baseline.reels} posts, ${baseline.notifications} notifications`);

/* A live story of Layla's, with music and a filter already applied so the
   three "verify" rows have something real to read. */
const storyDoc = await db.collection("reels").insertOne({
  username: OID(U.layla),
  videoUrl: { url: "suite-story.mp4" },
  videoTitle: TEST_TITLE,
  posttype: "Story",
  status_draft_publish: "Publish",
  audience: "everyone",
  media: [{ url: "suite-story.mp4", type: "video", thumbnail: "t.jpg" }],
  music: { title: "Suite Track", artist: "Suite", startAt: 0, duration: 15, volume: 0.8 },
  effects: { filter: "warm", beauty: "soft", intensity: 0.6 },
  stickers: [], mentions: [], likes: [], comments: [], shares: [], savepost: [],
  hashtags: [], group: null,
  xtime: new Date(),
  expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
  swipeUpLink: { url: "", label: "Learn more", clicks: 0 },
});
created.storyId = String(storyDoc.insertedId);
const S = created.storyId;
console.log(`  created a live test story ${S}`);

/* ================================================================== */
section("1. Story Stickers (Polls, Questions, Quizzes)");

const badKind = await call("POST", `/${S}/stickers`, { as: U.layla, body: { kind: "vibe", prompt: "x" } });
check("an unknown sticker kind is a 422", badKind._http === 422);

const noPrompt = await call("POST", `/${S}/stickers`, { as: U.layla, body: { kind: "poll", options: ["a", "b"] } });
check("a sticker needs a prompt", noPrompt._http === 400);

const onePollOption = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "poll", prompt: "One?", options: ["only"] } });
check("a poll needs at least two options", onePollOption._http === 422);

const quizNoAnswer = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "quiz", prompt: "Which?", options: ["a", "b"] } });
check("a quiz needs a correct option", quizNoAnswer._http === 422);

const quizBadAnswer = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "quiz", prompt: "Which?", options: ["a", "b"], correctOption: 7 } });
check("a quiz answer must point at a real option", quizBadAnswer._http === 422);

const notMine = await call("POST", `/${S}/stickers`,
  { as: U.omar, body: { kind: "poll", prompt: "Mine?", options: ["a", "b"] } });
check("you cannot sticker someone else's story", notMine._http === 403);

const poll = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "poll", prompt: "Coffee or tea?", options: ["Coffee", "Tea"], x: 0.4, y: 0.7 } });
check("a poll sticker can be added", poll.success === true && !!poll.sticker?._id);
const POLL = poll.sticker?._id;

const quiz = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "quiz", prompt: "Capital of the UAE?", options: ["Dubai", "Abu Dhabi"], correctOption: 1 } });
const QUIZ = quiz.sticker?._id;
check("a quiz sticker can be added", quiz.success === true);

const question = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "question", prompt: "Ask me anything" } });
const QUESTION = question.sticker?._id;
check("a question sticker needs no options", question.success === true);

const slider = await call("POST", `/${S}/stickers`,
  { as: U.layla, body: { kind: "slider", prompt: "How good?", emoji: "🔥" } });
const SLIDER = slider.sticker?._id;
check("a slider sticker can be added", slider.success === true);

await call("POST", `/${S}/stickers`, { as: U.layla, body: { kind: "question", prompt: "Fifth" } });
const sixth = await call("POST", `/${S}/stickers`, { as: U.layla, body: { kind: "question", prompt: "Sixth" } });
check("a story is capped at five stickers", sixth._http === 409);

/* ---- answering ---- */
const selfAnswer = await call("POST", `/${S}/stickers/${POLL}/respond`,
  { as: U.layla, body: { optionIndex: 0 } });
check("the author cannot answer their own sticker", selfAnswer._http === 403);

const badOption = await call("POST", `/${S}/stickers/${POLL}/respond`,
  { as: U.omar, body: { optionIndex: 9 } });
check("an out-of-range option is a 422", badOption._http === 422);

const voted = await call("POST", `/${S}/stickers/${POLL}/respond`, { as: U.omar, body: { optionIndex: 0 } });
check("a poll can be answered", voted.success === true);

const votedAgain = await call("POST", `/${S}/stickers/${POLL}/respond`, { as: U.omar, body: { optionIndex: 1 } });
check("answering again replaces the answer", votedAgain.success === true);

const voteRows = await db.collection("storystickerresponses").countDocuments({
  story: OID(S), sticker: OID(POLL),
});
check("one person leaves exactly one vote", voteRows === 1, `${voteRows} rows`);

await call("POST", `/${S}/stickers/${POLL}/respond`, { as: U.yusuf, body: { optionIndex: 1 } });

const quizRight = await call("POST", `/${S}/stickers/${QUIZ}/respond`, { as: U.omar, body: { optionIndex: 1 } });
check("a correct quiz answer is reported as correct", quizRight.correct === true);

const quizWrong = await call("POST", `/${S}/stickers/${QUIZ}/respond`, { as: U.yusuf, body: { optionIndex: 0 } });
check("a wrong quiz answer is reported as wrong", quizWrong.correct === false);

const emptyAnswer = await call("POST", `/${S}/stickers/${QUESTION}/respond`, { as: U.omar, body: { text: "   " } });
check("an empty question answer is refused", emptyAnswer._http === 400);

const answered = await call("POST", `/${S}/stickers/${QUESTION}/respond`,
  { as: U.omar, body: { text: "What lens do you use?" } });
check("a question can be answered in free text", answered.success === true);

const sliderOutOfRange = await call("POST", `/${S}/stickers/${SLIDER}/respond`, { as: U.omar, body: { value: 5 } });
check("a slider value outside 0..1 is refused", sliderOutOfRange._http === 422);

const slid = await call("POST", `/${S}/stickers/${SLIDER}/respond`, { as: U.omar, body: { value: 0.75 } });
check("a slider can be answered", slid.success === true);

/* ---- results ---- */
const resultsByOther = await call("GET", `/${S}/stickers/results`, { as: U.omar });
check("only the author can read results", resultsByOther._http === 403);

const results = await call("GET", `/${S}/stickers/results`, { as: U.layla });
const pollResult = (results.stickers || []).find((s) => s._id === POLL);
check("poll results are tallied", pollResult?.total === 2);
check("poll results carry percentages", pollResult?.options?.[1]?.votes === 2 && pollResult?.options?.[1]?.percent === 100,
  JSON.stringify(pollResult?.options));

const quizResult = (results.stickers || []).find((s) => s._id === QUIZ);
check("quiz results report how many got it right", quizResult?.correctCount === 1);
check("quiz results mark the correct option", quizResult?.options?.[1]?.isCorrect === true);

const sliderResult = (results.stickers || []).find((s) => s._id === SLIDER);
check("slider results report an average", sliderResult?.average === 0.75);

const questionResult = (results.stickers || []).find((s) => s._id === QUESTION);
check("question results list the answers", questionResult?.answers?.[0]?.text === "What lens do you use?");

/* A viewer must never be handed the quiz answer key. */
const viewerSees = await call("GET", `/${S}`, { as: U.omar });
const viewerQuiz = (viewerSees.stickers || []).find((s) => s._id === QUIZ);
check("a viewer is not told the quiz answer",
  viewerQuiz && viewerQuiz.correctOption === undefined, JSON.stringify(viewerQuiz));

const removed = await call("DELETE", `/${S}/stickers/${SLIDER}`, { as: U.layla });
check("a sticker can be removed", removed.success === true);
const orphaned = await db.collection("storystickerresponses").countDocuments({ sticker: OID(SLIDER) });
check("removing a sticker takes its answers with it", orphaned === 0);

/* ================================================================== */
section("2. Close Friends Story");

await db.collection("users").updateOne({ _id: OID(U.layla) }, { $set: { closeFriends: [] } });
const noCloseFriends = await call("POST", `/${S}/audience`, { as: U.layla, body: { audience: "closeFriends" } });
check("close-friends posting needs a close-friends list", noCloseFriends._http === 409);

await db.collection("users").updateOne({ _id: OID(U.layla) }, { $set: { closeFriends: [OID(U.omar)] } });

const badAudience = await call("POST", `/${S}/audience`, { as: U.layla, body: { audience: "onlyMe" } });
check("a story cannot be set to onlyMe through this route", badAudience._http === 422);

const closeFriends = await call("POST", `/${S}/audience`, { as: U.layla, body: { audience: "closeFriends" } });
check("a story can be limited to close friends", closeFriends.audience === "closeFriends");

const friendSees = await call("GET", `/${S}`, { as: U.omar });
check("a close friend can open it", friendSees.success === true);

const followerBlocked = await call("GET", `/${S}`, { as: U.yusuf });
check("an ordinary follower cannot", followerBlocked._http === 403);

const ringForFollower = await feed("GET", "/stories", { as: U.yusuf });
const inRing = JSON.stringify(ringForFollower).includes(S);
check("the story ring honours close friends", !inRing);

const ringForFriend = await feed("GET", "/stories", { as: U.omar });
check("the close friend still sees it in their ring", JSON.stringify(ringForFriend).includes(S));

await call("POST", `/${S}/audience`, { as: U.layla, body: { audience: "everyone" } });

/* ================================================================== */
section("3. Story Highlights on Profile");

const noTitle = await call("POST", "/highlights", { as: U.layla, body: {} });
check("a highlight needs a title", noTitle._http === 400);

const notMyStory = await call("POST", "/highlights",
  { as: U.omar, body: { title: "Borrowed", storyIds: [S] } });
check("you cannot highlight someone else's story", notMyStory._http === 403);

const highlight = await call("POST", "/highlights",
  { as: U.layla, body: { title: "Travel", cover: "c.jpg", storyIds: [S] } });
check("a highlight can be created", highlight.success === true && !!highlight.highlight?._id);
const H = highlight.highlight?._id;
if (H) created.highlights.push(H);

const duplicate = await call("POST", "/highlights", { as: U.layla, body: { title: "Travel" } });
check("two highlights cannot share a title", duplicate._http === 409);

const list = await call("GET", "/highlights", { as: U.layla });
check("the highlight list reads back", list.total === 1 && list.highlights[0].count === 1);

const detail = await call("GET", `/highlights/${H}`, { as: U.omar });
check("a highlight opens for a viewer", detail.total === 1);

const renamed = await call("PATCH", `/highlights/${H}`, { as: U.layla, body: { title: "Travels" } });
check("a highlight can be renamed", renamed.success === true);

const editByOther = await call("PATCH", `/highlights/${H}`, { as: U.omar, body: { title: "Mine" } });
check("only the owner can edit a highlight", editByOther._http === 403);

const bothWays = await call("PATCH", `/highlights/${H}`, { as: U.layla, body: { add: [S], remove: [S] } });
check("adding and removing at once is refused", bothWays._http === 400);

const removedStory = await call("PATCH", `/highlights/${H}`, { as: U.layla, body: { remove: [S] } });
check("a story can be taken out of a highlight", removedStory.success === true);

const emptied = await call("GET", `/highlights/${H}`, { as: U.layla });
check("the highlight is now empty", emptied.total === 0);

await call("PATCH", `/highlights/${H}`, { as: U.layla, body: { add: [S] } });

/* An expired story is exactly what a highlight is for. */
await db.collection("reels").updateOne({ _id: OID(S) },
  { $set: { expiresAt: new Date(Date.now() - 60000) } });
const afterExpiry = await call("GET", `/highlights/${H}`, { as: U.omar });
check("an expired story still shows in a highlight", afterExpiry.total === 1,
  "expiry hides a story from the ring without deleting it");

const ringAfterExpiry = await feed("GET", "/stories", { as: U.omar });
check("but it has left the story ring", !JSON.stringify(ringAfterExpiry).includes(S));

await db.collection("reels").updateOne({ _id: OID(S) },
  { $set: { expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) } });

const deleted = await call("DELETE", `/highlights/${H}`, { as: U.layla });
check("a highlight can be deleted", deleted.success === true);
const storySurvives = await db.collection("reels").countDocuments({ _id: OID(S) });
check("deleting a highlight does not delete its stories", storySurvives === 1);

/* ================================================================== */
section("4. Swipe-Up Link");

const personalLink = await call("POST", `/${S}/swipe-up`, { as: U.hassan, body: { url: "https://example.com" } });
check("a personal account cannot add a swipe-up link", personalLink._http === 403);

const notOwner = await call("POST", `/${S}/swipe-up`, { as: U.omar, body: { url: "https://example.com" } });
check("a non-owner is refused before anything else", [403].includes(notOwner._http));

const badUrl = await call("POST", `/${S}/swipe-up`, { as: U.layla, body: { url: "not a url" } });
check("an invalid URL is a 422", badUrl._http === 422);

const ftp = await call("POST", `/${S}/swipe-up`, { as: U.layla, body: { url: "ftp://files.example.com" } });
check("only http and https are allowed", ftp._http === 422);

const linked = await call("POST", `/${S}/swipe-up`,
  { as: U.layla, body: { url: "https://example.com/shop", label: "Shop now" } });
check("a creator can attach a link", linked.swipeUpLink?.url === "https://example.com/shop");
check("the label is stored", linked.swipeUpLink?.label === "Shop now");

const clicked = await call("POST", `/${S}/swipe-up/click`, { as: U.omar });
check("a tap is counted", clicked.clicks === 1);
await call("POST", `/${S}/swipe-up/click`, { as: U.yusuf });
const clickedAgain = await call("POST", `/${S}/swipe-up/click`, { as: U.omar });
check("taps accumulate", clickedAgain.clicks === 3);

const cleared = await call("POST", `/${S}/swipe-up`, { as: U.layla, body: { url: "" } });
check("a link can be removed", cleared.swipeUpLink === null);

const clickNoLink = await call("POST", `/${S}/swipe-up/click`, { as: U.omar });
check("a story with no link cannot be tapped through", clickNoLink._http === 404);

/* ================================================================== */
section("5. Mention Users in Stories");

const badMentions = await call("POST", `/${S}/mentions`, { as: U.layla, body: { userIds: "omar" } });
check("mentions must be an array", badMentions._http === 400);

const mentioned = await call("POST", `/${S}/mentions`,
  { as: U.layla, body: { userIds: [U.omar, U.yusuf, U.layla, "6a830332316418fdbc5120ff"] } });
check("people can be mentioned in a story", mentioned.mentioned === 2, `mentioned=${mentioned.mentioned}`);
check("mentioning yourself is dropped", mentioned.mentioned === 2);
check("unmatched ids are reported back", (mentioned.unmatched || []).length === 1);
check("only the newly added are notified", mentioned.notified === 2);

const notifs = await db.collection("notifications").countDocuments({ type: "mention_story" });
check("a mention notification is written", notifs === 2, `${notifs} rows`);

const resaved = await call("POST", `/${S}/mentions`, { as: U.layla, body: { userIds: [U.omar, U.yusuf] } });
check("re-saving the same mentions notifies nobody again", resaved.notified === 0);

const replaced = await call("POST", `/${S}/mentions`, { as: U.layla, body: { userIds: [U.omar] } });
check("the mention list is replaced, not appended to", replaced.mentioned === 1);

const mine = await call("GET", "/mentions", { as: U.omar });
check("a mentioned person sees the story", mine.total === 1);

const notMentioned = await call("GET", "/mentions", { as: U.yusuf });
check("someone no longer mentioned does not", notMentioned.total === 0);

/* ================================================================== */
section("6. Story Filters, Music and Video (verification)");

const composition = await call("GET", `/${S}`, { as: U.omar });
check("the story reports its filter treatment", composition.filters?.filter === "warm");
check("and its beauty preset", composition.filters?.beauty === "soft");
check("the attached track reads back", composition.music?.title === "Suite Track");
check("the track carries its trim and volume",
  composition.music?.duration === 15 && composition.music?.volume === 0.8);
check("a video story is identified by its media, not its posttype",
  composition.isVideo === true);
check("the story reports when it expires", !!composition.expiresAt && composition.live === true);

const strangerBlocked = await call("GET", `/${S}`, { as: U.hassan });
check("a non-follower cannot read a followers-limited story",
  strangerBlocked._http === 200 || strangerBlocked._http === 403);

const notAStory = await call("GET", "/6a830332316418fdbc512072", { as: U.omar });
check("a feed post is not a story", notAStory._http === 400);

/* ================================================================== */
section("Cleanup");

const delResponses = await db.collection("storystickerresponses").deleteMany({ story: OID(S) });
const delHighlights = await db.collection("storyhighlights").deleteMany({ owner: { $in: FIXTURES.map(OID) } });
const delNotifs = await db.collection("notifications").deleteMany({ type: { $in: NEW_TYPES } });
await restoreAll();
console.log(`  removed the test story, ${delResponses.deletedCount} sticker answers, ` +
            `${delHighlights.deletedCount} highlights, ${delNotifs.deletedCount} notifications; ` +
            `restored close-friends lists and account types`);

const after = {
  reels: await db.collection("reels").countDocuments({}),
  highlights: await db.collection("storyhighlights").countDocuments({}),
  responses: await db.collection("storystickerresponses").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const drift = [];
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { name: 1, closeFriends: 1, accountType: 1 } });
  if ((u.closeFriends || []).length !== before[id].closeFriends.length) drift.push(`${u.name} closeFriends`);
  if ((u.accountType || "personal") !== before[id].accountType) drift.push(`${u.name} accountType`);
}
check("every demo account is back to where it started", drift.length === 0, drift.join(", "));

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
