import express from "express";
import { voiceUpload, createGroupChat, 
    getGroups, 
    sendGroupmessage,
    getGroupMessagedata } from "../controllers/voiceUpload.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/addvoice",voiceUpload) //updateOwnMusic
router.post("/creategrpchat",createGroupChat) //updateOwnMusic
router.get("/getmessengergroup", getGroups)
router.post("/send-group-message/:groupId/send", sendGroupmessage) 
router.get("/get-group-message/:groupId/receive", getGroupMessagedata) 


export default router