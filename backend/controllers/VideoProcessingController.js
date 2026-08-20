import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import ffmpeg from '../helpers/ffmpeg.js';
//import { exec } from 'child_process';
import fetch from 'node-fetch';
import Reel from "../models/Reels.js";
import User from "../models/users.js";

import { spawn } from 'child_process';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reels"); // make sure folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const applyGreen = async (req, res) => {
  try {
    const video = req.files.video[0].path;
    const bg = req.files.background[0].path;

    // Directories
    const tempDir = 'uploads/tempvideo';
    const outputDir = 'uploads/outputgreen';

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const tempVideo = `${tempDir}/temp_${Date.now()}.mp4`;
    const output = `${outputDir}/output_${Date.now()}.mp4`;

    const color = req.body.color || '0x00FF00';

    // ---------- STEP 1: Transcode to fast / clean format ----------
    await new Promise((resolve, reject) => {
      ffmpeg(video)
        .videoCodec('libx264')
        .outputOptions([
          '-preset ultrafast',
          '-pix_fmt yuv420p',
          '-movflags +faststart'
        ])
        .save(tempVideo)
        .on('end', resolve)
        .on('error', reject);
    });

    // ---------- STEP 2: Apply green screen ----------
    ffmpeg(tempVideo)
      .input(bg)
      .complexFilter([
        `[0:v]chromakey=${color}:0.3:0.2[fg]`,
        `[1:v][fg]overlay=shortest=1`
      ])
      .videoCodec('libx264')
      .outputOptions([
        '-preset veryfast',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ])
      .on('end', () => {
        // Optional: cleanup temp file
        fs.unlink(tempVideo, () => { });

        return res.json({
          success: true,
          videoUrl: output
        });
      })
      .on('error', (err) => {
        console.error(err);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      })
      .save(output);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const processAudioImagetext = async (req, res) => {
  try {
    console.log("Body:", req.body);
    console.log("Files:", req.files);

    // ✅ Ensure req.files is always an object
    const files = req.files || {};

    const audio =
      files.audio && files.audio.length > 0
        ? files.audio[0].path
        : null;

    const image =
      files.image && files.image.length > 0
        ? files.image[0].path
        : null;

    const text = req.body?.text || "Hello World";
    const fontSize = req.body?.fontSize
      ? Number(req.body.fontSize)
      : 48;
    const color = req.body?.color || "black";

    const jobId = Date.now().toString();

    res.json({
      success: true,
      jobId,
      message: "Video processing started",
    });

    processVideoInBackground({
      jobId,
      audio,
      image,
      text,
      fontSize,
      color,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const processVideoInBackground_oofff = ({ jobId, audio, image, text }) => {

  const output = path.join('uploads/tempvideo/', `${jobId}.mp4`);
  ffmpeg()
    .input(image)
    .loop(5)
    .input(audio)
    .outputOptions([
      '-c:v libx264',
      '-c:a aac',
      '-shortest'
    ])
    .save(output)
    .on('end', () => {
      console.log('✅ Video ready:', output);

      // 🔔 Notify app here
      notifyUser(jobId, output);
    })
    .on('error', err => {
      console.error('❌ FFmpeg error:', err);
    });
};

const processVideoInBackground = ({ jobId, audio, image, text }) => {
  const output = path.join('uploads/tempvideo/', `${jobId}.mp4`);

  let command = ffmpeg();

  // ✅ CASE 1: If image exists
  if (image) {
    command = command.input(image).loop(5);
  } else {
    // If no image → generate black background
    command = command.input('color=c=black:s=1280x720:d=5')
      .inputFormat('lavfi');
  }

  // ✅ CASE 2: If audio exists
  if (audio) {
    command = command.input(audio);
  }

  // ✅ Video filters
  const filters = [];

  // ✅ Add text overlay if exists
  if (text) {
    filters.push(
      `drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`
    );
  }

  if (filters.length > 0) {
    command = command.videoFilters(filters);
  }

  // ✅ Output options
  const outputOptions = ['-c:v libx264'];

  if (audio) {
    outputOptions.push('-c:a aac', '-shortest');
  }

  command
    .outputOptions(outputOptions)
    .save(output)
    .on('end', () => {
      console.log('✅ Video ready:', output);
      notifyUser(jobId, output);
    })
    .on('error', err => {
      console.error('❌ FFmpeg error:', err);
    });
};


const jobs = {};

const notifyUser = (jobId, output) => {
  jobs[jobId] = {
    status: 'completed',
    output,
  };
};

export const getJobStatus = (req, res) => {
  const job = jobs[req.params.jobId];

  if (!job) {
    return res.json({ status: 'processing' });
  }

  res.json(job);
};

export const exportMusicVideo = async (req, res) => {
  try {
    if (!req.files?.video?.[0]) {
      return res.status(400).json({ error: "Video file missing" });
    }
    const videoFile = req.files.video[0];
    const audioFile = req.files.audio?.[0];
    const imageFiles = req.files.images || [];

    // -------------------------
    // OUTPUT PATH (ABSOLUTE PATH)
    // -------------------------
    const outputPath = path.join(
      process.cwd(),
      "uploads/tempvideo/music",
      `final_${Date.now()}.mp4`
    );

    // -------------------------
    // BUILD FFMPEG COMMAND
    // -------------------------
    let command = ffmpeg(videoFile.path);

    imageFiles.forEach(img => {
      command = command.input(img.path);
    });

    if (audioFile) {
      command = command.input(audioFile.path);
    }

    // ✅ WAIT UNTIL MP4 IS FULLY CREATED
    await new Promise((resolve, reject) => {
      command
        .outputOptions([
          "-map 0:v:0",
          audioFile ? "-map 1:a:0" : "-map 0:a?",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-shortest",
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("MP4 CREATED:", outputPath);
    console.log("Exists:", fs.existsSync(outputPath));

    // -------------------------
    // SAVE TO DATABASE
    // -------------------------
    const {
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople = "[]",
      location,
      sharegroup = "[]",
      posttypechild,
      ispost,
      videosound,
      textoverlays = "[]",
      emojioverlays = "[]",
      isimagefile, status_draft_publish
    } = req.body;

    const newReel = await Reel.create({
      videoUrl: outputPath,
      videoTitle,
      username,
      sound,
      posttype,
      location,
      posttypechild,
      ispost,
      videosound: false,
      isimagefile,
      tagpeople: JSON.parse(tagpeople),
      sharegroup: JSON.parse(sharegroup),
      textoverlays: JSON.parse(textoverlays),
      emojioverlays: JSON.parse(emojioverlays),
      status: "processing", status_draft_publish
    });

    // ✅ SEND RESPONSE IMMEDIATELY
    res.status(201).json({
      message: "Reel uploaded, processing HLS in background",
      data: newReel,
    });
     console.log({
      message: "Reel uploaded, processing HLS in background",
      data: newReel,
    });

    // 🔥 START HLS IN BACKGROUND (DO NOT AWAIT)
    convertToHLS(outputPath, newReel._id);

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Video processing failed" });
  }
};

const convertToHLS = async (inputPath, videoId) => {
  ///var/www/api.dokandarapps.com/uploads/tempvideo/music/final_1770809485435.mp4
  try {
    console.log("HLS STARTED for:", inputPath);

    if (!fs.existsSync(inputPath)) {
      throw new Error("Input file not found: " + inputPath);
    }

    const timestamp = Date.now();
    const hlsFolder = `hls-${timestamp}`;
    const hlsDir = path.join(process.cwd(), "uploads/hls", hlsFolder);

    fs.mkdirSync(hlsDir, { recursive: true });

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(path.join(hlsDir, "master.m3u8"))
        /*
          Each array entry is passed to ffmpeg as one argument — fluent-ffmpeg
          does not split on whitespace. "-flag value" survives that only while
          the value itself has no spaces, and this project's path does
          ("new project"), so the segment filename arrived as one unrecognised
          option and every HLS conversion failed with exit code 2880417800.
          Flags and values are separate entries now.
        */
        .outputOptions([
          "-preset", "veryfast",
          "-g", "48",
          "-sc_threshold", "0",
          "-map", "0:v:0",
          "-map", "0:a:0?",
          "-c:v", "libx264",
          "-c:a", "aac",
          "-hls_time", "6",
          "-hls_playlist_type", "vod",
          "-hls_segment_filename", path.join(hlsDir, "segment_%03d.ts"),
        ])
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const hlsUrl = `/uploads/hls/${hlsFolder}/master.m3u8`;

   const res = await Reel.findByIdAndUpdate(videoId, {
      videoUrl: hlsUrl,
      status: "ready",
      videosound: true
    });

    console.log("HLS READY:", hlsUrl);
    console.log('update database', res)

    // 🔥 OPTIONAL: delete original MP4 to save space
    // fs.unlinkSync(inputPath);

  } catch (err) {
    console.error("HLS Conversion Error:", err);

    await Reel.findByIdAndUpdate(videoId, {
      status: "failed",
    });
  }
};


export const exportMusicAudio = async (req, res) => {
  try {
    const {
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople = "[]",
      location,
      sharegroup = "[]",
      posttypechild,
      ispost,
      videosound,
      textoverlays = "[]",
      emojioverlays = "[]",
      isimagefile
    } = req.body;

    const images = req.files?.images || [];
    const audioFiles = req.files?.audio || [];

    if (!images.length) {
      return res.status(400).json({ error: "Image file is required" });
    }

    if (!videoTitle || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const imagePath = images[0].path;
    const audioPath = audioFiles[0]?.path || null;

    // 1️⃣ Save reel first
    const newReel = await Reel.create({
      videoUrl: imagePath, // temporary
      videoTitle,
      username,
      sound,
      posttype,
      location,
      posttypechild,
      ispost,
      videosound: false,
      isimagefile,
      tagpeople: JSON.parse(tagpeople),
      sharegroup: JSON.parse(sharegroup),
      textoverlays: JSON.parse(textoverlays),
      emojioverlays: JSON.parse(emojioverlays),
      status: "processing"
    });

    // 2️⃣ Respond immediately
    res.status(201).json({
      message: "Reel uploaded, processing in background",
      data: newReel,
    });

    // 3️⃣ 🔥 BACKGROUND PROCESS (NO await)
    convertHLSMusic({
      reelId: newReel._id,
      imagePath,
      audioPath,
      textOverlays: JSON.parse(textoverlays)
    }).catch(err => {
      console.error("FFmpeg background error:", err);
    });

  } catch (error) {
    console.error("Upload reel error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const convertHLSMusic = async ({
  reelId,
  imagePath,
  audioPath,
  textOverlays
}) => {
  console.log("...start to convert HLS ....", )
  console.log('reelId', reelId, 'imagePath', imagePath, 'audioPath',audioPath, 'textOverlays',textOverlays)
  const hlsFolderName = reelId.toString();
  const hlsOutputDir = path.join("uploads/hls", hlsFolderName);
  fs.mkdirSync(hlsOutputDir, { recursive: true });

  const tempVideo = path.join(hlsOutputDir, "base.mp4");

  // 1️⃣ IMAGE → VIDEO (10 sec loop)
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop(10)
      .input(audioPath || undefined)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-shortest"
      ])
      .save(tempVideo)
      .on("end", resolve)
      .on("error", reject);
  });

  // 2️⃣ TEXT OVERLAYS
  let drawTextFilters = textOverlays.map(t =>
    `drawtext=text='${t.text}':x=${t.x}:y=${t.y}:fontsize=${t.fontSize}:fontcolor=${t.color}`
  );

  // 3️⃣ HLS CONVERSION
  await new Promise((resolve, reject) => {
    ffmpeg(tempVideo)
      .videoFilters(drawTextFilters)
      .outputOptions([
        "-hls_time 6",
        "-hls_list_size 0",
        "-hls_flags independent_segments",
        "-hls_segment_filename",
        path.join(hlsOutputDir, "seg_%03d.ts")
      ])
      .save(path.join(hlsOutputDir, "master.m3u8"))
      .on("end", resolve)
      .on("error", reject);
  });

  // 4️⃣ UPDATE DB
  const masterUrl = `/uploads/hls/${hlsFolderName}/master.m3u8`;

  await Reel.findByIdAndUpdate(reelId, {
    videoUrl: masterUrl,
    videosound: true,
    status: "ready"
  });
};


export const templatePosttoreel = async(req, res) => {
    console.log('....req body...', JSON.stringify(req.body))
    const {
      videoTitle, video,
      username,
      sound,
      posttype,
      tagpeople,
      location,
      sharegroup,
      posttypechild,
      ispost,
      videosound,
      textoverlays,
      emojioverlays, isimagefile
    } = req.body;

      try {
    
        const newReel = new Reel({
          videoUrl: video, videoTitle,username,sound,posttype,location,posttypechild,ispost,
          videosound,tagpeople: JSON.parse(tagpeople || "[]"),
          sharegroup: JSON.parse(sharegroup || "[]"),
          textoverlays: JSON.parse(textoverlays || "[]"),
          emojioverlays: JSON.parse(emojioverlays || "[]"),
        });
  
        const savedReel = await newReel.save();
  
        return res.status(201).json({
          message: "optimized successfully",
          url: video,
          data: savedReel,
        });
      } catch (error) {
        console.error("Sharp Upload Error:", error);
        return res.status(500).json({
          message: "Image upload failed",
          error: error.message,
        });
      }
      //end Image
}








