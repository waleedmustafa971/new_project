import express from 'express';
import { upload, mergeHandler, mergeAndOptimizeHandler, 
    convertHLSfile,convertHLSfilesigment,createVideo, uploadImages,
getUserTemplate } from '../controllers/video_controller.js';
import uploadaws from '../middleware/upload.js'; // example path
import authMiddleware from '../middleware/auth.js';
const router = express.Router();

/*
  Everything that accepts a file or spends ffmpeg time now requires a signed-in
  caller. These were all open: /convert-image-to-video in particular took an
  unlimited number of files of any type from anyone who could reach the port,
  wrote them under uploads/, and served them straight back from /uploads.
*/

router.post('/merge', authMiddleware, upload, mergeHandler);
//mergeAndOptimizeHandler

router.post('/merge_optimized', authMiddleware, upload, mergeAndOptimizeHandler);
//mergeAndOptimizeHandler
router.post('/converthls', authMiddleware, convertHLSfile);
router.post('/convertHLSfilesigment', authMiddleware, convertHLSfilesigment);
//router.post('/convert-image-to-video', uploadImages, createVideo);
router.post('/convert-image-to-video', authMiddleware, uploadaws.array('images'), createVideo);
router.get('/getusertemplate/:userId', getUserTemplate);


export default router;
