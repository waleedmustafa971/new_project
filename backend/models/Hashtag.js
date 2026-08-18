import mongoose from "mongoose";

/*
  Backs "Hashtags", "Search Hashtags", "Trending Section / Trending Topics"
  and "Admin - Manage Trending & Hashtags".

  postCount is refreshed by the admin panel's "Rebuild from content" action,
  which scans reel/post captions for #tags.
*/
const hashtagSchema = new mongoose.Schema(
  {
    tag: { type: String, required: true, unique: true, lowercase: true, trim: true },
    postCount: { type: Number, default: 0 },
    // Admin-controlled trending pin + ordering
    isTrending: { type: Boolean, default: false },
    trendingRank: { type: Number, default: 0 },
    // Blocked tags are hidden from search + trending everywhere
    isBlocked: { type: Boolean, default: false },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

hashtagSchema.index({ isTrending: -1, trendingRank: 1 });
hashtagSchema.index({ postCount: -1 });

const Hashtag = mongoose.model("Hashtag", hashtagSchema);
export default Hashtag;
