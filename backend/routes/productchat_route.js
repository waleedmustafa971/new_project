import express from "express";
import { sendMessage, getMessages, getUserChats, markAsSeen, unreadCount
 } from "../controllers/productchat_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()


//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/product-chat-send', sendMessage);
router.get('/product-chat/:productId/:userId/:otherUserId', getMessages);
//${productId}/${userId}/${otherUserId}
//GET /api/chat/:productId/:userId/:otherUserId
/* C. User-wise Chat List (Inbox) */
router.get('/product-chat-list/user/:userId', getUserChats);

/* D. Seen / Unseen Messages
PUT /api/chat/seen */
router.put('/product-chat-send', markAsSeen);

router.post('', unreadCount)


export default router