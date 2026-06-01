import express from "express";
import { voiceUpload, createGroupChat, imageUpload,
    destopimageUpload, mobileimageUpload,
    getGroups, 
    sendGroupmessage, blockUsers, unblockUsers,
    getGroupMessagedata } from "../controllers/voiceUpload.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/addvoice",voiceUpload) //updateOwnMusic 
router.post("/block/:userid",blockUsers) //  unblock
router.post("/unblock/:userid",unblockUsers) //  unblock
router.post("/addimages",mobileimageUpload) //imageUpload imageUpload imageUpload
router.post("/chat-destop-image-upload",destopimageUpload) //updateOwnMusic imageUpload
router.post("/creategrpchat",createGroupChat) //updateOwnMusic
router.get("/getmessengergroup", getGroups)
router.post("/send-group-message/:groupId/send", sendGroupmessage) 
router.get("/get-group-message/:groupId/receive", getGroupMessagedata) 


export default router