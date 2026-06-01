import express from 'express';
import { addOrder, updateOrder, deleteOrder, orderList } from '../controllers/orderController.js';

const router = express.Router();

router.post("/add", addOrder);
router.put("/update/:orderid", updateOrder);
router.delete("/delete/:orderid", deleteOrder);
router.get("/list", orderList);

export default router;
