import express from "express";
import { addProduct, updateProduct, deleteProduct, listProducts,
    editList, dashboardHome, categorywiseProduct,
    singlewiseProduct, showCase, globalProductsearch
 } from "../controllers/productController.js";
import { upload } from "../middleware/imageHelper.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/add", upload.array("images", 10), addProduct);
router.post("/update/:id", upload.array("images", 10), updateProduct);
router.delete("/delete/:id", deleteProduct);
router.get("/list", listProducts);
router.get("/getedit", editList);
router.get("/dashboardHome", dashboardHome);
router.get("/categorywiseproduct", categorywiseProduct);
router.get("/singleproudct", singlewiseProduct);
router.get("/globalsearch", globalProductsearch);
router.get("/showcasecategorywisereport", showCase);
//SingleCategoryProduct

export default router;
