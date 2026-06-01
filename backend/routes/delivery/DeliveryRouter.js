import express from "express";
import { addDeliveryboyRegistration,
       RiderList, orderList, riderStatusChange, updateRiderLocation
       } from "../../controllers/delivery/DeliveryController.js";
import authMiddleware from '../../middleware/auth.js';
import upload from '../../config/food/FoodCategoryupload.js';


const router = express.Router()

router.post("/rider-registration", upload.array('images', 1), addDeliveryboyRegistration) //authMiddleware, 
router.post("/rider-status-change", riderStatusChange) //authMiddleware, 
router.get("/rider-list", RiderList)
router.get("/rider-order-list/:id", orderList)
router.post("/rider-update-location", updateRiderLocation);
/* router.post("/rider-update-photo", authMiddleware, upload.array('images', 1), addCategory) 
router.post("/rider-profile", authMiddleware, addCategory) 
router.post("/rider-blance", authMiddleware, upload.array('images', 1), addCategory) 
router.post("/order-list/:id", authMiddleware, addCategory) 
router.post("/order-accept-by-rider", authMiddleware, upload.array('images', 1), addCategory) 
router.post("/order-reject-by-rider", authMiddleware, upload.array('images', 1), addCategory) 


router.post("/rider-online-status", authMiddleware, addCategory) 
router.post("/rider-history", authMiddleware, addCategory) 
router.post("/rider-change-location", authMiddleware, addCategory) 
 */

export default router