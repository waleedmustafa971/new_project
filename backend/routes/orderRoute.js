import express from 'express';
import { addOrder, updateOrder, deleteOrder, orderList,
    addOrUpdateReview, addOrderfood, orderfoodList,
    orderfoodDelete
 } from '../controllers/orderController.js';
 import authMiddleware from "../middleware/auth.js";
  

const router = express.Router();

router.post("/add", authMiddleware, addOrder);
router.put("/update/:orderid", authMiddleware, updateOrder);
router.delete("/delete/:orderid", authMiddleware, deleteOrder);
router.get("/list", authMiddleware, orderList);
router.post("/review",authMiddleware, addOrUpdateReview)

//for food
router.post("/food-add", authMiddleware, addOrderfood);
router.put("/food-update/:orderid", authMiddleware, updateOrder);
router.delete("/food-delete/:orderid", authMiddleware, deleteOrder);
router.get("/food-list", authMiddleware, orderfoodList);
router.get("/order-food-list", orderfoodList); //authMiddleware, 
router.get("/delete-order-food",authMiddleware, orderfoodDelete); //authMiddleware, 
router.post("/food-review",authMiddleware, addOrUpdateReview)


export default router;
