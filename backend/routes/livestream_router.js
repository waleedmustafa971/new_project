import express from "express";
import { createLiveStream, getStream, getAudienceToken,
    updateLiveStream, requestCohost, addGift,updateGift,
    getGifts, AddDepost, updateDepost, listDepost,
    createPayment, walletAdd, paymentBuysell
 } from "../controllers/LiveStreamController.js";
import authMiddleware from '../middleware/auth.js';
import upload from '../config/giftMulter.js';

const router = express.Router()

router.post("/create-stream",authMiddleware, createLiveStream) 
router.post("/end-stream",authMiddleware, updateLiveStream) 
router.get("/get-live-stream", authMiddleware, getStream)
router.get("/get-token", getAudienceToken); 
router.post("/co-hoster-request", requestCohost); 

//Gift Modal
router.post("/add-gift", upload.single("images"), addGift); //authMiddleware, 
router.post("/update-gift/:id", upload.single("images"), updateGift); //authMiddleware, 
router.get("/get-gifts", getGifts); //authMiddleware, 

//Deposite ITems
router.post("/add-deposit", authMiddleware, AddDepost) //authMiddleware, 
router.post("/update-deposit", authMiddleware, updateDepost)
router.get("/list-Depost", authMiddleware, listDepost) //authMiddleware, 

router.post("/createPayment", authMiddleware,createPayment)
router.post("/add-transaction", authMiddleware, walletAdd) // this is for add balance
//this is for buy and sell
router.post("/add-transaction-buyandsellpayment", authMiddleware, paymentBuysell) // this is for add balance
//this is for buy and sell




export default router