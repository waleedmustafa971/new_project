import express from 'express';
import multer from "multer";
import uploadFiles from '../middleware/uploadvideo.js';
import uploadaudioFiles from '../middleware/videoaudiotextimage.js';
import { applyGreen, processAudioImagetext,
    getJobStatus, exportMusicVideo, exportMusicAudio, templatePosttoreel
 } from '../controllers/VideoProcessingController.js';

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/applygreenscreen",uploadFiles, applyGreen);
router.post("/image-audio-text-process",uploadaudioFiles, processAudioImagetext);
router.get('/job-status/:jobId', getJobStatus);
/* router.post(
  "/export-music-video",
  upload.single("video"),
  exportMusicVideo
); */
router.post(
  "/export-music-video",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "audio", maxCount: 5 },
  ]),
  exportMusicVideo
);

router.post("/export-music-audio", upload.fields([
    { name: "images", maxCount: 10 },
    { name: "audio", maxCount: 5 },
  ]),exportMusicAudio);

//templatePosttoreel
router.post("/template-post-to-reel", templatePosttoreel);


export default router;
