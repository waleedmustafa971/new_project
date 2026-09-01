/*
  Replying to a comment, and liking a reply.

  Both were dead. `username` in these bodies is the caller and the app sends a
  user id -- the same id every other endpoint keys on -- but both handlers
  looked it up by *email*, so every request answered 404 "User not found".
  Only top-level comments worked, because addComments looks up by _id.

  The like also only ever went up: it $pushed unconditionally, so tapping twice
  recorded the same person twice and nothing could take it back.

  Drives a running server and cleans up after itself.

    node scripts/test-comment-actions.mjs
    BASE=http://localhost:5051/apis node scripts/test-comment-actions.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis";

const U = {
  layla: "6a830332316418fdbc512051",
  omar: "6a830332316418fdbc512052",
};

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
};
const section = (t) => console.log(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

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
const reels = db.collection("reels");

let postId = null;

try {
  /* A post of Layla's with one comment by Omar to act on. */
  const { insertedId } = await reels.insertOne({
    username: oid(U.layla),
    videoTitle: "comment-actions-fixture",
    videoUrl: "", posttype: "Post", audience: "everyone",
    likes: [], dislikes: [], favorites: [], shares: [], stars: [], sharepost: [],
    comments: [{ _id: new mongoose.Types.ObjectId(), username: oid(U.omar), message: "parent", timestamp: new Date(), likes: [], reply: [] }],
    status: "active", xtime: new Date(),
  });
  postId = insertedId;
  const doc = await reels.findOne({ _id: postId });
  const commentId = String(doc.comments[0]._id);

  /* ================================================================ */
  section("1. Replying to a comment");
  /* ================================================================ */

  let r = await post("/reel/addreply", {
    reelId: String(postId), commentId, username: U.layla, message: "a reply",
  });
  check("a reply is accepted when the caller is a user id", r._http === 200, `got ${r._http} ${JSON.stringify(r).slice(0,80)}`);

  let fresh = await reels.findOne({ _id: postId });
  check("the reply is stored", (fresh.comments[0].reply || []).length === 1, `${(fresh.comments[0].reply||[]).length}`);

  /* ================================================================ */
  section("2. Liking a comment");
  /* ================================================================ */

  r = await post("/reel/addcommentsylike", { reelId: String(postId), commentId, username: U.layla });
  check("a like is accepted", r._http === 200, `got ${r._http} ${JSON.stringify(r).slice(0,80)}`);
  check("it reports liked: true", r.liked === true, JSON.stringify(r));
  check("...and a count of 1", r.count === 1, String(r.count));

  fresh = await reels.findOne({ _id: postId });
  check("stored against the real user id",
    (fresh.comments[0].likes || []).some((l) => String(l.username) === U.layla),
    JSON.stringify(fresh.comments[0].likes));

  /* ================================================================ */
  section("3. Liking again takes it back");
  /* ================================================================ */

  r = await post("/reel/addcommentsylike", { reelId: String(postId), commentId, username: U.layla });
  check("the second tap unlikes", r.liked === false, JSON.stringify(r));
  check("the count returns to 0", r.count === 0, String(r.count));

  fresh = await reels.findOne({ _id: postId });
  check("no duplicate rows were left behind", (fresh.comments[0].likes || []).length === 0,
    `${(fresh.comments[0].likes||[]).length} left`);

  /* ================================================================ */
  section("4. Failure paths");
  /* ================================================================ */

  r = await post("/reel/addcommentsylike", {
    reelId: String(postId), commentId, username: "6a830332316418fdbc5120ff",
  });
  check("an unknown user is still refused", r._http === 404, `got ${r._http}`);

  r = await post("/reel/addcommentsylike", {
    reelId: String(postId), commentId: "6a830332316418fdbc5120ff", username: U.layla,
  });
  check("an unknown comment is refused", r._http === 404, `got ${r._http}`);

  /* An email still works: older rows really do carry one. */
  const layla = await db.collection("users").findOne({ _id: oid(U.layla) }, { projection: { email: 1 } });
  r = await post("/reel/addcommentsylike", { reelId: String(postId), commentId, username: layla.email });
  check("an email caller still resolves", r._http === 200 && r.liked === true, `got ${r._http}`);

} catch (err) {
  failed++; failures.push("suite crashed");
  console.error("\nSUITE CRASHED:", err);
} finally {
  section("Cleanup");
  if (postId) await reels.deleteOne({ _id: postId });
  const left = await reels.countDocuments({ videoTitle: "comment-actions-fixture" });
  check("fixture removed", left === 0, `${left} left`);
  await mongoose.disconnect();

  console.log(`\n${"=".repeat(64)}`);
  console.log(`  ${pass} passed, ${failed} failed`);
  if (failures.length) console.log(`  failing: ${failures.join(", ")}`);
  console.log("=".repeat(64));
  process.exitCode = failed ? 1 : 0;
}
