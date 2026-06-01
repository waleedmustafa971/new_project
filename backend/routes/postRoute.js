import express from "express";
import {
    updatePost, getPosts, updateShortpost, getRecentstory,
    yourContent 
} from "../controllers/postreel.js";


const router = express.Router();

router.post("/updatePost", updatePost);
router.get("/lasttenpost", getPosts); //updateShortpost
router.get("/recentstory", getRecentstory); // filter posttype: posttype, username: loginUserId
router.post("/poststory", updateShortpost); //
router.get("/your-content", yourContent); //



export default router;
