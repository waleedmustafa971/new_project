import express from "express";
import {
    messages, addmessages, chatList
} from "../controllers/message.js";


const router = express.Router();

router.get("/message", messages);
router.get("/chatlst",chatList);
router.post("/add", addmessages);


// Like a reel


export default router;
