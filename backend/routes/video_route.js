import express from 'express';
import { upload, mergeHandler, mergeAndOptimizeHandler, 
    convertHLSfile,convertHLSfilesigment,createVideo, uploadImages,
getUserTemplate } from '../controllers/video_controller.js';
import uploadaws from '../middleware/upload.js'; // example path
const router = express.Router();

router.post('/merge', upload, mergeHandler);
//mergeAndOptimizeHandler

router.post('/merge_optimized', upload, mergeAndOptimizeHandler);
//mergeAndOptimizeHandler
router.post('/converthls', convertHLSfile);
router.post('/convertHLSfilesigment', convertHLSfilesigment);
//router.post('/convert-image-to-video', uploadImages, createVideo);
router.post('/convert-image-to-video', uploadaws.array('images'), createVideo);
router.get('/getusertemplate/:userId', getUserTemplate);


export default router;
