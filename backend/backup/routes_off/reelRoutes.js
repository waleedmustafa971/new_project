import express from "express";
import {
  addRealls, getReels, addLike, addFavourite,addComments, 
  getCommentsSingleReels, Addfollow, Unfollow, userFollowlist,
  myFollowers, myFollowering, getUsersReels, getReelFeed, addReplyComments,
  addReplyCommentsLikes, isLiked, removeLike
} from "../controllers/reels.js";


const router = express.Router();

router.post("/add", addRealls);
router.post("/addlike", addLike); 
router.post("/checkliked", isLiked) 
router.post("/removeslike", removeLike) 
router.post("/addFavourite", addFavourite); 
router.post("/addcomments", addComments); //addcomments addReplyComments
router.post("/addreply", addReplyComments); //addcomments  addReplyCommentsLikes
router.post("/addcommentsylike", addReplyCommentsLikes); //addcomments  addReplyCommentsLikes
router.get("/getreel", getReels) //getReelFeed
router.get("/getReelFeed", getReelFeed) //getReelFeed
router.get("/userreels", getUsersReels)
router.get("/myFollowers", myFollowers)
router.get("/myFollowering",myFollowering)
router.get("/getreelcomments", getCommentsSingleReels)
router.post("/Addfollow",Addfollow)
router.post("/Unfollow",Unfollow)
router.get("/userFollowlist",userFollowlist)

// Like a reel


export default router;
