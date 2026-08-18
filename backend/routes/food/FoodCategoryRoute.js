import express from "express";
import { addCategory,updateCategory, 
  deleteCategory, getCategoryList,
  addResturant,addRestaurantCategory,
  addFoodcuisines, addRestaurantcuisines, addBrandResturant,
  getDashboardList, addPromo, getActivePromos,
  addFoodItem, listFoodItems, alllistFoodItems,
  getResturantLists, getItemcuisines, getCuisinesList,
  getCategorywisefilter, getBrandwisefilter, updateResturant,
  getItemname, getNearbyrestaurants, getDiscountRestaurant,
  getListofbrand, addNewcompany, listCompany, updateCompany, getCategoryResturant,
  getPromos, getListofbrandsetup
       } from "../../controllers/food/FoodCategoryController.js";
import authMiddleware from '../../middleware/auth.js';
//import upload from '../../config/multer.js';
import upload from '../../config/food/FoodCategoryupload.js';


const router = express.Router()

router.post("/addcategory", authMiddleware, upload.array('images', 1), addCategory) 
router.post("/updatecategory/:id", authMiddleware, upload.array('images', 1), updateCategory) 
router.delete("/delete/:id", authMiddleware, deleteCategory)
router.get("/getcategorylist", getCategoryList) //authMiddleware, 
router.get("/getcuisineslist", getCuisinesList) //authMiddleware, Cuisines
router.get("/getdashboardlist", getDashboardList) //authMiddleware, 
router.get("/list-of-brand", getListofbrand) //authMiddleware, Resturant brand selected
router.get("/list-of-brand-setup", getListofbrandsetup) //authMiddleware, Resturant brand selected

router.post("/addnewresturant", upload.array('images', 1), addResturant)  //authMiddleware, 
router.post("/vendor-signup", upload.array('images', 1), addResturant)  //authMiddleware, 
router.put("/update-resturant/:id", upload.single("images"), updateResturant);

router.get("/get-resturant-lists", getResturantLists) //authMiddleware, 
router.post("/addRestaurantCategory", addRestaurantCategory) //authMiddleware, 
router.get("/get-categorywise-resturant-lists", getCategoryResturant) //authMiddleware, 


router.post("/addfoodcuisines", authMiddleware, upload.array('images', 1), addFoodcuisines) 
router.post("/addrestaurantcuisines", authMiddleware, addRestaurantcuisines)

router.post("/addbrand", authMiddleware, upload.array('images', 1), addBrandResturant) 
router.post("/add-promo", authMiddleware, addPromo) //getActivePromos
router.get("/get-active-promo", authMiddleware, getActivePromos) //getActivePromos

// food Items
router.post("/add-new-item", authMiddleware, upload.array('images', 1), addFoodItem)  //upload.array('images', 1), 
router.get("/get-items-by-resturants", listFoodItems)  
router.get("/get-items-by-categories", getCategorywisefilter)
router.get("/get-items-by-brand", getBrandwisefilter)  
router.get("/get-items-by-cuisines", getItemcuisines)
router.get("/get-all-items", authMiddleware, alllistFoodItems) 
router.get("/get-global-search-items", getItemname) 
router.get("/nearby-restaurants", getNearbyrestaurants)  
router.get("/discount-nearby-restaurants", getDiscountRestaurant)  

//offer promo

router.get("/get-offer-data", getPromos)  

//company
router.post("/addcompany", authMiddleware, upload.array('images', 1), addNewcompany) 
router.get("/listofcompany", authMiddleware, listCompany) 
router.put(
  "/updatecompany/:id",
  authMiddleware,
  upload.array("images", 1),
  updateCompany
);

export default router