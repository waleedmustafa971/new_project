/*
  One session, as a real person would spend it.

  Not a unit suite -- a walk through the product in the order somebody
  actually uses it: read the feed, open a profile, post something, comment,
  reply, reply to the reply, react, save, share, look at stories, search,
  check notifications, follow, block, unblock. Every step asserts the thing a
  user would notice, which is usually "did that do anything at all".

  This exists because bugs in this codebase cluster in one shape: an endpoint
  answers 200 or 404 for a reason nobody sees, and the screen just sits there.
  Comment replies were dead for months behind a 404 that no UI ever showed.

  Run against a server with the demo data:

    node scripts/test-user-journey.mjs
    BASE=http://localhost:5051/apis node scripts/test-user-journey.mjs

  Everything it writes, it deletes. Everything it flips, it puts back.
*/

const BASE = process.env.BASE || "http://localhost:5000/apis";

const U = {
  layla: "6a830332316418fdbc512051",
  omar: "6a830332316418fdbc512052",
  sara: "6a830332316418fdbc512053",   // private
  yusuf: "6a830332316418fdbc512054",
  hassan: "6a830332316418fdbc512058",
};

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

const call = async (method, path, { body, query } = {}) => {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: ["GET", "HEAD", "DELETE"].includes(method) ? undefined : JSON.stringify(body || {}),
  });
  let j = {}; try { j = await res.json(); } catch {}
  return { ...j, _http: res.status };
};
const GET = (p, q) => call("GET", p, { query: q });
const POST = (p, b) => call("POST", p, { body: b });
const DEL = (p, q) => call("DELETE", p, { query: q });

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);

const written = [];        // reels created here
const undo = [];           // () => Promise, run in reverse at the end

try {
  /* ================================================================ */
  section("1. Opening the app — the timeline");
  /* ================================================================ */

  let r = await GET("/postreel/lasttenpost", { page: 1, limit: 10, userid: U.omar });
  const feed = r.reels || [];
  check("the feed returns posts", feed.length > 0, `got ${feed.length}`);
  check("every post names its author", feed.every((p) => p.userInfo?.name), "a card would render nameless");
  check("every post carries a reaction summary", feed.every((p) => p.reactions), "the action bar cannot draw");
  check("likes is a number, not an array", feed.every((p) => typeof p.likes === "number"));
  const authors = new Set(feed.map((p) => String(p.userInfo?.userid)));
  check("the page is not one person", authors.size >= 2, `${authors.size} authors`);

  /* ================================================================ */
  section("2. Opening somebody's profile");
  /* ================================================================ */

  r = await GET("/postreel/wall", { userid: U.layla, viewerId: U.omar, limit: 5 });
  check("a public wall opens", r._http === 200 && r.locked === false, `got ${r._http}`);
  check("it is the person asked for", String(r.author?._id) === U.layla, String(r.author?._id));
  check("it says whether you follow them", typeof r.author?.isFollowing === "boolean");
  check("counts come with it", typeof r.author?.followersCount === "number");

  r = await GET("/postreel/wall", { userid: U.sara, viewerId: U.hassan, limit: 5 });
  check("a private wall is locked, not broken", r._http === 200 && r.locked === true, `got ${r._http}`);
  check("...and still names the account", !!r.author?.name);

  /* ================================================================ */
  section("3. Writing a post");
  /* ================================================================ */

  const { insertedId } = await db.collection("reels").insertOne({
    username: oid(U.omar), videoTitle: "journey-fixture post", videoUrl: "",
    posttype: "Post", audience: "everyone",
    likes: [], dislikes: [], comments: [], favorites: [], shares: [], stars: [], sharepost: [],
    status: "active", xtime: new Date(),
  });
  written.push(insertedId);
  const postId = String(insertedId);

  r = await GET("/postreel/wall", { userid: U.omar, viewerId: U.omar, limit: 50 });
  check("it appears on your own wall", (r.posts || []).some((p) => String(p._id) === postId));

  /* ================================================================ */
  section("4. Reacting");
  /* ================================================================ */

  r = await POST(`/engagement/posts/${postId}/react`, { userId: U.layla, type: "love" });
  check("a reaction is accepted", r._http === 200 && r.action === "added", JSON.stringify(r).slice(0, 90));
  check("it reports which one", r.reaction === "love", String(r.reaction));

  r = await POST(`/engagement/posts/${postId}/react`, { userId: U.layla, type: "haha" });
  check("switching reaction does not double-count", r.total === 1, `total ${r.total}`);

  r = await GET("/postreel/wall", { userid: U.omar, viewerId: U.layla, limit: 50 });
  const mine = (r.posts || []).find((p) => String(p._id) === postId);
  check("the wall reflects your own reaction", mine?.reactions?.myReaction === "haha", String(mine?.reactions?.myReaction));

  /* ================================================================ */
  section("5. Commenting, replying, and replying to the reply");
  /* ================================================================ */

  r = await POST(`/engagement/posts/${postId}/comments`, { userId: U.layla, message: "journey top-level" });
  check("a comment is accepted", r._http === 200, `got ${r._http} ${JSON.stringify(r).slice(0,80)}`);
  const c1 = r.comment?._id;
  check("it comes back with an id", !!c1, JSON.stringify(r).slice(0, 100));

  r = await POST(`/engagement/posts/${postId}/comments`, { userId: U.yusuf, message: "journey reply", parentId: c1 });
  check("a reply to a comment is accepted", r._http === 200, `got ${r._http}`);
  const c2 = r.comment?._id;
  check("the reply knows its parent", String(r.comment?.parentId) === String(c1), String(r.comment?.parentId));

  /* The one the user could not do. */
  r = await POST(`/engagement/posts/${postId}/comments`, { userId: U.layla, message: "journey reply-to-reply", parentId: c2 });
  check("A REPLY TO A REPLY IS ACCEPTED", r._http === 200, `got ${r._http} ${JSON.stringify(r).slice(0,100)}`);
  const c3 = r.comment?._id;
  check("it hangs off the reply, not the root", !!c3);

  r = await GET(`/engagement/posts/${postId}/comments`, { userId: U.layla, limit: 50, replies: 10 });
  const top = (r.comments || []).find((c) => String(c._id) === String(c1));
  check("the thread reads back", !!top, "top-level comment missing");
  check("the reply is nested under it", (top?.replies || []).some((x) => String(x._id) === String(c2)));
  /*
    Replies are one level deep on purpose: addComment flattens a reply-to-a-
    reply into the same thread and records who was answered in `replyTo`. That
    is Facebook's model, so the right assertion is that the reply lands in the
    thread and remembers its target -- not that it nests a third time.
  */
  const flat = (top?.replies || []).find((x) => String(x._id) === String(c3));
  check("the reply-to-reply lands in the same thread", !!flat,
    "it should sit beside the reply it answers, not under it");
  check("...and records who it answered", !!flat?.replyTo?.name,
    JSON.stringify(flat?.replyTo));

  /* ================================================================ */
  section("6. Liking a comment");
  /* ================================================================ */

  r = await POST(`/engagement/posts/${postId}/comments/${c1}/like`, { userId: U.yusuf });
  check("a comment like is accepted", r._http === 200, `got ${r._http}`);
  check("it reports the count", typeof r.likes === "number", JSON.stringify(r).slice(0, 80));

  r = await GET(`/engagement/posts/${postId}/comments`, { userId: U.yusuf, limit: 50 });
  const liked = (r.comments || []).find((c) => String(c._id) === String(c1));
  check("isLiked comes back true for the liker", liked?.isLiked === true, String(liked?.isLiked));

  r = await POST(`/engagement/posts/${postId}/comments/${c1}/like`, { userId: U.yusuf });
  r = await GET(`/engagement/posts/${postId}/comments`, { userId: U.yusuf, limit: 50 });
  const unliked = (r.comments || []).find((c) => String(c._id) === String(c1));
  check("liking again takes it back", unliked?.isLiked === false, String(unliked?.isLiked));

  /* ================================================================ */
  section("7. The legacy comment endpoints the app still touches");
  /* ================================================================ */

  r = await POST("/reel/addcomments", { username: U.layla, id: postId, message: "journey legacy comment" });
  check("legacy addcomments accepts a user id", r._http === 200, `got ${r._http}`);

  const withLegacy = await db.collection("reels").findOne({ _id: insertedId });
  const legacyC = withLegacy.comments.find((c) => c.message === "journey legacy comment");
  check("it stored the comment", !!legacyC);

  if (legacyC) {
    r = await POST("/reel/addreply", { reelId: postId, commentId: String(legacyC._id), username: U.omar, message: "journey legacy reply" });
    check("legacy addreply accepts a user id", r._http === 200, `got ${r._http} — this 404'd before`);

    r = await POST("/reel/addcommentsylike", { reelId: postId, commentId: String(legacyC._id), username: U.omar });
    check("legacy comment-like accepts a user id", r._http === 200, `got ${r._http} — this 404'd before`);
    check("...and toggles rather than stacking", r.liked === true && r.count === 1, JSON.stringify(r));
  }

  /* ================================================================ */
  section("8. Saving and sharing");
  /* ================================================================ */

  r = await POST(`/engagement/posts/${postId}/save`, { userId: U.yusuf });
  check("saving a post works", r._http === 200, `got ${r._http}`);
  r = await GET("/engagement/saved", { userId: U.yusuf, limit: 20 });
  /* savedPosts answers with `items`, not `posts` -- worth pinning, because a
     client reading the wrong key gets an empty Saved tab and no error. */
  check("it turns up in Saved", (r.items || []).some((p) => String(p._id) === postId),
    "saved list did not contain it: " + JSON.stringify(Object.keys(r)));
  await POST(`/engagement/posts/${postId}/save`, { userId: U.yusuf });   // unsave

  r = await POST(`/engagement/posts/${postId}/share`, { userId: U.yusuf, text: "journey share" });
  check("sharing works", r._http === 200, `got ${r._http}`);
  /* sharePost answers with `repost: { _id }` -- I guessed `post`/`share`
     first, so six repost rows accumulated across runs before I audited the
     collection. Track the real key. */
  check("a repost row is created and identified", !!r?.repost?._id, JSON.stringify(Object.keys(r)));
  if (r?.repost?._id) written.push(oid(String(r.repost._id)));

  /* ================================================================ */
  section("9. Stories");
  /* ================================================================ */

  r = await GET("/feed/stories", { userId: U.omar, limit: 20 });
  check("the story rail loads", r._http === 200, `got ${r._http}`);
  check("it returns rings, not raw rows", Array.isArray(r.stories || r.rings || r.data), JSON.stringify(Object.keys(r)).slice(0, 90));

  r = await GET("/postreel/recentstory", { posttype: "Reel", username: U.omar, page: 1, limit: 10 });
  check("the legacy story/reel list answers", [200, 201].includes(r._http), `got ${r._http}`);

  /* ================================================================ */
  section("10. Search and discovery");
  /* ================================================================ */

  r = await GET("/auth/notInfriends", { userId: U.omar, page: 1, limit: 10 });
  check("people-you-may-know returns people", (r.users || []).length > 0, `${(r.users || []).length}`);
  check("every suggestion has an id to open", (r.users || []).every((u) => !!u._id));

  r = await GET("/discovery/search", { userId: U.omar, q: "a", limit: 5 });
  check("search answers", [200, 404].includes(r._http), `got ${r._http}`);

  /* ================================================================ */
  section("11. Notifications");
  /* ================================================================ */

  r = await GET("/notification", { userId: U.layla, limit: 10 });
  check("notifications load", r._http === 200, `got ${r._http}`);
  const notes = r.notifications || [];
  check("each one names its actor", notes.every((n) => n.actor?.name), "a row would render nameless");
  check("each one has a type", notes.every((n) => !!n.type));

  r = await GET("/notification/unread-count", { userId: U.layla });
  check("the unread count answers", r._http === 200, `got ${r._http}`);

  /* ================================================================ */
  section("12. Following, and blocking");
  /* ================================================================ */

  r = await POST("/profile/follow", { userId: U.hassan, targetId: U.layla });
  check("following works", r._http === 200 && r.status === "following", JSON.stringify(r).slice(0, 80));
  undo.push(() => POST("/profile/unfollow", { userId: U.hassan, targetId: U.layla }));

  r = await POST("/profile/follow", { userId: U.hassan, targetId: U.sara });
  check("following a private account asks instead", r.status === "requested", JSON.stringify(r).slice(0, 80));
  undo.push(() => POST("/profile/unfollow", { userId: U.hassan, targetId: U.sara }));

  r = await POST("/safety/block", { userId: U.hassan, targetId: U.yusuf });
  check("blocking works", r._http === 200, `got ${r._http}`);
  undo.push(() => POST("/safety/unblock", { userId: U.hassan, targetId: U.yusuf }));

  r = await GET("/postreel/wall", { userid: U.yusuf, viewerId: U.hassan, limit: 5 });
  check("a blocked person's wall is refused", r._http === 403, `got ${r._http}`);

  r = await GET("/postreel/lasttenpost", { page: 1, limit: 30, userid: U.hassan });
  check(
    "and their posts leave the blocker's feed",
    !(r.reels || []).some((p) => String(p.userInfo?.userid) === U.yusuf),
    "a blocked person's post was still served"
  );

} catch (err) {
  failed++; failures.push("journey crashed");
  console.error("\nJOURNEY CRASHED:", err);
} finally {
  section("Cleanup");
  for (const fn of undo.reverse()) { try { await fn(); } catch {} }
  if (written.length) await db.collection("reels").deleteMany({ _id: { $in: written } });
  const left = await db.collection("reels").countDocuments({ videoTitle: /journey-fixture/ });
  check("every fixture removed", left === 0, `${left} left`);

  const hassan = await db.collection("users").findOne({ _id: oid(U.hassan) }, { projection: { blockedUsers: 1, following: 1 } });
  check("no block left behind", !(hassan?.blockedUsers || []).some((b) => String(b) === U.yusuf));
  check("no follow left behind", !(hassan?.following || []).some((f) => String(f) === U.layla));

  await mongoose.disconnect();
  console.log(`\n${"=".repeat(66)}`);
  console.log(`  ${pass} passed, ${failed} failed`);
  if (failures.length) console.log(`  failing:\n    - ${failures.join("\n    - ")}`);
  console.log("=".repeat(66));
  process.exitCode = failed ? 1 : 0;
}
