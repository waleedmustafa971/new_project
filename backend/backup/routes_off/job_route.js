import express from "express";
import { addJobData, addIndustryData, getIndustryData,
addJobPost, getListJob, getJcategory, AddJobCategory,
deleteJobcategory, getparSublist, getCategoryWithJobCount,
getListJobtitle, getEducationQualificationCount,
getJobtype
 } from "../controllers/job_controller.js";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import upload from '../config/multerCV.js';
//import multer from "multer";

//router.post('/addcv', upload.array('images', 1), addJobData); //upload only cv
router.post("/addcv", upload.single("cvfile"), addJobData);
router.post("/add_industrytype", addIndustryData);
router.get("/getindstrytype", getIndustryData);
router.get("/getjoblist", getListJob);
router.get("/searchjobtitle", getListJobtitle);
router.get("/getjobcategory", getJcategory);
router.get("/getlist", getparSublist);
router.get("/categorybyeducation", getEducationQualificationCount); //getJobtype
router.get("/getJobtype", getJobtype); //getJobtype
router.get("/getcategorywithcount", getCategoryWithJobCount)
router.post("/jobpost", addJobPost)
router.delete("/delete/:id", deleteJobcategory)
router.post("/add-job-category", upload.none(), AddJobCategory)

export default router