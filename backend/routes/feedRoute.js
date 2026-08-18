import express from "express";
import {
  homeFeed, forYouFeed, trending,
  storyFeed, markViewed, storyViewers,
  hashtagFeed, searchHashtags,
  searchPlaces, placeFeed, nearbyFeed,
  recommendedUsers, recommendedPosts,
  createPost, updatePost, getPost,
  votePoll, closePoll,
  taggedFeed, updateTags, taggableUsers,
  searchContent,
} from "../controllers/feedController.js";

const router = express.Router();

/* feeds */
router.get("/home", homeFeed);
router.get("/foryou", forYouFeed);
router.get("/trending", trending);

/* stories (24-hour content) */
router.get("/stories", storyFeed);
router.get("/stories/:id/viewers", storyViewers);
router.post("/content/:id/view", markViewed);

/* hashtags */
router.get("/hashtags/search", searchHashtags);
router.get("/hashtag/:tag", hashtagFeed);

/* check-ins, places and nearby */
router.get("/places/search", searchPlaces);
router.get("/place", placeFeed);
router.get("/nearby", nearbyFeed);

/* recommendations */
router.get("/recommendations/users", recommendedUsers);
router.get("/recommendations/posts", recommendedPosts);

/* tagging */
router.get("/tagged/:userId", taggedFeed);
router.get("/taggable", taggableUsers);

/* content search */
router.get("/search", searchContent);

/* posts: create, edit, read */
router.post("/posts", createPost);
router.put("/posts/:id", updatePost);
router.get("/posts/:id", getPost);
router.post("/posts/:id/tags", updateTags);

/* polls */
router.post("/posts/:id/poll/vote", votePoll);
router.post("/posts/:id/poll/close", closePoll);

export default router;
