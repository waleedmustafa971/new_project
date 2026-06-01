import express from "express";
import { addCart, updateCart, deleteCart, listCarts,
    increaseQty, decreaseQty
 } from "../controllers/cartController.js";
import { upload } from "../middleware/imageHelper.js";

const router = express.Router();

router.post("/add", addCart);
router.post("/update/:id", updateCart);
router.post("/increase/:id", increaseQty);
router.post("/decrease/:id", decreaseQty);
router.delete("/delete/:id", deleteCart);
router.get("/list", listCarts);


export default router;
