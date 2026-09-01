/*
  What a visitor may see, and what they may do about it.

  Four ways a wall can be shut, and they are not the same thing:

    private    the account exists and is worth asking to follow
    requested  you already asked; asking again is not an action
    suspended  a moderator closed it
    blocked    one of you blocked the other

  Only the first two carry an invitation. Telling a blocked visitor to "send a
  follow request" would be worse than saying nothing -- it implies a door that
  is not there.

  Drives a running server, asserts the failure paths, and restores every user
  it touches. Run from the backend directory:

    node scripts/test-privacy-wall.mjs
    BASE=http://localhost:5051/apis node scripts/test-privacy-wall.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis";

/* Sara is the private one in the demo data. Hassan follows nobody relevant,
   which makes him the outsider every check here needs. */
const U = {
  sara: "6a830332316418fdbc512053",
  hassan: "6a830332316418fdbc512058",
  omar: "6a830332316418fdbc512052",   // already follows Sara
  layla: "6a830332316418fdbc512051",
};

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
};
const section = (t) => console.log(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

const wall = async (userid, viewerId) => {
  const url = new URL(BASE + "/postreel/wall");
  url.searchParams.set("userid", userid);
  if (viewerId) url.searchParams.set("viewerId", viewerId);
  url.searchParams.set("limit", "5");
  const res = await fetch(url);
  let j = {}; try { j = await res.json(); } catch {}
  return { ...j, _http: res.status };
};

const post = async (path, body) => {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let j = {}; try { j = await res.json(); } catch {}
  return { ...j, _http: res.status };
};

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);
const users = db.collection("users");

const snap = {};
const remember = async (id, fields) => {
  const doc = await users.findOne({ _id: oid(id) }, { projection: Object.fromEntries(fields.map(f => [f, 1])) });
  snap[id] = {};
  for (const f of fields) snap[id][f] = doc?.[f];
};
const restore = async () => {
  for (const [id, fields] of Object.entries(snap)) {
    const set = {}, unset = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) unset[k] = ""; else set[k] = v;
    }
    const u = {};
    if (Object.keys(set).length) u.$set = set;
    if (Object.keys(unset).length) u.$unset = unset;
    if (Object.keys(u).length) await users.updateOne({ _id: oid(id) }, u);
  }
};

try {
  await remember(U.sara, ["privacy", "followRequests", "followers", "accountStatus"]);
  await remember(U.hassan, ["sentFollowRequests", "following", "blockedUsers", "accountStatus"]);
  await remember(U.layla, ["accountStatus", "blockedUsers"]);

  /* ================================================================ */
  section("1. A private wall is locked, named, and asks to be followed");
  /* ================================================================ */

  await users.updateOne({ _id: oid(U.sara) }, { $set: { privacy: "private" } });
  await users.updateOne({ _id: oid(U.sara) }, { $pull: { followRequests: oid(U.hassan) } });
  await users.updateOne({ _id: oid(U.hassan) }, { $pull: { sentFollowRequests: oid(U.sara) } });

  let r = await wall(U.sara, U.hassan);
  check("a private wall answers 200, not an error", r._http === 200, `got ${r._http}`);
  check("it is locked", r.locked === true);
  check("the reason is 'private'", r.reason === "private", String(r.reason));
  check("no posts leak", (r.posts || []).length === 0);
  check("the visitor still sees who it is", !!r.author?.name, JSON.stringify(r.author));
  check("...and the follower counts", typeof r.author?.followersCount === "number");
  check("viewerState is 'none' before asking", r.author?.viewerState === "none", String(r.author?.viewerState));
  check("it is flagged private", r.author?.isPrivate === true);

  /* ================================================================ */
  section("2. Following a private account sends a request");
  /* ================================================================ */

  r = await post("/profile/follow", { userId: U.hassan, targetId: U.sara });
  check("follow answers 'requested', not 'following'", r.status === "requested", JSON.stringify(r));

  const saraDoc = await users.findOne({ _id: oid(U.sara) }, { projection: { followers: 1, followRequests: 1 } });
  check(
    "the request is recorded",
    (saraDoc.followRequests || []).some((x) => String(x) === U.hassan)
  );
  check(
    "and they are NOT a follower yet",
    !(saraDoc.followers || []).some((x) => String(x) === U.hassan),
    "approval was bypassed"
  );

  r = await wall(U.sara, U.hassan);
  check("the wall now reports 'requested'", r.author?.viewerState === "requested", String(r.author?.viewerState));
  check("and is still locked", r.locked === true);

  r = await post("/profile/follow", { userId: U.hassan, targetId: U.sara });
  check("asking twice does not queue a second request", r.status === "requested", JSON.stringify(r));

  /* ================================================================ */
  section("3. An approved follower sees the wall");
  /* ================================================================ */

  r = await wall(U.sara, U.omar);
  check("someone Sara already accepted is let in", r.locked === false, JSON.stringify(r.reason));
  check("and reads as 'following'", r.author?.viewerState === "following", String(r.author?.viewerState));

  /* ================================================================ */
  section("4. Blocking");
  /* ================================================================ */

  await users.updateOne({ _id: oid(U.hassan) }, { $addToSet: { blockedUsers: oid(U.layla) } });
  r = await wall(U.layla, U.hassan);
  check("a blocked pair gets 403", r._http === 403, `got ${r._http}`);
  check("no posts come back", (r.posts || []).length === 0);
  await users.updateOne({ _id: oid(U.hassan) }, { $pull: { blockedUsers: oid(U.layla) } });

  /* ================================================================ */
  section("5. Suspended and deleted accounts");
  /* ================================================================ */

  await users.updateOne({ _id: oid(U.layla) }, { $set: { accountStatus: "banned" } });
  r = await wall(U.layla, U.hassan);
  check("a suspended account's wall is refused", r._http === 403, `got ${r._http}`);
  check("the reason is 'suspended'", r.reason === "suspended", String(r.reason));
  check("no posts survive the suspension", (r.posts || []).length === 0);

  r = await wall(U.layla, U.layla);
  check("the author still sees their own suspended wall", r._http === 200 && r.locked === false, `got ${r._http}`);

  r = await post("/profile/follow", { userId: U.hassan, targetId: U.layla });
  check("you cannot follow a suspended account", r._http === 403, `got ${r._http}`);

  await users.updateOne({ _id: oid(U.layla) }, { $set: { accountStatus: "deleted" } });
  r = await wall(U.layla, U.hassan);
  check("a deleted account's wall is refused too", r._http === 403, `got ${r._http}`);
  check("the reason is 'deleted'", r.reason === "deleted", String(r.reason));

} catch (err) {
  failed++; failures.push("suite crashed");
  console.error("\nSUITE CRASHED:", err);
} finally {
  section("Cleanup");
  await restore();
  const sara = await users.findOne({ _id: oid(U.sara) }, { projection: { privacy: 1, followRequests: 1 } });
  const layla = await users.findOne({ _id: oid(U.layla) }, { projection: { accountStatus: 1 } });
  check("Sara's privacy restored", sara?.privacy === snap[U.sara]?.privacy, String(sara?.privacy));
  check(
    "Sara's follow requests restored",
    (sara?.followRequests || []).length === (snap[U.sara]?.followRequests || []).length
  );
  check("Layla's account status restored", layla?.accountStatus === snap[U.layla]?.accountStatus, String(layla?.accountStatus));
  await mongoose.disconnect();

  console.log(`\n${"=".repeat(64)}`);
  console.log(`  ${pass} passed, ${failed} failed`);
  if (failures.length) console.log(`  failing: ${failures.join(", ")}`);
  console.log("=".repeat(64));
  process.exitCode = failed ? 1 : 0;
}
