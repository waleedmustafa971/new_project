import express from "express";
import { addPropertyData, getGroupdata, updatePropertyData, getDraftbyuser, getList,
    deletePropertyAd, deletePropertyImage, updateStepone,
     RecommandList, getListadmin, getPropertydetails,
     updatePropertyStatus, updateHistory, AddFavourite,
     getFavouritelist, getViewHistory, getTopCategoriesByViews,
     getMyads, updatePropertyforrentData, updatePropertyforrentsteponeupdate,
     updatePropertyforsaleData, addClassified, updatePackage,
     updatePaymentprocess, filterData, sellerData,
     addSimilaradd,GlobalSearchList, propertyList,
     recentPropertyList, globalsearchbyGroup, getMyownads, getMarketPlacedata,
     updatePropertyImage
 } from "../controllers/property_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multer.js';



//router.post("/addproperty",addPropertyData) //updateOwnMusic
router.post('/addproperty', upload.array('images', 20), addPropertyData);
router.post('/update-payment-package/:id/package', authMiddleware, updatePackage);
router.post('/processtogetpayment', updatePaymentprocess);
router.post('/classifiedadd', upload.array('images', 20), addClassified);
router.post('/updatestep1', upload.array('images', 20), updateStepone); //updatePropertyImage
router.post('/updatePropertyImage', upload.array('images', 20), updatePropertyImage); //
router.post('/update_property_status', authMiddleware,updatePropertyStatus);
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
router.get("/draft", getDraftbyuser); 
router.get("/draft/:id/draft", getDraftbyuser); 
router.get("/myown-ads/:id/live", getMyownads); 
router.get("/listofdraft/:status/:userid", getList); 
router.get("/myads", authMiddleware, getMyads);  
router.get("/gettopcategory", getTopCategoriesByViews) 
router.get("/getMarketPlacedata",getMarketPlacedata)

router.get("/listofdraftadmin/:status", getListadmin); 
router.get("/viewuserviewhistory", authMiddleware, getViewHistory); 

router.get("/property-details", getPropertydetails); 
router.get("/recommandproperty/:status", RecommandList);  //authMiddleware, 
router.get("/propertyfilter/:status", propertyList);  //authMiddleware, recentPropertyList
router.get("/nearbyproperty/:status", recentPropertyList);  //authMiddleware, 
router.get("/delete_property/:id", authMiddleware, deletePropertyAd); 
router.post('/updateproperty', updatePropertyData);

router.get("/property-global-search-by-group", globalsearchbyGroup);  //authMiddleware, 
router.get("/global-search-list/:status", GlobalSearchList)

//filter for property data
router.get('/filterproperty', filterData);
router.get('/sellerhistory', sellerData);


export default router