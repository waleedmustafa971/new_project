import express from "express";
import { addGroup, updateGroup,
      deleteVendor, listGroup
       } from "../controllers/SocialgroupController.js";
import authMiddleware from '../middleware/auth.js';
import { upload } from "../helpers/uploadGroupimage.js";

const router = express.Router()

router.post("/add", upload.single("logo"), addGroup);
router.put("/update/:id", upload.single("logo"), updateGroup);
router.delete("/delete/:id", deleteVendor);
router.get("/list", listGroup);




export default router