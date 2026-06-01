import express from "express";
import {
    updatePost, getPosts, updateShortpost, getRecentstory 
} from "../controllers/postreel.js";


const router = express.Router();

router.post("/updatePost", updatePost);
router.get("/lasttenpost", getPosts); //updateShortpost
router.get("/recentstory", getRecentstory); // filter posttype: posttype, username: loginUserId
router.post("/poststory", updateShortpost); //



export default router;
