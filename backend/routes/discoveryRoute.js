import express from "express";
import {
  /* unified search */
  search, suggest, searchHistory, clearSearchHistory, trendingSearches,
  /* hashtags */
  hashtagSearch, hashtagDetail, relatedHashtags, followHashtag, followedHashtags,
  /* creators */
  discoverCreators, topCreators, similarCreators,
  /* videos */
  discoverVideos, videoCategories,
  /* topics */
  trendingTopics, topicFeed,
  /* locations */
  nearby, browseLocations, locationFeed, locationTrending,
} from "../controllers/discoveryController.js";

const router = express.Router();

/* ---- search ---- */
router.get("/search", search);
router.get("/search/suggest", suggest);
router.get("/search/trending", trendingSearches);
router.get("/search/history", searchHistory);
router.delete("/search/history/:id", clearSearchHistory);
router.delete("/search/history", clearSearchHistory);

/* ---- hashtags ---- */
router.get("/hashtags", hashtagSearch);
router.get("/hashtags/following", followedHashtags);
router.get("/hashtags/:tag", hashtagDetail);
router.get("/hashtags/:tag/related", relatedHashtags);
router.post("/hashtags/:tag/follow", followHashtag);

/* ---- creators ---- */
router.get("/creators", discoverCreators);
router.get("/creators/top", topCreators);
router.get("/creators/:userId/similar", similarCreators);

/* ---- videos ---- */
router.get("/videos", discoverVideos);
router.get("/videos/categories", videoCategories);

/* ---- topics ---- */
router.get("/topics", trendingTopics);
router.get("/topics/:topic", topicFeed);

/* ---- locations ---- */
router.get("/nearby", nearby);
router.get("/locations", browseLocations);
router.get("/locations/trending", locationTrending);
router.get("/locations/:name", locationFeed);

export default router;
