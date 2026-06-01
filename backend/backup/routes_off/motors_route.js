import express from "express";
import { addData, getGroupdata, updateMotorsData, getDraftbyuser, getList,
    deletePropertyAd, deleteImage, updateStepone,
    getmaincategoryList,filterData
 } from "../controllers/motors_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';



//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/addmotors', upload.array('images', 20), addData);
router.post('/updatestep1', upload.array('images', 20), updateStepone);
router.get("/getmotors", getGroupdata);
router.post('/deleteimage/:id', deleteImage);
router.get("/draft/:userid/:status", getDraftbyuser); //http://192.168.0.113:5000/apis/property/draft/6858084f41cc71c9c697da79/draft
router.get("/listofdraft/:status/:userid", getList); 
router.get("/delete_property/:id", deletePropertyAd); 
router.post('/updatemotors', updateMotorsData);
router.get("/getcategorydata", getmaincategoryList); 
//http://192.168.0.113:5000/apis/property/draft/6858084f41cc71c9c697da79/draft?status=publish&page=1&limit=10&category=&subcategory=
router.get('/filtermotors', filterData);

export default router