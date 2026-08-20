import express from "express";
import {
    updatePost, getPosts, updateShortpost, getRecentstory,
    yourContent, userWall 
} from "../controllers/postreel.js";


const router = express.Router();

router.post("/updatePost", updatePost);
router.get("/lasttenpost", getPosts); //updateShortpost
router.get("/recentstory", getRecentstory); // filter posttype: posttype, username: loginUserId
router.post("/poststory", updateShortpost); //
router.get("/your-content", yourContent); //

/* A single person's posts and shares, filtered to what the viewer may see. */
router.get("/wall", userWall);



export default router;
