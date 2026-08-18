import express from "express";
import {
  /* bio, gender, location, birthday */
  getMyProfile, updateMyProfile, genderOptions, getProfile,
  /* interests & hobbies */
  interestCatalogue, getInterests, setInterests, similarInterests,
  /* follow / unfollow / friends */
  follow, unfollow, removeFollower,
  followers, following, friends,
  connectionCounts, mutualFriends, relationshipWith,
} from "../controllers/profileController.js";

const router = express.Router();

/*
  Static paths come before the /:userId ones, so "me", "interests" and
  "friends" are never captured as a user id.
*/

/* ---- own profile ---- */
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.get("/genders", genderOptions);

/* ---- interests & hobbies ---- */
router.get("/interests/catalogue", interestCatalogue);
router.get("/interests/similar", similarInterests);
router.get("/interests", getInterests);
router.put("/interests", setInterests);

/* ---- follow / unfollow ---- */
router.post("/follow", follow);
router.post("/unfollow", unfollow);

/* ---- own connections ---- */
router.get("/followers", followers);
router.get("/following", following);
router.get("/friends", friends);
router.get("/counts", connectionCounts);
router.delete("/followers/:userId", removeFollower);

/* ---- another account ---- */
router.get("/:userId", getProfile);
router.get("/:userId/followers", followers);
router.get("/:userId/following", following);
router.get("/:userId/friends", friends);
router.get("/:userId/counts", connectionCounts);
router.get("/:userId/mutual-friends", mutualFriends);
router.get("/:userId/relationship", relationshipWith);
router.post("/:userId/follow", follow);
router.post("/:userId/unfollow", unfollow);

export default router;
