import express from "express";
import { addVideo, updateVideo, listVideo, addDelete
 } from "../controllers/propertyvideoController.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';



//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/add', upload.array('images', 20), addVideo);
router.post('/update/:id', updateVideo); 
router.post('/delete/:id', addDelete); 
router.get('/list', listVideo);


export default router