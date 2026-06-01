import express from "express";
import { addPackageData, updatePackageData, updateStatus, getList, deletePackage
 } from "../controllers/packageController.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';



router.post('/add-package', addPackageData);
router.put('/update-package/:id', updatePackageData);
router.put('/update-status/:id', updateStatus);
router.delete('/delete-package/:id', deletePackage);
router.get('/list', getList);

export default router