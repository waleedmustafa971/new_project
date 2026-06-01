import express from "express";
import {
  addRealls, getReels, addLike, addFavourite,addComments, 
  getCommentsSingleReels, Addfollow, Unfollow, userFollowlist,
  myFollowers, myFollowering, getUsersReels, getReelFeed, addReplyComments,
  addReplyCommentsLikes, isLiked, removeLike, updateReelpost,
  generateUploadUrl, handleMuxWebhook, sharePostdata, updateNewReelsimageaudio,
  getSearchReels, addSavepost, getSavetimeline
} from "../controllers/reels.js";
import { upload } from "../middleware/imageHelper.js";
import authMiddleware from '../middleware/auth.js';


const router = express.Router();

router.post("/add", addRealls);
router.post("/addlike", addLike); 
router.post("/addSavepost", addSavepost); //time line saved data
router.get("/get-save-data-timeline/:id", getSavetimeline); //time line saved data
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
router.get("/getreelcomments", getCommentsSingleReels) //getSearchReels
router.get("/search-reels",getSearchReels) //getSearchReels authMiddleware, 
router.post("/Addfollow",Addfollow)
router.post("/Unfollow",Unfollow)
router.get("/userFollowlist",userFollowlist)
router.post("/updateReelpost",  upload.single("file"), updateReelpost) //upload.single("images"),
router.post("/generate-upload-url",  generateUploadUrl) 
router.post("/webhook", handleMuxWebhook); // dont user here authtoken
// Like a reel

router.post("/share-post", sharePostdata)


//new video processing
router.post("/update-post-reels",  updateNewReelsimageaudio) //upload.single("images"),


export default router;
