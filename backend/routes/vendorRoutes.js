import express from "express";
import { addVendor, updateVendor,
      deleteVendor, listVendors,vendorLogin, orderList
       } from "../controllers/vendorController.js";
import authMiddleware from '../middleware/auth.js';
import { upload } from "../helpers/uploadHelpervendor.js";

const router = express.Router()

router.post("/add", upload.single("logo"), addVendor);
router.put("/update/:id", upload.single("logo"), updateVendor);
router.delete("/delete/:id", deleteVendor);
router.get("/list", listVendors);
router.post("/login", vendorLogin);
router.get("/vendor-order-list/:id", orderList)



export default router