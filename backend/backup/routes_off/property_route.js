import express from "express";
import { addPropertyData, getGroupdata, updatePropertyData, getDraftbyuser, getList,
    deletePropertyAd, deletePropertyImage, updateStepone,
     RecommandList, getListadmin, getPropertydetails,
     updatePropertyStatus, updateHistory, AddFavourite,
     getFavouritelist, getViewHistory, getTopCategoriesByViews,
     getMyads, updatePropertyforrentData, updatePropertyforrentsteponeupdate,
     updatePropertyforsaleData, addClassified, updatePackage,
     updatePaymentprocess, filterData, sellerData,
     addSimilaradd
 } from "../controllers/property_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';



//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/addproperty', upload.array('images', 20), addPropertyData);
router.post('/update-payment-package/:id/package', authMiddleware, updatePackage);
router.post('/processtogetpayment', updatePaymentprocess);
router.post('/classifiedadd', upload.array('images', 20), addClassified);
router.post('/updatestep1', upload.array('images', 20), updateStepone);
router.post('/update_property_status', updatePropertyStatus);
router.post('/update_property_rent_details', updatePropertyforrentData);
router.post('/update_property_sale_details', updatePropertyforsaleData);
router.post('/property_rent_stepone_update', upload.array('images', 20), updatePropertyforrentsteponeupdate);
router.post('/property_rent_steptwo_update', updatePropertyforrentData);
router.post('/updatepropertyhistory', updateHistory);
router.post('/addpropertyfaviourites', authMiddleware, AddFavourite); 
router.get('/propertyfaviouriteslist', getFavouritelist); 
router.post('/similaradd/:id', addSimilaradd); 

router.get("/getproperty", getGroupdata);
router.post('/deleteimage/:id', deletePropertyImage);
router.get("/draft", getDraftbyuser); ///:userid/:status http://192.168.0.113:5000/apis/property/draft/6858084f41cc71c9c697da79/draft
router.get("/draft/:id/draft", getDraftbyuser); ///:userid/:status http://192.168.0.113:5000/apis/property/draft/6858084f41cc71c9c697da79/draft
router.get("/listofdraft/:status/:userid", getList); 
router.get("/myads", authMiddleware, getMyads); //authMiddleware, 
router.get("/gettopcategory",getTopCategoriesByViews)

router.get("/listofdraftadmin/:status", getListadmin); 
router.get("/viewuserviewhistory", getViewHistory); 

router.get("/property-details", getPropertydetails); 
router.get("/recommandproperty/:status", RecommandList); 
router.get("/delete_property/:id", authMiddleware, deletePropertyAd); 
router.post('/updateproperty', updatePropertyData);

//filter for property data
router.get('/filterproperty', filterData);
router.get('/sellerhistory', sellerData);


export default router