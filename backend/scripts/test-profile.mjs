/*
  End-to-end HTTP suite for the four "marked complete, still carrying days"
  rows: Bio/Gender/Location/Birthday, Interests & Hobbies, Follow/Unfollow &
  Friends (/apis/profile), and Group Chat (/apis/messaging/groups).

  Drives every endpoint against the running server, asserts the failure paths
  as well as the happy ones, and restores the database afterwards — including
  every demo user's original profile fields and follow graph, which this suite
  necessarily mutates.

  Run from the backend directory:  node scripts/test-profile.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis";

/* Demo fixtures. Traits that matter here:
     Sara  — private account; her connection lists are followers-only
     Omar  — already follows Layla, so a follow of Layla is a no-op
     Nadia — business account
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

const call = async (method, path, { as, body, query } = {}) => {
  const url = new URL(BASE + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: !["GET", "HEAD"].includes(method) && (body || as)
      ? JSON.stringify({ userId: as, ...(body || {}) })
      : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};
const get = (p, o) => call("GET", p, o);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* ================================================================== */
/* Fixtures — snapshot everything this suite will mutate               */
/* ================================================================== */

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);

const TOUCHED = Object.values(U).map(oid);
const SNAP_FIELDS = {
  name: 1, bio: 1, gender: 1, nationality: 1, dateofbirth: 1, interest: 1,
  interests: 1, city: 1, country: 1, location: 1, followers: 1, following: 1,
  followRequests: 1, sentFollowRequests: 1, firstname: 1, lastname: 1,
};
const snapshot = await db.collection("users")
  .find({ _id: { $in: TOUCHED } }).project(SNAP_FIELDS).toArray();

const restore = async () => {
  for (const u of snapshot) {
    const { _id, ...fields } = u;
    const set = {};
    const unset = {};
    for (const k of Object.keys(SNAP_FIELDS)) {
      if (fields[k] === undefined) unset[k] = "";
      else set[k] = fields[k];
    }
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    await db.collection("users").updateOne({ _id }, update);
  }
};

const TEST_GROUP = "zzProbe Chat Group";
const sweep = async () => {
  const stale = await db.collection("groupchats").find({ groupName: /^zzProbe/ }).toArray();
  if (stale.length) {
    const ids = stale.map((g) => g._id);
    await db.collection("conversations").deleteMany({ group: { $in: ids } });
    await db.collection("groupchats").deleteMany({ _id: { $in: ids } });
  }
  return stale.length;
};
const swept = await sweep();
if (swept) console.log(`  (swept ${swept} leftover groups from a previous run)`);

const baseline = {
  users: await db.collection("users").countDocuments({}),
  groups: await db.collection("groupchats").countDocuments({}),
  convos: await db.collection("conversations").countDocuments({}),
};
console.log(`  snapshotted ${snapshot.length} demo profiles\n`);

/* ================================================================== */
section("1. Bio, gender, location & birthday");

const me = await get("/profile/me", { as: U.omar });
check("own profile returns", me.success === true && !!me.profile?.name);
check("own profile reports completeness", typeof me.profile?.completeness?.percent === "number");
check("own profile includes the email", !!me.profile?.email);

const noUser = await get("/profile/me");
check("own profile without a userId is rejected", noUser._http === 400);

const bio = await call("PATCH", "/profile/me", { as: U.omar, body: { bio: "Chasing light in the old town." } });
check("bio can be updated", bio.profile?.bio === "Chasing light in the old town.");

const longBio = await call("PATCH", "/profile/me", { as: U.omar, body: { bio: "x".repeat(301) } });
check("an over-long bio is rejected", longBio._http === 400);

const gender = await call("PATCH", "/profile/me", { as: U.omar, body: { gender: "Male" } });
check("gender is folded onto the suggested spelling", gender.profile?.gender === "male", gender.profile?.gender);

const genderFree = await call("PATCH", "/profile/me", { as: U.omar, body: { gender: "agender" } });
check("a gender outside the list is kept verbatim", genderFree.profile?.gender === "agender");

const genderLong = await call("PATCH", "/profile/me", { as: U.omar, body: { gender: "y".repeat(41) } });
check("an over-long gender is rejected", genderLong._http === 400);

const genders = await get("/profile/genders");
check("the gender suggestion list is served",
  (genders.options || []).includes("non-binary") && genders.freeText === true);

/* birthday */
const dob = await call("PATCH", "/profile/me", { as: U.omar, body: { dateofbirth: "1996-04-17" } });
check("a valid birthday is accepted", dob.success === true && dob.age > 0, JSON.stringify(dob).slice(0, 120));
check("age is derived from the birthday", dob.profile?.age === dob.age);

const dobFormat = await call("PATCH", "/profile/me", { as: U.omar, body: { dateofbirth: "17 April 1996" } });
check("a differently-formatted date is normalised to ISO",
  dobFormat.profile?.dateofbirth === "1996-04-17", dobFormat.profile?.dateofbirth);

const dobJunk = await call("PATCH", "/profile/me", { as: U.omar, body: { dateofbirth: "not a date" } });
check("junk in the birthday field is rejected", dobJunk._http === 400);

const dobFuture = await call("PATCH", "/profile/me", { as: U.omar, body: { dateofbirth: "2099-01-01" } });
check("a future birthday is rejected", dobFuture._http === 400);

const dobChild = await call("PATCH", "/profile/me", {
  as: U.omar, body: { dateofbirth: new Date(Date.now() - 10 * 365 * 864e5).toISOString().slice(0, 10) },
});
check("an under-13 birthday is rejected", dobChild._http === 400, dobChild.message);

const dobAncient = await call("PATCH", "/profile/me", { as: U.omar, body: { dateofbirth: "1850-01-01" } });
check("an implausibly old birthday is rejected", dobAncient._http === 400);

/* location */
const loc = await call("PATCH", "/profile/me", {
  as: U.omar, body: { city: "Dubai", country: "UAE", lng: 55.2708, lat: 25.2048 },
});
check("city and country are stored", loc.profile?.city === "Dubai" && loc.profile?.country === "UAE");
check("coordinates are stored", loc.profile?.location?.lat === 25.2048);

const locZero = await call("PATCH", "/profile/me", { as: U.omar, body: { lng: 0, lat: 0 } });
check("[0,0] is refused as a location", locZero._http === 400, locZero.message);

const locBad = await call("PATCH", "/profile/me", { as: U.omar, body: { lng: 999, lat: 25 } });
check("out-of-range coordinates are rejected", locBad._http === 400);

const locClear = await call("PATCH", "/profile/me", { as: U.omar, body: { lng: null, lat: null } });
check("coordinates can be cleared", locClear.profile?.location === null);

/* partial updates must not blank other fields */
const before = await get("/profile/me", { as: U.omar });
await call("PATCH", "/profile/me", { as: U.omar, body: { nationality: "Emirati" } });
const after = await get("/profile/me", { as: U.omar });
check("a partial update leaves other fields alone",
  after.profile?.bio === before.profile?.bio && after.profile?.city === before.profile?.city);
check("nationality was still applied", after.profile?.nationality === "Emirati");

const nothing = await call("PATCH", "/profile/me", { as: U.omar, body: {} });
check("an empty update is rejected", nothing._http === 400);

const emptyName = await call("PATCH", "/profile/me", { as: U.omar, body: { name: "   " } });
check("a blank name is rejected", emptyName._http === 400);

/* someone else's profile */
const other = await get(`/profile/${U.layla}`, { as: U.omar });
check("another profile is readable", other.profile?._id === U.layla);
check("their exact birth date is never exposed", other.profile?.dateofbirth === undefined);
check("their age is exposed instead", "age" in (other.profile || {}));
check("their email is not exposed", other.profile?.email === undefined);
check("the viewer's relationship is reported", typeof other.profile?.isFollowing === "boolean");

const selfViaId = await get(`/profile/${U.omar}`, { as: U.omar });
check("viewing your own profile by id includes the birth date",
  selfViaId.profile?.dateofbirth !== undefined && selfViaId.profile?.isSelf === true);

const missingProfile = await get("/profile/6a830332316418fdbc5120ff", { as: U.omar });
check("an unknown profile is a 404", missingProfile._http === 404);

/* ================================================================== */
section("2. Interests & hobbies");

const cat = await get("/profile/interests/catalogue");
check("the catalogue is grouped by category", (cat.categories || []).length >= 5);
check("the catalogue reports its cap", cat.maxSelectable > 0);
check("free text is allowed alongside it", cat.freeText === true);

const setInt = await call("PUT", "/profile/interests", {
  as: U.omar, body: { interests: ["photography", "Coffee", "desert"] },
});
check("interests can be set", (setInt.interests || []).length === 3, JSON.stringify(setInt).slice(0, 140));
check("interests are slugified", (setInt.interests || []).some((i) => i.slug === "coffee"));
check("catalogue membership is reported",
  (setInt.interests || []).find((i) => i.slug === "photography")?.inCatalogue === true);
check("catalogue entries carry their category",
  (setInt.interests || []).find((i) => i.slug === "photography")?.category === "Creative");

const freeText = await call("PUT", "/profile/interests", {
  as: U.omar, body: { interests: ["photography", "Falconry & Hawks"] },
});
check("free-text interests are accepted and slugified",
  (freeText.interests || []).some((i) => i.slug === "falconry-hawks"),
  JSON.stringify(freeText.interests));
check("free text is flagged as outside the catalogue",
  (freeText.interests || []).find((i) => i.slug === "falconry-hawks")?.inCatalogue === false);

const dupes = await call("PUT", "/profile/interests", {
  as: U.omar, body: { interests: ["coffee", "Coffee", "COFFEE", ""] },
});
check("duplicates and blanks are collapsed", (dupes.interests || []).length === 1);

const tooMany = await call("PUT", "/profile/interests", {
  as: U.omar, body: { interests: Array.from({ length: 21 }, (_, i) => `interest${i}`) },
});
check("more than the cap is rejected", tooMany._http === 400);

const notArray = await call("PUT", "/profile/interests", { as: U.omar, body: { interests: "coffee" } });
check("a non-list is rejected", notArray._http === 400);

const cleared = await call("PUT", "/profile/interests", { as: U.omar, body: { interests: [] } });
check("interests can be cleared", (cleared.interests || []).length === 0);

await call("PUT", "/profile/interests", { as: U.omar, body: { interests: ["photography", "coffee"] } });
const mine = await get("/profile/interests", { as: U.omar });
check("interests read back", (mine.interests || []).length === 2);

/* the legacy single-value field must stay in step */
const legacy = await db.collection("users").findOne({ _id: oid(U.omar) }, { projection: { interest: 1 } });
check("the legacy `interest` string is kept in sync", legacy.interest === "photography", legacy.interest);

/* people who share interests */
await call("PUT", "/profile/interests", { as: U.hassan, body: { interests: ["photography", "gaming"] } });
const similar = await get("/profile/interests/similar", { as: U.omar });
check("people with shared interests are found",
  (similar.matches || []).some((m) => m._id === U.hassan),
  JSON.stringify((similar.matches || []).map((m) => m.name)));
check("the shared interests are named",
  (similar.matches || []).find((m) => m._id === U.hassan)?.sharedInterests?.includes("photography"));

const noInterests = await get("/profile/interests/similar", { as: U.mariam });
check("no interests means no matches, not an error",
  noInterests.success === true && (noInterests.matches || []).length === 0);

/* ================================================================== */
section("3. Follow / unfollow & friends");

const rel0 = await get(`/profile/${U.hassan}/relationship`, { as: U.mariam });
check("relationship reports not-following", rel0.isFollowing === false && rel0.isFriend === false);

const f1 = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: U.hassan } });
check("following works", f1.status === "following", JSON.stringify(f1));

const f1again = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: U.hassan } });
check("following twice is reported, not duplicated", f1again.status === "following");

const self = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: U.mariam } });
check("you can't follow yourself", self._http === 400);

const noTarget = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: "nope" } });
check("a malformed target is rejected", noTarget._http === 400);

const gone = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: "6a830332316418fdbc5120ff" } });
check("following an unknown user is a 404", gone._http === 404);

/* private account gets a request rather than a follow */
const priv = await call("POST", "/profile/follow", { as: U.mariam, body: { targetId: U.sara } });
check("a private account returns a pending request", priv.status === "requested", JSON.stringify(priv));

/* mutual follow makes a friendship */
const f2 = await call("POST", "/profile/follow", { as: U.hassan, body: { targetId: U.mariam } });
check("the reciprocal follow works", f2.status === "following");

const rel1 = await get(`/profile/${U.hassan}/relationship`, { as: U.mariam });
check("a mutual follow reads as a friendship", rel1.isFriend === true, JSON.stringify(rel1));
check("followsYou is reported", rel1.followsYou === true);

const friendList = await get("/profile/friends", { as: U.mariam });
check("the friends list contains the mutual follow",
  (friendList.users || []).some((u) => u._id === U.hassan),
  JSON.stringify((friendList.users || []).map((u) => u.name)));
check("friends are flagged as friends",
  (friendList.users || []).find((u) => u._id === U.hassan)?.isFriend === true);

const counts = await get("/profile/counts", { as: U.mariam });
check("counts report followers, following and friends",
  counts.friends >= 1 && counts.following >= 1, JSON.stringify(counts));

const followersList = await get("/profile/followers", { as: U.mariam });
check("the followers list paginates", typeof followersList.total === "number" && Array.isArray(followersList.users));
check("follower rows carry the viewer's own relationship",
  followersList.users?.every((u) => "isFollowing" in u));

/* mutual friends between two accounts */
await call("POST", "/profile/follow", { as: U.yusuf, body: { targetId: U.hassan } });
await call("POST", "/profile/follow", { as: U.hassan, body: { targetId: U.yusuf } });
const mf = await get(`/profile/${U.yusuf}/mutual-friends`, { as: U.mariam });
check("mutual friends finds the shared friend",
  (mf.friends || []).some((u) => u._id === U.hassan),
  JSON.stringify((mf.friends || []).map((u) => u.name)));

const mfSelf = await get(`/profile/${U.mariam}/mutual-friends`, { as: U.mariam });
check("mutual friends with yourself is rejected", mfSelf._http === 400);

/* a private account's connection lists are followers-only */
const privList = await get(`/profile/${U.sara}/followers`, { as: U.hassan });
check("a private account's followers are hidden from a non-follower", privList._http === 403,
  JSON.stringify(privList).slice(0, 100));

const ownList = await get(`/profile/${U.sara}/followers`, { as: U.sara });
check("...but the owner can see their own", ownList.success === true);

/* remove a follower */
const rm = await call("DELETE", `/profile/followers/${U.hassan}`, { as: U.mariam });
check("a follower can be removed", rm.success === true, JSON.stringify(rm));

const rmAgain = await call("DELETE", `/profile/followers/${U.hassan}`, { as: U.mariam });
check("removing a non-follower is a 404", rmAgain._http === 404);

const relAfterRemove = await get(`/profile/${U.hassan}/relationship`, { as: U.mariam });
check("removing a follower ends the friendship", relAfterRemove.isFriend === false);

/* unfollow */
const uf = await call("POST", "/profile/unfollow", { as: U.mariam, body: { targetId: U.hassan } });
check("unfollowing works", uf.status === "not following");

const ufAgain = await call("POST", "/profile/unfollow", { as: U.mariam, body: { targetId: U.hassan } });
check("unfollowing twice is reported, not an error",
  ufAgain.success === true && /weren't following/.test(ufAgain.message || ""), ufAgain.message);

/* unfollowing also withdraws a pending request */
const relSara = await get(`/profile/${U.sara}/relationship`, { as: U.mariam });
check("the pending request to the private account is still open", relSara.requested === true);
await call("POST", "/profile/unfollow", { as: U.mariam, body: { targetId: U.sara } });
const relSara2 = await get(`/profile/${U.sara}/relationship`, { as: U.mariam });
check("unfollowing withdraws a pending follow request", relSara2.requested === false);

/* ================================================================== */
section("4. Group chat");

const noName = await call("POST", "/messaging/groups", { as: U.layla, body: { groupName: "  " } });
check("a group needs a name", noName._http === 400);

const grp = await call("POST", "/messaging/groups", {
  as: U.layla,
  body: { groupName: TEST_GROUP, description: "Probe run", members: [U.omar, U.ali] },
});
check("a group can be created", grp.success === true && !!grp.group?._id, JSON.stringify(grp).slice(0, 160));
const G = grp.group?._id;

check("the creator is a member", grp.group?.memberCount === 3, `got ${grp.group?.memberCount}`);
check("the creator is an admin", grp.group?.isAdmin === true && grp.group?.isFounder === true);
check("a conversation is created with the group", !!grp.group?.conversationId);

/* the bug that mattered: groups you were added to must be listed */
const laylaGroups = await get("/messaging/groups", { as: U.layla });
check("the founder sees the group", (laylaGroups.groups || []).some((g) => g._id === G));

const omarGroups = await get("/messaging/groups", { as: U.omar });
check("a member who did NOT create it also sees it",
  (omarGroups.groups || []).some((g) => g._id === G),
  JSON.stringify((omarGroups.groups || []).map((g) => g.groupName)));

const outsiderGroups = await get("/messaging/groups", { as: U.nadia });
check("a non-member does not see it", !(outsiderGroups.groups || []).some((g) => g._id === G));

/* member info must actually be populated */
const members = await get(`/messaging/groups/${G}/members`, { as: U.omar });
check("members are listed with real names",
  (members.members || []).every((m) => typeof m.name === "string" && m.name.length > 0),
  JSON.stringify((members.members || []).map((m) => m.name)));
check("admin flags are reported per member",
  (members.members || []).find((m) => m._id === U.layla)?.isAdmin === true);

const detail = await get(`/messaging/groups/${G}`, { as: U.omar });
check("group detail returns members and admins",
  (detail.group?.members || []).length === 3 && (detail.group?.admins || []).length === 1);

const outsiderDetail = await get(`/messaging/groups/${G}`, { as: U.nadia });
check("a non-member cannot read the group", outsiderDetail._http === 403);

/* conversation handoff */
const convo = await get(`/messaging/groups/${G}/conversation`, { as: U.omar });
check("the conversation id is served", !!convo.conversationId);
check("send permission is reported", convo.canSend === true);
check("the client is told where messages live", !!convo.endpoints?.messages);

/* messages go through the shipped messaging endpoints */
const msgs = await get(`/messaging/conversations/${convo.conversationId}/messages`, { as: U.omar });
check("group messages are readable through the messaging module",
  msgs.success === true, JSON.stringify(msgs).slice(0, 140));

/* management */
const rename = await call("PATCH", `/messaging/groups/${G}`, {
  as: U.layla, body: { groupName: `${TEST_GROUP} renamed` },
});
check("an admin can rename the group", rename.group?.groupName === `${TEST_GROUP} renamed`);

const renameByMember = await call("PATCH", `/messaging/groups/${G}`, {
  as: U.omar, body: { groupName: "hijacked" },
});
check("a member cannot rename it when editing is admin-only", renameByMember._http === 403);

const permByMember = await call("PATCH", `/messaging/groups/${G}`, {
  as: U.omar, body: { groupPermission: "all_members" },
});
check("a member cannot change permissions", permByMember._http === 403);

const badPerm = await call("PATCH", `/messaging/groups/${G}`, {
  as: U.layla, body: { groupPermission: "everyone" },
});
check("an unknown permission value is rejected", badPerm._http === 400);

const add = await call("POST", `/messaging/groups/${G}/members`, {
  as: U.layla, body: { memberIds: [U.yusuf, U.omar, "6a830332316418fdbc5120ff"] },
});
check("members can be added", (add.added || []).includes(U.yusuf));
check("an existing member is reported, not re-added", (add.alreadyMembers || []).includes(U.omar));
check("an unknown user is reported as not found", (add.notFound || []).length === 1);

const promote = await call("POST", `/messaging/groups/${G}/members/${U.omar}/admin`, { as: U.layla });
check("a member can be promoted to admin", promote.isAdmin === true);

const nowAdminRename = await call("PATCH", `/messaging/groups/${G}`, {
  as: U.omar, body: { description: "Now I can edit" },
});
check("the new admin can now edit", nowAdminRename.success === true);

const demoteFounder = await call("POST", `/messaging/groups/${G}/members/${U.layla}/admin`, {
  as: U.omar, body: { admin: false },
});
check("the founder cannot be demoted", demoteFounder._http === 403);

const removeFounder = await call("DELETE", `/messaging/groups/${G}/members/${U.layla}`, { as: U.omar });
check("the founder cannot be removed", removeFounder._http === 403);

const removeSelf = await call("DELETE", `/messaging/groups/${G}/members/${U.omar}`, { as: U.omar });
check("remove cannot be used on yourself", removeSelf._http === 400);

const removeOk = await call("DELETE", `/messaging/groups/${G}/members/${U.yusuf}`, { as: U.omar });
check("an admin can remove a member", removeOk.success === true);

const removeByMember = await call("DELETE", `/messaging/groups/${G}/members/${U.ali}`, { as: U.nadia });
check("a non-member cannot remove anyone", removeByMember._http === 403);

const leave = await call("POST", `/messaging/groups/${G}/leave`, { as: U.ali });
check("a member can leave", leave.success === true);

const founderLeaves = await call("POST", `/messaging/groups/${G}/leave`, { as: U.layla });
check("the founder cannot simply leave", founderLeaves._http === 400);

const transferOut = await call("POST", `/messaging/groups/${G}/transfer`, {
  as: U.layla, body: { newOwnerId: U.nadia },
});
check("the group cannot be transferred to a non-member", transferOut._http === 404);

const transfer = await call("POST", `/messaging/groups/${G}/transfer`, {
  as: U.layla, body: { newOwnerId: U.omar },
});
check("the founder can transfer the group", transfer.success === true);

const afterTransfer = await get(`/messaging/groups/${G}`, { as: U.omar });
check("the new owner is the founder", afterTransfer.group?.isFounder === true);

const nowLayla = await call("POST", `/messaging/groups/${G}/leave`, { as: U.layla });
check("the previous founder can now leave", nowLayla.success === true);

const delByMember = await call("DELETE", `/messaging/groups/${G}`, { as: U.ali });
check("a non-member cannot delete the group", delByMember._http === 403);

const del = await call("DELETE", `/messaging/groups/${G}`, { as: U.omar });
check("the founder can delete the group", del.success === true);

const afterDelete = await get(`/messaging/groups/${G}`, { as: U.omar });
check("a deleted group reads as 404", afterDelete._http === 404);

const badId = await get("/messaging/groups/not-an-id", { as: U.omar });
check("a malformed group id is a 400", badId._http === 400);

/* ================================================================== */
section("Cleanup");

const groupIds = (await db.collection("groupchats").find({ groupName: /^zzProbe/ }).toArray()).map((g) => g._id);
const delConvos = await db.collection("conversations").deleteMany({ group: { $in: groupIds } });
const delGroups = await db.collection("groupchats").deleteMany({ _id: { $in: groupIds } });
await restore();

console.log(`  removed ${delGroups.deletedCount} groups and ${delConvos.deletedCount} conversations, ` +
            `restored ${snapshot.length} profiles`);

const after2 = {
  users: await db.collection("users").countDocuments({}),
  groups: await db.collection("groupchats").countDocuments({}),
  convos: await db.collection("conversations").countDocuments({}),
};
check("users back to baseline", after2.users === baseline.users);
check("group chats back to baseline", after2.groups === baseline.groups, `${baseline.groups} -> ${after2.groups}`);
check("conversations back to baseline", after2.convos === baseline.convos, `${baseline.convos} -> ${after2.convos}`);

/* the follow graph and every profile field must be exactly as found */
const restored = await db.collection("users")
  .find({ _id: { $in: TOUCHED } }).project(SNAP_FIELDS).toArray();
const norm = (rows) => JSON.stringify(
  rows.map((r) => Object.fromEntries(Object.entries(r).sort(([a], [b]) => a.localeCompare(b))))
      .sort((a, b) => String(a._id).localeCompare(String(b._id)))
);
check("every demo profile and follow edge is exactly as found",
  norm(restored) === norm(snapshot));

await mongoose.disconnect();

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
