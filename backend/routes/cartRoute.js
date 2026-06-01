import express from "express";
import { addCart, updateCart, deleteCart, listCarts,
    increaseQty, decreaseQty, listFoodCarts,
    foodaddCart, foodupdateCart, 
    foodincreaseQty, fooddecreaseQty, fooddeleteCart
 } from "../controllers/cartController.js";
import authMiddleware from "../middleware/auth.js";
const router = express.Router();

router.post("/add", authMiddleware, addCart);
router.post("/update/:id", authMiddleware, updateCart);
router.post("/increase/:id", authMiddleware, increaseQty);
router.post("/decrease/:id", authMiddleware, decreaseQty);
router.delete("/delete/:id", authMiddleware, deleteCart);
router.get("/list", listCarts); //authMiddleware, 
//{{url}}/api/cart/list?userId=69a2aa0041a6300225b0e7ab

//for food add cart


router.post("/food-add", foodaddCart); //authMiddleware, 
router.post("/food-update/:id", authMiddleware, foodupdateCart);
router.post("/food-increase/:id", authMiddleware, foodincreaseQty);
router.post("/food-decrease/:id", authMiddleware, fooddecreaseQty);
router.delete("/food-delete/:id", authMiddleware, fooddeleteCart); 
router.get("/food-list", listFoodCarts); //authMiddleware, 


export default router;
