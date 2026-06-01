import express from "express";
import {
  addPromo,
  updatePromo,
  updateStatus,
  getList,
  deletePromo
} from "../controllers/promoController.js";

const router = express.Router();

router.post("/add", addPromo);
router.put("/update/:id", updatePromo);
router.put("/status", updateStatus);
router.get("/list", getList);
router.delete("/delete/:id", deletePromo);


export default router;
