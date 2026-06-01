import express from "express";
import { addImage,updateImage, getImageList
       } from "../../controllers/food/ImageController.js";
import authMiddleware from '../../middleware/auth.js';
//import upload from '../../config/multer.js';
import upload from '../../config/food/FoodCategoryupload.js';


const router = express.Router()

router.post("/addimage", authMiddleware, upload.array('images', 1), addImage) 
router.post("/updateimage", authMiddleware, upload.array('images', 1), updateImage) 
//router.delete("/delete-image/:id", authMiddleware, deleteImage)
router.get("/list", getImageList) //authMiddleware, 

export default router