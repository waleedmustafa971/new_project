import express from "express";
import { addCategory,updateCategory, 
  deleteCategory, getCategoryList,
  subcategoriesList  
       } from "../controllers/categoryecomController.js";
import authMiddleware from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router()

router.post("/add", authMiddleware, upload.array('images', 1), addCategory) 
router.post("/update", authMiddleware, upload.array('images', 1), updateCategory) 
router.delete("/delete/:id", authMiddleware, deleteCategory)
router.get("/getcategorylist", getCategoryList)
router.get("/subcategories/:parentId", subcategoriesList)



export default router