import express from "express";
import { addData, getGroupdata, updateMotorsData, getDraftbyuser, getList,
    deletePropertyAd, deleteImage, updateStepone,
    getmaincategoryList,filterData, motorsList
 } from "../controllers/motors_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';

//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/addmotors', upload.array('images', 20), addData);
router.post('/updatestep1', upload.array('images', 20), updateStepone);
router.get("/getmotors", getGroupdata);
router.post('/deleteimage/:id', deleteImage);
router.get("/draft/:userid/:status", authMiddleware, getDraftbyuser); 
router.get("/listofdraft/:status/:userid", getList); 
router.get("/delete_property/:id", deletePropertyAd); 
router.post('/updatemotors', updateMotorsData);
router.get("/getcategorydata", getmaincategoryList); 
router.get("/motorsdetails/:status", motorsList);  //authMiddleware, 
router.get('/filtermotors', filterData);

export default router