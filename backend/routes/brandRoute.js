import express from "express";
import { addBrand,updateBrand, 
 listBrand, deleteBrand  
       } from "../controllers/brandController.js";
import authMiddleware from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router()

router.post("/add", upload.array('images', 1), addBrand) 
router.post("/update/:id", upload.array('images', 1), updateBrand) 
router.delete("/delete/:id", deleteBrand);

router.get("/list", listBrand)



export default router