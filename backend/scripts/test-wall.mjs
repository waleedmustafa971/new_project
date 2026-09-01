/*
  End-to-end HTTP suite for the personal wall: GET /apis/postreel/wall.

  The wall is a feed filtered to one author, so most of what is asserted here is
  that it stays a feed: the same privacy verdicts, the same post shape, and no
  new way to read something the timeline would have refused. The rest covers the
  tab filter (posts / reels / media / all), the counts the profile header reads,
  and paging.

  Drives the running server over HTTP, asserts failure paths as well as happy
  ones, and restores the database afterwards — every fixture row it writes is
  deleted and every setting it flips is put back.

  Run from the backend directory:
    node scripts/test-wall.mjs                  (server on :5000)
    BASE=http://localhost:5051/apis node scripts/test-wall.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis";

/* Demo fixtures. Traits that matter here, all verified against the demo data
   rather than assumed — five of the eight demo accounts follow Layla, so
   picking a "stranger" at random gets you a follower:
     Layla  — creator, public, has both a post and a reel
     Sara   — private account: her wall is followers-only
     Omar   — follows Layla; does NOT follow Sara
     Yusuf  — follows Layla; does not follow Sara
     Hassan — follows neither, so he is the stranger
*/
const U = {
  layla: "6a830332316418fdbc512051",
  omar: "6a830332316418fdbc512052",
  sara: "6a830332316418fdbc512053",
  yusuf: "6a830332316418fdbc512054",
  hassan: "6a830332316418fdbc512058",
};

let pass = 0, failed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`); }
};

const wall = async (query) => {
  const url = new URL(BASE + "/postreel/wall");
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* ================================================================== */
/* Fixtures                                                            */
/* ================================================================== */

const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);

const MARK = "wall-suite-fixture";
const created = [];

/*
  Rows this suite writes. `videoTitle` carries the marker so a leftover row from
  a crashed run is identifiable in the collection by eye, not only by id.
*/
const makePost = async (authorId, extra = {}) => {
  const doc = {
    username: oid(authorId),
    videoTitle: `${MARK} ${extra._label || "post"}`,
    videoUrl: extra.videoUrl ?? "",
    posttype: extra.posttype || "Post",
    audience: extra.audience || "everyone",
    likes: [], dislikes: [], comments: [], favorites: [], shares: [], stars: [],
    sharepost: [],
    status: "active",
    xtime: extra.xtime || new Date(),
    ...(extra.media ? { media: extra.media } : {}),
  };
  delete doc._label;
  const { insertedId } = await db.collection("reels").insertOne(doc);
  created.push(insertedId);
  return String(insertedId);
};

const snapshot = {};
const restore = async () => {
  if (created.length) {
    await db.collection("reels").deleteMany({ _id: { $in: created } });
  }
  for (const [id, fields] of Object.entries(snapshot)) {
    const set = {}, unset = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) unset[k] = "";
      else set[k] = v;
    }
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) await db.collection("users").updateOne({ _id: oid(id) }, update);
  }
};

const countIn = (posts, predicate) => posts.filter(predicate).length;

try {
  /* ================================================================ */
  section("1. Bad input");
  /* ================================================================ */

  let r = await wall({});
  check("no userid is 400", r._http === 400, `got ${r._http}`);

  r = await wall({ userid: "not-an-id" });
  check("malformed userid is 400", r._http === 400, `got ${r._http}`);

  r = await wall({ userid: "6a830332316418fdbc5120ff" });
  check("unknown user is 404", r._http === 404, `got ${r._http}`);

  /* ================================================================ */
  section("2. Your own wall");
  /* ================================================================ */

  const postId = await makePost(U.layla, { _label: "text post" });
  const reelId = await makePost(U.layla, {
    _label: "reel",
    posttype: "Reel",
    videoUrl: "uploads/wall-suite-clip.mp4",
  });
  const mediaPostId = await makePost(U.layla, {
    _label: "photo post",
    media: [{ url: "uploads/wall-suite-photo.jpg", type: "image", order: 0 }],
  });
  const onlyMeId = await makePost(U.layla, { _label: "only me", audience: "onlyMe" });

  const self = { userid: U.layla, viewerId: U.layla };

  r = await wall({ ...self, limit: 50 });
  check("own wall answers 200", r._http === 200, `got ${r._http}`);
  check("own wall is not locked", r.locked === false);
  check("default type is posts", r.type === "posts", `got ${r.type}`);
  check(
    "default tab carries only posts, no reels",
    countIn(r.posts, (p) => p.posttype !== "Post") === 0
  );
  check("own text post is on the wall", r.posts.some((p) => String(p._id) === postId));
  check(
    "an onlyMe post is visible to its own author",
    r.posts.some((p) => String(p._id) === onlyMeId)
  );

  const card = r.posts.find((p) => String(p._id) === postId);
  check("post carries userInfo", !!card?.userInfo?.userid, JSON.stringify(card?.userInfo));
  check(
    "userInfo is the wall's author",
    String(card?.userInfo?.userid) === U.layla,
    String(card?.userInfo?.userid)
  );
  check("likes is a number, not an array", typeof card?.likes === "number", typeof card?.likes);
  check("comments is a number", typeof card?.comments === "number", typeof card?.comments);
  check("shares is a number", typeof card?.shares === "number", typeof card?.shares);
  check("commentsdetails is an array", Array.isArray(card?.commentsdetails));
  check("isOwner is set on your own wall", card?.isOwner === true);

  /* ================================================================ */
  section("3. The tab filter");
  /* ================================================================ */

  r = await wall({ ...self, type: "reels", limit: 50 });
  check("reels tab answers 200", r._http === 200);
  check("reels tab is reels only", countIn(r.posts, (p) => p.posttype !== "Reel") === 0);
  check("the fixture reel is there", r.posts.some((p) => String(p._id) === reelId));

  r = await wall({ ...self, type: "media", limit: 50 });
  check("media tab answers 200", r._http === 200);
  check(
    "media tab carries only rows with a photo or a video",
    r.posts.every((p) => (p.media?.length || 0) > 0 || !!p.videoUrl)
  );
  check("a media[] post is in the media tab", r.posts.some((p) => String(p._id) === mediaPostId));
  check("a videoUrl reel is in the media tab", r.posts.some((p) => String(p._id) === reelId));
  check(
    "a text post is not in the media tab",
    !r.posts.some((p) => String(p._id) === postId)
  );

  r = await wall({ ...self, type: "all", limit: 50 });
  check("all tab answers 200", r._http === 200);
  check("all tab holds both types", r.posts.some((p) => String(p._id) === postId) && r.posts.some((p) => String(p._id) === reelId));

  r = await wall({ ...self, type: "nonsense", limit: 5 });
  check("an unknown type falls back to posts", r.type === "posts", `got ${r.type}`);

  /* ================================================================ */
  section("4. Counts match the database");
  /* ================================================================ */

  const NOT_DELETED = { status: { $ne: "deleted" } };
  const dbPosts = await db.collection("reels").countDocuments({ username: oid(U.layla), posttype: "Post", ...NOT_DELETED });
  const dbReels = await db.collection("reels").countDocuments({ username: oid(U.layla), posttype: "Reel", ...NOT_DELETED });

  r = await wall({ ...self, limit: 1 });
  check("counts.posts matches a direct count", r.counts?.posts === dbPosts, `api ${r.counts?.posts} vs db ${dbPosts}`);
  check("counts.reels matches a direct count", r.counts?.reels === dbReels, `api ${r.counts?.reels} vs db ${dbReels}`);
  check("total follows the requested tab", r.total === dbPosts, `${r.total} vs ${dbPosts}`);
  check(
    "counts do not change with the tab",
    (await wall({ ...self, type: "reels", limit: 1 })).counts?.posts === dbPosts
  );

  /* ================================================================ */
  section("5. Paging");
  /* ================================================================ */

  const page1 = await wall({ ...self, type: "all", page: 1, limit: 2 });
  const page2 = await wall({ ...self, type: "all", page: 2, limit: 2 });
  check("page 1 holds at most the limit", page1.posts.length <= 2, `${page1.posts.length}`);
  const ids1 = new Set(page1.posts.map((p) => String(p._id)));
  check(
    "page 2 repeats nothing from page 1",
    page2.posts.every((p) => !ids1.has(String(p._id))),
    JSON.stringify(page2.posts.map((p) => String(p._id)))
  );
  check("hasMore is true while a further page exists", page1.hasMore === (page1.total > page1.posts.length));

  /* ================================================================ */
  section("6. Privacy — the wall must not be a way around it");
  /* ================================================================ */

  // Someone else's onlyMe post is not theirs to see.
  r = await wall({ userid: U.layla, viewerId: U.omar, limit: 50 });
  check("a follower gets the public wall", r._http === 200 && r.locked === false);
  check(
    "an onlyMe post is hidden from a follower",
    !r.posts.some((p) => String(p._id) === onlyMeId)
  );
  check("isOwner is false on someone else's wall", r.posts[0]?.isOwner === false);

  // A followers-only post.
  const followersOnlyId = await makePost(U.layla, { _label: "followers only", audience: "followers" });
  r = await wall({ userid: U.layla, viewerId: U.omar, limit: 50 });
  check(
    "a followers-only post reaches a follower",
    r.posts.some((p) => String(p._id) === followersOnlyId)
  );
  const laylaDoc = await db.collection("users").findOne({ _id: oid(U.layla) }, { projection: { followers: 1 } });
  const laylaFollowers = (laylaDoc?.followers || []).map(String);
  check(
    "the stranger fixture really does not follow Layla",
    !laylaFollowers.includes(U.hassan),
    "Hassan follows Layla; the next check would prove nothing"
  );
  r = await wall({ userid: U.layla, viewerId: U.hassan, limit: 50 });
  check(
    "a followers-only post is withheld from a non-follower",
    !r.posts.some((p) => String(p._id) === followersOnlyId),
    "leaked to a stranger"
  );

  // A private account.
  const sara = await db.collection("users").findOne({ _id: oid(U.sara) }, { projection: { privacy: 1, followers: 1 } });
  snapshot[U.sara] = { privacy: sara?.privacy };
  await db.collection("users").updateOne({ _id: oid(U.sara) }, { $set: { privacy: "private" } });
  const saraFollowers = (sara?.followers || []).map(String);

  const strangerToSara = [U.hassan, U.yusuf, U.omar].find((id) => !saraFollowers.includes(id));
  check("a stranger to Sara exists among the fixtures", !!strangerToSara);
  r = await wall({ userid: U.sara, viewerId: strangerToSara, limit: 5 });
  check("a private wall answers 200, not 404", r._http === 200, `got ${r._http}`);
  check("a private wall is locked", r.locked === true);
  check("a locked wall sends no posts", (r.posts || []).length === 0);
  check("a locked wall still names the account", !!r.author?.name);
  check("a locked wall still shows follower counts", typeof r.author?.followersCount === "number");

  r = await wall({ userid: U.sara, viewerId: U.sara, limit: 5 });
  check("a private account can always see its own wall", r.locked === false, JSON.stringify(r.reason));

  // Blocking.
  const yusuf = await db.collection("users").findOne({ _id: oid(U.yusuf) }, { projection: { blockedUsers: 1 } });
  snapshot[U.yusuf] = { blockedUsers: yusuf?.blockedUsers };
  await db.collection("users").updateOne(
    { _id: oid(U.yusuf) },
    { $set: { blockedUsers: [...(yusuf?.blockedUsers || []), oid(U.layla)] } }
  );
  r = await wall({ userid: U.layla, viewerId: U.yusuf, limit: 5 });
  check("a blocked pair cannot read the wall", r._http === 403, `got ${r._http}`);

  await db.collection("users").updateOne(
    { _id: oid(U.yusuf) },
    yusuf?.blockedUsers ? { $set: { blockedUsers: yusuf.blockedUsers } } : { $unset: { blockedUsers: "" } }
  );

  /* ================================================================ */
  section("7. Reactions ride along with the post");
  /* ================================================================ */

  /*
    The card cannot draw a Facebook action bar from a like count. It needs to
    know which of the six faces is lit for *this* viewer and what the counts
    behind the cluster are, and it must get that with the post rather than by
    asking again per card -- which is what the old per-card `checkliked` round
    trip did, ten requests per page, for one boolean.
  */
  const reactPost = await makePost(U.layla, { _label: "reactions" });
  const react = (type, as) =>
    fetch(`${BASE}/engagement/posts/${reactPost}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: as, type }),
    }).then((res) => res.json());

  await react("love", U.omar);
  await react("haha", U.yusuf);

  const postOnWall = async (viewer) => {
    const res = await wall({ userid: U.layla, viewerId: viewer, limit: 50 });
    return (res.posts || []).find((p) => String(p._id) === reactPost);
  };

  let seen = await postOnWall(U.omar);
  check("a wall post carries a reactions object", !!seen?.reactions, JSON.stringify(seen?.reactions));
  check("counts are per reaction type", seen?.reactions?.counts?.love === 1 && seen?.reactions?.counts?.haha === 1,
    JSON.stringify(seen?.reactions?.counts));
  check("total counts every reaction", seen?.reactions?.total === 2, String(seen?.reactions?.total));
  check(
    "myReaction is the viewer's own, not just 'someone reacted'",
    seen?.reactions?.myReaction === "love",
    String(seen?.reactions?.myReaction)
  );
  check("legacy `likes` is still a plain number", typeof seen?.likes === "number", typeof seen?.likes);

  seen = await postOnWall(U.yusuf);
  check("myReaction follows whoever is looking", seen?.reactions?.myReaction === "haha", String(seen?.reactions?.myReaction));

  seen = await postOnWall(U.layla);
  check("an author who did not react gets myReaction null", seen?.reactions?.myReaction === null, String(seen?.reactions?.myReaction));
  check("...but still sees the totals", seen?.reactions?.total === 2);

  const feed = await (await fetch(`${BASE}/postreel/lasttenpost?page=1&limit=30&userid=${U.omar}`)).json();
  const inFeed = (feed.reels || []).find((r) => String(r._id) === reactPost);
  check("the timeline sends reactions too", !!inFeed?.reactions, inFeed ? "" : "post not in first page");
  if (inFeed) {
    check("timeline myReaction is the viewer's", inFeed.reactions.myReaction === "love", String(inFeed.reactions.myReaction));
    check("timeline `likes` is untouched", typeof inFeed.likes === "number");
  }

  /* Stories share the controller and must not have grown a reaction bar. */
  const storyRes = await fetch(`${BASE}/postreel/recentstory?posttype=Story&username=${U.layla}`);
  check("stories still answer 200", storyRes.status === 200, String(storyRes.status));

  /* ================================================================ */
  section("8. Deleted posts stay off the wall");
  /* ================================================================ */

  // Counted here rather than reusing dbPosts: section 6 added a fixture post of
  // its own, so the earlier number is one behind by the time we get here.
  const beforeDelete = (await wall({ ...self, limit: 1 })).counts.posts;
  await db.collection("reels").updateOne({ _id: oid(postId) }, { $set: { status: "deleted", deletedAt: new Date() } });
  r = await wall({ ...self, limit: 50 });
  check("a deleted post leaves the wall", !r.posts.some((p) => String(p._id) === postId));
  check("a deleted post leaves the count", r.counts.posts === beforeDelete - 1, `${r.counts.posts} vs ${beforeDelete - 1}`);

} catch (err) {
  failed++;
  failures.push("suite crashed");
  console.error("\nSUITE CRASHED:", err);
} finally {
  section("Cleanup");
  await restore();
  const leftover = await db.collection("reels").countDocuments({ videoTitle: { $regex: MARK } });
  check("every fixture row removed", leftover === 0, `${leftover} left`);
  const saraNow = await db.collection("users").findOne({ _id: oid(U.sara) }, { projection: { privacy: 1 } });
  check("Sara's privacy restored", saraNow?.privacy === snapshot[U.sara]?.privacy, `now ${saraNow?.privacy}`);
  await mongoose.disconnect();

  console.log(`\n${"=".repeat(66)}`);
  console.log(`  ${pass} passed, ${failed} failed`);
  if (failures.length) console.log(`  failing: ${failures.join(", ")}`);
  console.log("=".repeat(66));
  // Set the code rather than calling process.exit(): forcing an exit mid-teardown
  // trips a libuv assertion on Windows that prints a crash trace after a clean run.
  process.exitCode = failed ? 1 : 0;
}
