/*
  End-to-end HTTP suite for the Groups & Community section (/apis/groups).

  Drives every endpoint against the running server, asserts the failure paths
  as well as the happy ones, and deletes everything it created at the end.

  Run from the backend directory:  node scripts/test-groups.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/groups";

/* Demo fixtures. Chosen deliberately:
     OWNER  Layla  — creates the groups
     ADMIN  Omar   — promoted to admin, does the moderating
     MOD    Yusuf  — promoted to moderator, tests the rank ceiling
     MEMBER Ali    — ordinary member, posts under the approval queue
     OUTSIDER Sara — private account, never joins; tests the 403/404 paths
     EXTRA  Nadia, Hassan, Mariam — invitations and bulk paths
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

  // GET/HEAD cannot carry a body, so those pass the actor in the query string
  // (which `as` already did above).
  const hasBody = !["GET", "HEAD"].includes(method) && (body || as);

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: hasBody ? JSON.stringify({ userId: as, ...(body || {}) }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  // `_http` and not `status`: the response body has its own `status` field
  // (a membership or post state), and spreading it would shadow the code.
  return { ...json, _http: res.status };
};

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

const created = { groups: [], posts: [] };

/* Names this suite creates. Swept before and after so an interrupted run
   cannot leave rows behind that skew the next one's counts. */
const TEST_NAMES = [
  "Desert Photography", "Private Critique Circle", "Odd", "Secret Darkroom", "ProbeGrp",
];

/* This file lives outside the backend tree, so ESM would resolve its imports
   against the scratchpad rather than the project. Resolve from the working
   directory instead — the suite is documented as run from backend/. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

const sweep = async () => {
  const stale = await db.collection("socialgroups").find({ name: { $in: TEST_NAMES } }).toArray();
  if (!stale.length) return 0;
  const ids = stale.map((g) => g._id);
  await db.collection("reels").deleteMany({ group: { $in: ids } });
  await db.collection("groupmembers").deleteMany({ group: { $in: ids } });
  await db.collection("notifications").deleteMany({ group: { $in: ids } });
  await db.collection("socialgroups").deleteMany({ _id: { $in: ids } });
  return ids.length;
};

const swept = await sweep();
if (swept) console.log(`  (swept ${swept} leftover groups from a previous run)`);

/* ================================================================== */
section("1. Create public or private groups");

let pub = await call("POST", "/create", {
  as: U.layla,
  body: {
    name: "Desert Photography",
    description: "Golden hour in the dunes.",
    visibility: "public",
    category: "Photography",
    tags: ["Photo", "desert"],
    settings: { postPolicy: "anyone" },
  },
});
check("create public group", pub.success === true && !!pub.group?._id, JSON.stringify(pub).slice(0, 200));
const PUB = pub.group?._id;
if (PUB) created.groups.push(PUB);

check("creator is owner", pub.group?.myRole === "owner");
check("creator counted as a member", pub.group?.memberCount === 1, `got ${pub.group?.memberCount}`);
check("public group is not isPrivate", pub.group?.isPrivate === false);

let priv = await call("POST", "/create", {
  as: U.layla,
  body: {
    name: "Private Critique Circle",
    visibility: "private",
    settings: { postPolicy: "approval", requireRulesAccept: true, joinQuestion: "What do you shoot?" },
    rules: [
      { title: "Be constructive", description: "Critique the photo, not the person." },
      { title: "One post a day" },
    ],
  },
});
check("create private group with rules", priv.success === true && !!priv.group?._id);
const PRIV = priv.group?._id;
if (PRIV) created.groups.push(PRIV);
check("private group sets isPrivate", priv.group?.isPrivate === true);
check("private group forces member review", priv.group?.settings?.approveMembers === true);
check("rules stored", priv.group?.rulesCount === 2, `got ${priv.group?.rulesCount}`);

const noName = await call("POST", "/create", { as: U.layla, body: { name: "  " } });
check("create without a name is rejected", noName._http === 400);

const noUser = await call("POST", "/create", { body: { name: "Orphan" } });
check("create without a userId is rejected", noUser._http === 400);

const badVis = await call("POST", "/create", { as: U.layla, body: { name: "Odd", visibility: "translucent" } });
check("unknown visibility falls back to public", badVis.group?.visibility === "public");
if (badVis.group?._id) created.groups.push(badVis.group._id);

/* secret group, for the discovery assertions */
const secret = await call("POST", "/create", {
  as: U.layla, body: { name: "Secret Darkroom", visibility: "secret" },
});
const SECRET = secret.group?._id;
if (SECRET) created.groups.push(SECRET);
check("create secret group", secret.success === true);

const detail = await call("GET", `/${PUB}`, { as: U.layla });
check("group detail returns the group", detail.group?.name === "Desert Photography");
check("owner sees settings block", !!detail.group?.settings);

const outsiderDetail = await call("GET", `/${PUB}`, { as: U.sara });
check("outsider sees a public group", outsiderDetail.success === true);
check("outsider gets no settings block", outsiderDetail.group?.settings === undefined);

const secretToOutsider = await call("GET", `/${SECRET}`, { as: U.sara });
check("secret group is 404 to an outsider", secretToOutsider._http === 404);

const privToOutsider = await call("GET", `/${PRIV}`, { as: U.sara });
check("private group is discoverable but its rules are hidden",
  privToOutsider.success === true && (privToOutsider.group?.rules || []).length === 0);

const upd = await call("PATCH", `/${PUB}`, { as: U.layla, body: { description: "Dunes, at dawn." } });
check("owner can edit the group", upd.group?.description === "Dunes, at dawn.");

const updByOutsider = await call("PATCH", `/${PUB}`, { as: U.sara, body: { description: "hijacked" } });
check("outsider cannot edit the group", updByOutsider._http === 403);

const badId = await call("GET", "/not-an-object-id", { as: U.layla });
check("malformed group id is a 400", badId._http === 400);

const missing = await call("GET", "/6a830332316418fdbc5120ff", { as: U.layla });
check("unknown group id is a 404", missing._http === 404);

const list = await call("GET", "/", { as: U.sara, query: { search: "Desert" } });
check("discovery finds the public group", (list.groups || []).some((g) => g._id === PUB));
const listAll = await call("GET", "/", { as: U.sara, query: { limit: 50 } });
check("discovery hides secret groups from outsiders", !(listAll.groups || []).some((g) => g._id === SECRET));
const listOwner = await call("GET", "/", { as: U.layla, query: { limit: 50 } });
check("owner still sees their secret group", (listOwner.groups || []).some((g) => g._id === SECRET));

const mine = await call("GET", "/my", { as: U.layla });
check("my groups lists everything created", (mine.groups || []).length >= 4, `got ${mine.groups?.length}`);

/* ================================================================== */
section("2. Group rules");

const addedRule = await call("POST", `/${PRIV}/rules`, {
  as: U.layla, body: { title: "No reposts", description: "Original work only." },
});
check("owner can add a rule", addedRule.success === true && addedRule.rules?.length === 3);
check("rules version bumped", addedRule.version === 2, `got ${addedRule.version}`);

const ruleIds = (addedRule.rules || []).map((r) => r._id);
const editRule = await call("PATCH", `/${PRIV}/rules/${ruleIds[0]}`, {
  as: U.layla, body: { title: "Be constructive, always" },
});
check("owner can edit a rule", editRule.rules?.[0]?.title === "Be constructive, always");

const reordered = await call("PUT", `/${PRIV}/rules/reorder`, {
  as: U.layla, body: { order: [ruleIds[2], ruleIds[0], ruleIds[1]] },
});
check("rules can be reordered", reordered.rules?.[0]?.title === "No reposts");

const shortOrder = await call("PUT", `/${PRIV}/rules/reorder`, {
  as: U.layla, body: { order: [ruleIds[0]] },
});
check("a partial reorder is rejected", shortOrder._http === 400);

const ruleByOutsider = await call("POST", `/${PRIV}/rules`, { as: U.sara, body: { title: "sneaky" } });
check("outsider cannot add a rule to a private group", ruleByOutsider._http === 403);

const missingRule = await call("PATCH", `/${PRIV}/rules/6a830332316418fdbc5120ff`, {
  as: U.layla, body: { title: "ghost" },
});
check("editing an unknown rule is a 404", missingRule._http === 404);

const delRule = await call("DELETE", `/${PRIV}/rules/${ruleIds[1]}`, { as: U.layla });
check("a rule can be deleted", delRule.rules?.length === 2);
check("orders stay dense after a delete",
  JSON.stringify((delRule.rules || []).map((r) => r.order)) === "[0,1]",
  JSON.stringify((delRule.rules || []).map((r) => r.order)));

/* ================================================================== */
section("3. Join, leave, approve / reject requests");

const joinPub = await call("POST", `/${PUB}/join`, { as: U.ali });
check("joining an open public group is immediate", joinPub.status === undefined && joinPub.status_ !== 403 && joinPub.success === true && joinPub.status === undefined ? false : joinPub.success === true);
check("...and lands as active", joinPub.status === "active" || joinPub.membership?.status === "active", JSON.stringify(joinPub).slice(0, 160));

const joinAgain = await call("POST", `/${PUB}/join`, { as: U.ali });
check("joining twice is a 409", joinAgain._http === 409);

await call("POST", `/${PUB}/join`, { as: U.omar });
await call("POST", `/${PUB}/join`, { as: U.yusuf });
const afterJoins = await call("GET", `/${PUB}`, { as: U.layla });
check("member count follows the joins", afterJoins.group?.memberCount === 4, `got ${afterJoins.group?.memberCount}`);

const reqPriv = await call("POST", `/${PRIV}/join`, { as: U.ali, body: { note: "Landscapes, mostly." } });
check("joining a private group queues a request", reqPriv.status === "pending", JSON.stringify(reqPriv).slice(0, 160));

const reqAgain = await call("POST", `/${PRIV}/join`, { as: U.ali });
check("re-requesting reports the existing request", reqAgain.success === true);

const queueByOutsider = await call("GET", `/${PRIV}/requests`, { as: U.sara });
check("outsider cannot read the request queue", queueByOutsider._http === 403);

const queue = await call("GET", `/${PRIV}/requests`, { as: U.layla });
check("owner sees the pending request", (queue.requests || []).length === 1, `got ${queue.requests?.length}`);
check("the join note is carried through", queue.requests?.[0]?.note === "Landscapes, mostly.");

await call("POST", `/${PRIV}/join`, { as: U.hassan, body: { note: "Portraits." } });
const rejected = await call("POST", `/${PRIV}/requests/${U.hassan}/reject`, {
  as: U.layla, body: { note: "Wrong fit for now." },
});
check("a request can be rejected", rejected.status === "rejected");

const rejectAgain = await call("POST", `/${PRIV}/requests/${U.hassan}/reject`, { as: U.layla });
check("re-reviewing a decided request is idempotent",
  rejectAgain.success === true && rejectAgain.status === "rejected");

const approved = await call("POST", `/${PRIV}/requests/${U.ali}/approve`, { as: U.layla });
check("a request can be approved", approved.status === "active");

const privAfter = await call("GET", `/${PRIV}`, { as: U.layla });
check("approval moves the member into the count", privAfter.group?.memberCount === 2, `got ${privAfter.group?.memberCount}`);
check("...and clears the pending count", privAfter.group?.pendingCount === 0, `got ${privAfter.group?.pendingCount}`);

const noRequest = await call("POST", `/${PRIV}/requests/${U.mariam}/approve`, { as: U.layla });
check("approving a user who never asked is a 404", noRequest._http === 404);

/* invitations */
const invited = await call("POST", `/${PUB}/invite`, {
  as: U.layla, body: { userIds: [U.nadia, U.mariam, U.ali] },
});
check("bulk invite works", (invited.invited || []).length === 2, JSON.stringify(invited).slice(0, 160));
check("an existing member is skipped, not re-invited",
  (invited.skipped || []).some((s) => s.userId === U.ali && s.reason === "active"));

const inviteAccepted = await call("POST", `/${PUB}/invite/respond`, { as: U.nadia, body: { accept: true } });
check("an invitation can be accepted", inviteAccepted.status === "active");

const inviteDeclined = await call("POST", `/${PUB}/invite/respond`, { as: U.mariam, body: { accept: false } });
check("an invitation can be declined", inviteDeclined.status === "rejected");

const noInvite = await call("POST", `/${PUB}/invite/respond`, { as: U.sara, body: { accept: true } });
check("responding without an invitation is a 404", noInvite._http === 404);

/* ================================================================== */
section("4. Admins & moderators");

const promoteOmar = await call("POST", `/${PUB}/members/${U.omar}/role`, { as: U.layla, body: { role: "admin" } });
check("owner can promote to admin", promoteOmar.role === "admin");

const promoteYusuf = await call("POST", `/${PUB}/members/${U.yusuf}/role`, { as: U.omar, body: { role: "moderator" } });
check("an admin can promote to moderator", promoteYusuf.role === "moderator");

const selfPromote = await call("POST", `/${PUB}/members/${U.omar}/role`, { as: U.omar, body: { role: "admin" } });
check("nobody can change their own role", selfPromote._http === 400);

const modPromotes = await call("POST", `/${PUB}/members/${U.ali}/role`, { as: U.yusuf, body: { role: "admin" } });
check("a moderator cannot assign roles", modPromotes._http === 403);

const adminMakesAdmin = await call("POST", `/${PUB}/members/${U.ali}/role`, { as: U.omar, body: { role: "admin" } });
check("an admin cannot grant a role equal to their own", adminMakesAdmin._http === 403);

const modDemotesAdmin = await call("POST", `/${PUB}/members/${U.omar}/role`, { as: U.yusuf, body: { role: "member" } });
check("a moderator cannot demote an admin", modDemotesAdmin._http === 403);

const badRole = await call("POST", `/${PUB}/members/${U.ali}/role`, { as: U.layla, body: { role: "overlord" } });
check("an unknown role is rejected", badRole._http === 400);

const members = await call("GET", `/${PUB}/members`, { as: U.layla });
check("member list returns everyone active", (members.members || []).length === 5, `got ${members.members?.length}`);
check("staff see contribution counts", members.members?.[0]?.postCount !== undefined);

const membersToMember = await call("GET", `/${PUB}/members`, { as: U.ali });
check("an ordinary member sees no contribution counts", membersToMember.members?.[0]?.postCount === undefined);

const ownerLeaves = await call("POST", `/${PUB}/leave`, { as: U.layla });
check("the owner cannot simply leave", ownerLeaves._http === 400);

/* ================================================================== */
section("5. Post inside a group");

const post1 = await call("POST", `/${PUB}/posts`, {
  as: U.ali, body: { caption: "Dawn over the big dune #desert" },
});
check("a member can post in an open group", post1.status === "approved", JSON.stringify(post1).slice(0, 200));
if (post1.item?._id) created.posts.push(post1.item._id);

const emptyPost = await call("POST", `/${PUB}/posts`, { as: U.ali, body: { caption: "   " } });
check("an empty post is rejected", emptyPost._http === 400);

const outsiderPost = await call("POST", `/${PUB}/posts`, { as: U.sara, body: { caption: "hello" } });
check("a non-member cannot post", outsiderPost._http === 403);

const feed = await call("GET", `/${PUB}/feed`, { as: U.ali });
check("the group feed returns the post", (feed.items || []).some((i) => i._id === post1.item?._id));
check("feed carries the author's role", feed.items?.[0]?.authorRole === "member", feed.items?.[0]?.authorRole);

/* the public timeline must not show group posts */
const timeline = await fetch(`http://localhost:5000/apis/feed/home?userId=${U.ali}&limit=50`).then((r) => r.json());
check("group posts stay out of the public timeline",
  !(timeline.items || []).some((i) => i._id === post1.item?._id));

const explore = await fetch(`http://localhost:5000/apis/feed/foryou?userId=${U.omar}&limit=50`).then((r) => r.json());
check("group posts stay out of For You",
  !(explore.items || []).some((i) => i._id === post1.item?._id));

/* approval queue on the private group — Ali is a member, policy is "approval" */
const rulesBlocked = await call("POST", `/${PRIV}/posts`, { as: U.ali, body: { caption: "First!" } });
check("posting before accepting required rules is blocked", rulesBlocked._http === 403);

const accepted = await call("POST", `/${PRIV}/rules/accept`, { as: U.ali });
check("a member can accept the rules", accepted.success === true);

const queued = await call("POST", `/${PRIV}/posts`, { as: U.ali, body: { caption: "My first critique request" } });
check("a member post lands in the review queue", queued.status === "pending", JSON.stringify(queued).slice(0, 160));
if (queued.item?._id) created.posts.push(queued.item._id);

const staffPost = await call("POST", `/${PRIV}/posts`, { as: U.layla, body: { caption: "Welcome, everyone" } });
check("staff bypass their own approval queue", staffPost.status === "approved");
if (staffPost.item?._id) created.posts.push(staffPost.item._id);

const feedHidesPending = await call("GET", `/${PRIV}/feed`, { as: U.ali });
check("a pending post is absent from the group feed",
  !(feedHidesPending.items || []).some((i) => i._id === queued.item?._id));

const pending = await call("GET", `/${PRIV}/posts/pending`, { as: U.layla });
check("moderators see the pending queue", (pending.items || []).length === 1, `got ${pending.items?.length}`);

const pendingToMember = await call("GET", `/${PRIV}/posts/pending`, { as: U.ali });
check("an ordinary member cannot read the queue", pendingToMember._http === 403);

const approvePost = await call("POST", `/${PRIV}/posts/${queued.item?._id}/approve`, { as: U.layla });
check("a pending post can be approved", approvePost.status === "approved");

const approveTwice = await call("POST", `/${PRIV}/posts/${queued.item?._id}/approve`, { as: U.layla });
check("re-approving is idempotent", approveTwice.success === true && approveTwice.status === "approved");

const feedShowsApproved = await call("GET", `/${PRIV}/feed`, { as: U.ali });
check("the approved post appears in the feed",
  (feedShowsApproved.items || []).some((i) => i._id === queued.item?._id));

const pinned = await call("POST", `/${PUB}/posts/${post1.item?._id}/pin`, { as: U.yusuf });
check("a moderator can pin a post", pinned.pinned === true);

const post2 = await call("POST", `/${PUB}/posts`, { as: U.nadia, body: { caption: "Second shot" } });
if (post2.item?._id) created.posts.push(post2.item._id);
const pinnedFirst = await call("GET", `/${PUB}/feed`, { as: U.ali });
check("a pinned post sorts to the top of the feed",
  pinnedFirst.items?.[0]?._id === post1.item?._id, pinnedFirst.items?.[0]?.videoTitle);

const pinByMember = await call("POST", `/${PUB}/posts/${post2.item?._id}/pin`, { as: U.ali });
check("an ordinary member cannot pin", pinByMember._http === 403);

const removeOthers = await call("DELETE", `/${PUB}/posts/${post2.item?._id}`, { as: U.ali });
check("a member cannot remove someone else's post", removeOthers._http === 403);

const removeOwn = await call("DELETE", `/${PUB}/posts/${post2.item?._id}`, { as: U.nadia });
check("an author can withdraw their own post", removeOwn.success === true);

const feedAfterRemove = await call("GET", `/${PUB}/feed`, { as: U.ali });
check("a withdrawn post leaves the feed",
  !(feedAfterRemove.items || []).some((i) => i._id === post2.item?._id));

const postToWrongGroup = await call("POST", `/${PUB}/posts/${queued.item?._id}/approve`, { as: U.layla });
check("a post cannot be moderated from another group", postToWrongGroup._http === 404);

/* ================================================================== */
section("6. Group insights");

const ins = await call("GET", `/${PUB}/insights`, { as: U.layla, query: { days: 30 } });
check("insights returns headline numbers", ins.success === true && ins.members?.total === 5, `members.total=${ins.members?.total}`);
check("joins counted in the window", ins.members?.joined?.value >= 4, `got ${ins.members?.joined?.value}`);
check("net growth reported", typeof ins.members?.net === "number");
check("post count reported", ins.posts?.value >= 1, `got ${ins.posts?.value}`);
check("active share is a percentage", ins.members?.activeShare >= 0 && ins.members?.activeShare <= 100);
check("engagement block present", ins.engagement?.total !== undefined);
check("per-post engagement computed", typeof ins.engagement?.perPost === "number");

const insByMember = await call("GET", `/${PUB}/insights`, { as: U.ali });
check("an ordinary member cannot read insights", insByMember._http === 403);

const insByMod = await call("GET", `/${PUB}/insights`, { as: U.yusuf });
check("a moderator can read insights", insByMod.success === true);

const growth = await call("GET", `/${PUB}/insights/growth`, { as: U.layla, query: { days: 7 } });
check("growth series has one point per day", (growth.series || []).length === 7, `got ${growth.series?.length}`);
check("growth series carries a running total", growth.series?.[6]?.total >= 4, `got ${growth.series?.[6]?.total}`);
check("today's joins are on the series", growth.series?.[6]?.joined >= 4, `got ${growth.series?.[6]?.joined}`);

const contrib = await call("GET", `/${PUB}/insights/contributors`, { as: U.layla });
check("top contributors ranks the poster", contrib.contributors?.[0]?.posts >= 1);
check("contributor rows carry the user", !!contrib.contributors?.[0]?.user?.name);
check("contributor rows say whether they're still a member",
  contrib.contributors?.[0]?.stillMember === true);

const top = await call("GET", `/${PUB}/insights/top-posts`, { as: U.layla });
check("top posts returns ranked posts", (top.posts || []).length >= 1);
check("top posts carry a rank", top.posts?.[0]?.rank === 1);

const pendingInInsights = await call("GET", `/${PRIV}/insights`, { as: U.layla });
check("insights reports the review backlog", pendingInInsights.posts?.pendingReview === 0,
  `got ${pendingInInsights.posts?.pendingReview}`);

/* ================================================================== */
section("7. Removal, bans and ownership");

const banned = await call("POST", `/${PUB}/members/${U.ali}/remove`, {
  as: U.omar, body: { ban: true, note: "Rule 1", removePosts: true },
});
check("an admin can ban a member", banned.success === true);
check("banning with removePosts pulls their posts", banned.hiddenPosts >= 1, `got ${banned.hiddenPosts}`);

const bannedSees = await call("GET", `/${PUB}`, { as: U.ali });
check("a banned member is told, not shown an empty group", bannedSees._http === 403);

const bannedPosts = await call("POST", `/${PUB}/posts`, { as: U.ali, body: { caption: "let me back in" } });
check("a banned member cannot post", bannedPosts._http === 403);

const bannedRejoins = await call("POST", `/${PUB}/join`, { as: U.ali });
check("a banned member cannot rejoin", bannedRejoins._http === 403);

const banList = await call("GET", `/${PUB}/banned`, { as: U.layla });
check("the ban list shows the reason", banList.banned?.[0]?.reason === "Rule 1");

const banListToMod = await call("GET", `/${PUB}/banned`, { as: U.yusuf });
check("a moderator cannot read the ban list", banListToMod._http === 403);

const unbanned = await call("POST", `/${PUB}/members/${U.ali}/unban`, { as: U.layla });
check("an admin can lift a ban", unbanned.success === true);

const rejoin = await call("POST", `/${PUB}/join`, { as: U.ali });
check("after an unban they can join again", rejoin.success === true);

const modRemovesMember = await call("POST", `/${PUB}/members/${U.ali}/remove`, { as: U.yusuf });
check("a moderator can remove an ordinary member", modRemovesMember.success === true);

const removeSelf = await call("POST", `/${PUB}/members/${U.omar}/remove`, { as: U.omar });
check("remove cannot be used on yourself", removeSelf._http === 400);

const memberLeaves = await call("POST", `/${PUB}/leave`, { as: U.nadia });
check("an ordinary member can leave", memberLeaves.success === true);

const transferToOutsider = await call("POST", `/${PUB}/transfer-ownership`, { as: U.layla, body: { newOwnerId: U.sara } });
check("ownership cannot pass to a non-member", transferToOutsider._http === 404);

const transferByAdmin = await call("POST", `/${PUB}/transfer-ownership`, { as: U.omar, body: { newOwnerId: U.yusuf } });
check("an admin cannot transfer ownership", transferByAdmin._http === 403);

const transferred = await call("POST", `/${PUB}/transfer-ownership`, { as: U.layla, body: { newOwnerId: U.omar } });
check("the owner can transfer ownership", transferred.success === true);

const afterTransfer = await call("GET", `/${PUB}`, { as: U.omar });
check("the new owner holds the owner role", afterTransfer.group?.myRole === "owner");

const oldOwner = await call("GET", `/${PUB}`, { as: U.layla });
check("the outgoing owner stays as an admin", oldOwner.group?.myRole === "admin");

const oldOwnerDeletes = await call("DELETE", `/${PUB}`, { as: U.layla });
check("the outgoing owner can no longer delete the group", oldOwnerDeletes._http === 403);

/* ================================================================== */
section("8. Settings, soft delete and restore");

const setPolicy = await call("PATCH", `/${PUB}/settings`, { as: U.omar, body: { postPolicy: "admins" } });
check("post policy can be changed", setPolicy.settings?.postPolicy === "admins");

const memberPostsUnderAdminsOnly = await call("POST", `/${PUB}/posts`, { as: U.yusuf, body: { caption: "mod post" } });
check("a moderator still posts under an admins-only policy", memberPostsUnderAdminsOnly.status === "approved");
if (memberPostsUnderAdminsOnly.item?._id) created.posts.push(memberPostsUnderAdminsOnly.item._id);

const privateDropsReview = await call("PATCH", `/${PRIV}/settings`, { as: U.layla, body: { approveMembers: false } });
check("a private group cannot turn off join review", privateDropsReview._http === 400);

const badPolicy = await call("PATCH", `/${PUB}/settings`, { as: U.omar, body: { postPolicy: "whoever" } });
check("an unknown post policy is rejected", badPolicy._http === 400);

const deleted = await call("DELETE", `/${PUB}`, { as: U.omar });
check("the owner can delete the group", deleted.success === true);

const afterDelete = await call("GET", `/${PUB}`, { as: U.omar });
check("a deleted group reads as 404", afterDelete._http === 404);

const restored = await call("POST", `/${PUB}/restore`, { as: U.omar });
check("the owner can restore a deleted group", restored.success === true);

const afterRestore = await call("GET", `/${PUB}`, { as: U.omar });
check("a restored group is readable again", afterRestore.success === true);

/* ================================================================== */
section("Cleanup");

const groupIds = created.groups.filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));
const delPosts = await db.collection("reels").deleteMany({ group: { $in: groupIds } });
const delMembers = await db.collection("groupmembers").deleteMany({ group: { $in: groupIds } });
const delGroups = await db.collection("socialgroups").deleteMany({ _id: { $in: groupIds } });
const delNotifs = await db.collection("notifications").deleteMany({ group: { $in: groupIds } });

console.log(`  removed ${delGroups.deletedCount} groups, ${delMembers.deletedCount} memberships, ` +
            `${delPosts.deletedCount} posts, ${delNotifs.deletedCount} notifications`);

const leftovers = await db.collection("reels").countDocuments({ group: { $ne: null } });
check("no group posts left in the database", leftovers === 0, `${leftovers} remain`);
const leftMembers = await db.collection("groupmembers").countDocuments({});
check("no membership rows left in the database", leftMembers === 0, `${leftMembers} remain`);

await mongoose.disconnect();

/* ================================================================== */
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
