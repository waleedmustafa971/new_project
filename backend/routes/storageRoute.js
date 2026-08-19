import express from "express";
import { status, requestUpload, resolve } from "../controllers/storageController.js";

const router = express.Router();

router.get("/status", status);
router.post("/upload-url", requestUpload);
router.get("/resolve", resolve);
router.post("/resolve", resolve);

export default router;
