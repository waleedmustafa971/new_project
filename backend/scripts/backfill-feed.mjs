/*
  One-off backfill for the Social Feed additions.

  Populates the new fields on content created before they existed:
    media[]      from the legacy videoUrl
    hashtags[]   extracted from the caption
    mentions[]   resolved from @names in the caption
    place        from the free-text location string
    expiresAt    24h after xtime, for stories

  Safe to re-run: only writes fields that are missing.

  Run from the backend directory:  node scripts/backfill-feed.mjs
*/
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const reels = mongoose.connection.collection("reels");
const users = mongoose.connection.collection("users");
const hashtagsCol = mongoose.connection.collection("hashtags");

const extractHashtags = (text = "") => {
  const found = String(text).match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))];
};
const extractMentionNames = (text = "") => {
  const found = String(text).match(/@[\p{L}\p{N}_.]+/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))];
};

const mediaFromLegacy = (v) => {
  if (!v) return [];
  const one = (u, type, i) => ({
    url: u,
    type: type || (/\.(mp4|mov|webm|m3u8|m4v)/i.test(u) ? "video" : "image"),
    order: i,
  });
  if (typeof v === "string") return [one(v, null, 0)];
  if (Array.isArray(v)) {
    return v.map((x, i) => (typeof x === "string" ? one(x, null, i) : one(x.url || x.uri, x.type, i)))
            .filter((m) => m.url);
  }
  if (typeof v === "object" && (v.url || v.uri)) return [one(v.url || v.uri, v.type, 0)];
  return [];
};

const STORY_TTL = 24 * 60 * 60 * 1000;
const all = await reels.find({}).toArray();
console.log(`scanning ${all.length} content documents…`);

let mediaSet = 0, tagsSet = 0, placeSet = 0, expirySet = 0, mentionsSet = 0;
const tagTotals = new Map();

for (const doc of all) {
  const update = {};

  if (!doc.media || doc.media.length === 0) {
    const media = mediaFromLegacy(doc.videoUrl);
    if (media.length) { update.media = media; mediaSet++; }
  }

  if (!doc.hashtags || doc.hashtags.length === 0) {
    const tags = extractHashtags(doc.videoTitle);
    if (tags.length) { update.hashtags = tags; tagsSet++; }
  }
  for (const t of update.hashtags || doc.hashtags || []) {
    tagTotals.set(t, (tagTotals.get(t) || 0) + 1);
  }

  if (!doc.mentions || doc.mentions.length === 0) {
    const names = extractMentionNames(doc.videoTitle);
    if (names.length) {
      const found = await users.find({
        $or: names.map((n) => ({ name: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })),
      }).project({ _id: 1 }).toArray();
      if (found.length) { update.mentions = found.map((u) => u._id); mentionsSet++; }
    }
  }

  if (!doc.place && doc.location && String(doc.location).trim()) {
    update.place = { name: String(doc.location).trim() };
    placeSet++;
  }

  if (doc.expiresAt === undefined && /^stor(y|ies)$/i.test(doc.posttype || "")) {
    update.expiresAt = new Date(new Date(doc.xtime || Date.now()).getTime() + STORY_TTL);
    expirySet++;
  }

  if (doc.viewsCount === undefined) update.viewsCount = 0;

  if (Object.keys(update).length) {
    await reels.updateOne({ _id: doc._id }, { $set: update });
  }
}

// Refresh the hashtag index from what we just found
for (const [tag, count] of tagTotals) {
  await hashtagsCol.updateOne(
    { tag },
    { $set: { postCount: count, updatedAt: new Date() }, $setOnInsert: { tag, isTrending: false, isBlocked: false, createdAt: new Date() } },
    { upsert: true }
  );
}

console.log(`
backfill complete:
  media[]     set on ${mediaSet}
  hashtags[]  set on ${tagsSet}   (${tagTotals.size} distinct tags indexed)
  mentions[]  set on ${mentionsSet}
  place       set on ${placeSet}
  expiresAt   set on ${expirySet} stories
`);

await mongoose.disconnect();
