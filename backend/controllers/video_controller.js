import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import ffmpeg from '../helpers/ffmpeg.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
//import { uploadDir } from '../config/path.js'; // Assuming you have this configured
import { spawn } from 'child_process';
import UserTemplate from '../models/UserTemplate.js';
dotenv.config();

// ES module workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export const upload = multer({ storage }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

export const uploadImages = multer({ storage }).array('images', 3); // Accept up to 20 images

// Merge handler
export const mergeHandler = async (req, res) => {
  try {
    const videoFile = req.files.video?.[0];
    const audioFile = req.files.audio?.[0];

    if (!videoFile || !audioFile) {
      return res.status(400).json({ error: 'Missing video or audio file' });
    }

    const outputFileName = `merged-${Date.now()}.mp4`;
    const outputPath = path.join(uploadDir, outputFileName);

    console.log(`Saving merged video to: ${outputPath}`);

    ffmpeg()
      .input(videoFile.path)
      .input(audioFile.path)
      .outputOptions([
        '-y', // Overwrite output files without asking
        '-c:v copy',
        '-c:a aac',
        '-shortest',
      ])
      .output(outputPath)
      .on('start', (cmd) => console.log('FFmpeg command:', cmd))
      .on('end', async () => {
        try {
          const fileStream = fs.createReadStream(outputPath);
          const s3Key = `merged/${outputFileName}`;

          await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileStream,
            ContentType: 'video/mp4',
            ACL: 'public-read',
          }));

          // Cleanup
          [videoFile.path, audioFile.path, outputPath].forEach((p) => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          });

          return res.json({
            message: 'Merge complete',
            url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
          });
        } catch (err) {
          console.error('S3 Upload Error:', err);
          return res.status(500).json({ error: 'Failed to upload to S3' });
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg Error:', err);
        return res.status(500).json({
          error: 'FFmpeg processing failed',
          details: err.message,
        });
      })
      .run();



  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Unexpected server error' });
  }
};


export const mergeAndOptimizeHandler = async (req, res) => {
  const videoFile = req.files.video?.[0];
  const audioFile = req.files.audio?.[0];

  if (!videoFile || !audioFile) {
    return res.status(400).json({ error: 'Missing video or audio file' });
  }

  const mergedName = `merged-${Date.now()}.mp4`;
  const mergedPath = path.join(uploadDir, mergedName);

  const optimizedName = `optimized-${Date.now()}.mp4`;
  const optimizedPath = path.join(uploadDir, optimizedName);

  console.log('Merging video and audio...');

  ffmpeg()
    .input(videoFile.path)
    .input(audioFile.path)
    .outputOptions('-c:v copy', '-c:a aac', '-shortest')
    .on('end', () => {
      console.log('Merging done. Optimizing...');

      ffmpeg(mergedPath)
        .outputOptions([
          '-preset veryfast',
          '-movflags +faststart',
          '-crf 23',
          '-c:v libx264',
          '-c:a aac'
        ])
        .on('end', async () => {
          console.log('Optimization done. Uploading to S3...');

          try {
            const fileStream = fs.createReadStream(optimizedPath);
            const s3Key = `optimized/${optimizedName}`;

            await s3.send(
              new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Body: fileStream,
                ContentType: 'video/mp4',
                ACL: 'public-read',
              })
            );

            // Cleanup
            [videoFile.path, audioFile.path, mergedPath, optimizedPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));

            res.json({
              message: 'Optimized and uploaded',
              url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
            });
          } catch (err) {
            console.error('S3 Upload Error:', err);
            res.status(500).json({ error: 'Failed to upload to S3' });
          }
        })
        .on('error', err => {
          console.error('Optimization Error:', err);
          res.status(500).json({ error: 'Video optimization failed' });
        })
        .save(optimizedPath);
    })
    .on('error', err => {
      console.error('Merge Error:', err);
      res.status(500).json({ error: 'Video/audio merge failed', details: err.message });
    })
    .save(mergedPath);
};


export const convertHLSfile = async (req, res) => {
  try {
    const videoUrl = req.body.videoUrl; // expecting a public S3 MP4 URL in POST body

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl in request body' });
    }

    const hlsFolderName = `hls-${Date.now()}`;
    const hlsOutputDir = path.join(uploadDir, hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    const localInputPath = path.join(uploadDir, `input-${Date.now()}.mp4`);

    // Step 1: Download the MP4 file
    const videoStream = await fetch(videoUrl);
    if (!videoStream.ok) throw new Error('Failed to download video from URL');

    const fileStream = fs.createWriteStream(localInputPath);
    await new Promise((resolve, reject) => {
      videoStream.body.pipe(fileStream);
      videoStream.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    // Step 2: Convert to HLS using FFmpeg
    const hlsOutputPath = path.join(hlsOutputDir, 'index.m3u8');

    await new Promise((resolve, reject) => {
      ffmpeg(localInputPath)
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(hlsOutputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Step 3: Upload HLS files to S3
    const files = fs.readdirSync(hlsOutputDir);
    const s3Prefix = `hls/${hlsFolderName}/`;

    await Promise.all(
      files.map((file) => {
        const fullPath = path.join(hlsOutputDir, file);
        const body = fs.createReadStream(fullPath);
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

        return s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Prefix + file,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
          })
        );
      })
    );

    // Step 4: Cleanup
    fs.unlinkSync(localInputPath);
    fs.rmSync(hlsOutputDir, { recursive: true, force: true });

    const hlsUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}index.m3u8`;

    return res.json({ message: 'HLS conversion complete', url: hlsUrl });

  } catch (err) {
    console.error('HLS Conversion Error:', err);
    return res.status(500).json({ error: 'Failed to convert video to HLS', details: err.message });
  }
};

export const convertHLSfilesigment = async (req, res) => {
  try {
    const videoUrl = req.body.videoUrl;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl in request body' });
    }

    const timestamp = Date.now();
    const hlsFolderName = `hls-${timestamp}`;
    const hlsOutputDir = path.join(uploadDir, hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    const localInputPath = path.join(uploadDir, `input-${timestamp}.mp4`);

    // Step 1: Download the MP4 file
    const videoStream = await fetch(videoUrl);
    if (!videoStream.ok) throw new Error('Failed to download video from URL');

    const fileStream = fs.createWriteStream(localInputPath);
    await new Promise((resolve, reject) => {
      videoStream.body.pipe(fileStream);
      videoStream.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    // Step 2: Convert to Multi-Bitrate HLS
    const resolutions = [
      { name: '1080p', width: 1920, height: 1080, bitrate: 5000, maxrate: 5350, bufsize: 7500 },
      { name: '720p', width: 1280, height: 720, bitrate: 2800, maxrate: 2996, bufsize: 4200 },
      { name: '480p', width: 854, height: 480, bitrate: 1400, maxrate: 1498, bufsize: 2100 }
    ];

    const ffmpegCommand = ffmpeg(localInputPath);

    resolutions.forEach(({ name, width, height, bitrate, maxrate, bufsize }) => {
      ffmpegCommand.output(path.join(hlsOutputDir, `${name}.m3u8`))
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOption([
          `-vf scale=w=${width}:h=${height}`,
          `-b:v ${bitrate}k`,
          `-maxrate ${maxrate}k`,
          `-bufsize ${bufsize}k`,
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_flags independent_segments',
          `-hls_segment_filename ${path.join(hlsOutputDir, `${name}_%03d.ts`)}`
        ]);
    });

    await new Promise((resolve, reject) => {
      ffmpegCommand.on('end', resolve).on('error', reject).run();
    });

    // Step 3: Create Master Playlist
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8
`;

    fs.writeFileSync(path.join(hlsOutputDir, 'master.m3u8'), masterPlaylist);

    // Step 4: Upload HLS files to S3
    const files = fs.readdirSync(hlsOutputDir);
    const s3Prefix = `hls/${hlsFolderName}/`;

    await Promise.all(
      files.map((file) => {
        const fullPath = path.join(hlsOutputDir, file);
        const body = fs.createReadStream(fullPath);
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

        return s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Prefix + file,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
          })
        );
      })
    );

    // Step 5: Cleanup
    fs.unlinkSync(localInputPath);
    fs.rmSync(hlsOutputDir, { recursive: true, force: true });

    const masterUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}master.m3u8`;

    return res.json({ message: 'HLS conversion complete', url: masterUrl });

  } catch (err) {
    console.error('HLS Conversion Error:', err);
    return res.status(500).json({ error: 'Failed to convert video to HLS', details: err.message });
  }
};


export const createVideo_workingfine = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const timestamp = Date.now();
    const hlsFolderName = `hls-from-images-${timestamp}`;
    const hlsOutputDir = path.join(uploadDir, hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    // Rename uploaded files to sequential names: img1.jpg, img2.jpg, ...
    const renamedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i].path;
      const newFileName = `img${i + 1}.jpg`;
      const newPath = path.join(hlsOutputDir, newFileName);

      fs.renameSync(originalPath, newPath);
      renamedFiles.push(newPath);
    }

    // Ensure all files exist
    for (let file of renamedFiles) {
      if (!fs.existsSync(file)) {
        return res.status(500).json({ error: 'Image file missing after renaming' });
      }
    }

    const outputPlaylist = path.join(hlsOutputDir, 'index.m3u8');

    // Run FFmpeg to create HLS video
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(hlsOutputDir, 'img%d.jpg'))
        .inputOptions(['-framerate', '1/2', '-start_number', '1'])
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 5',
          '-hls_list_size 0',
          '-hls_segment_filename', path.join(hlsOutputDir, 'segment_%03d.ts'),
          '-f hls'
        ])
        .output(outputPlaylist)
        .on('start', cmd => console.log('FFmpeg command:', cmd))
        .on('end', () => {
          console.log('FFmpeg conversion finished.');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg Error:', err);
          reject(err);
        })
        .run();
    });

    // Upload HLS files to S3
    const filesToUpload = fs.readdirSync(hlsOutputDir);
    const s3Prefix = `hls/${hlsFolderName}/`;

    await Promise.all(
      filesToUpload.map(file => {
        const fullPath = path.join(hlsOutputDir, file);
        const body = fs.createReadStream(fullPath);
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

        return s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Prefix + file,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
          })
        );
      })
    );

    // Cleanup local files
    renamedFiles.forEach(filePath => fs.existsSync(filePath) && fs.unlinkSync(filePath));
    fs.rmSync(hlsOutputDir, { recursive: true, force: true });

    const hlsUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}index.m3u8`;

    return res.json({ message: 'Video created from images', url: hlsUrl });

  } catch (err) {
    console.error('Create Video Error:', err);
    return res.status(500).json({ error: 'Failed to create video', details: err.message });
  }
};

export const createVideo_sometimehavingissue = async (req, res) => {

  try {
    const files = req.files;
    const { durations, videoUrl } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    if (!durations || !videoUrl) {
      return res.status(400).json({ error: 'Durations and video URL are required' });
    }

    const durationArray = durations.split(',').map(d => parseFloat(d.trim()));
    if (durationArray.length !== files.length) {
      return res.status(400).json({ error: 'Durations count must match number of images' });
    }

    const timestamp = Date.now();
    const hlsFolderName = `hls-from-images-${timestamp}`;
    const hlsOutputDir = path.join('/var/www/139.59.223.130-node/uploads', hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    const renamedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i].path;
      const newFileName = `img${i + 1}.jpg`;
      const newPath = path.join(hlsOutputDir, newFileName);
      fs.renameSync(originalPath, newPath);
      renamedFiles.push(newPath.replace(/\\/g, '/'));
    }

    const filterParts = renamedFiles.map((file, index) => {
      return `[${index}:v]trim=duration=${durationArray[index]},setpts=PTS-STARTPTS[stream${index}]`;
    });

    const filterConcat = renamedFiles.map((_, index) => `[stream${index}]`).join('') + `concat=n=${renamedFiles.length}:v=1:a=0[outv]`;
    const filter = `${filterParts.join(';')};${filterConcat}`;

    const segmentPath = path.join(hlsOutputDir, 'segment_%03d.ts').replace(/\\/g, '/');
    const playlistPath = path.join(hlsOutputDir, 'index.m3u8').replace(/\\/g, '/');

    const ffmpegArgs = [
      ...renamedFiles.flatMap(file => ['-i', file]),
      '-i', videoUrl,
      '-y',
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', `${renamedFiles.length}:a?`, // ✅ SAFE: allow missing audio
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-shortest',
      '-hls_time', '5',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPath,
      '-f', 'hls',
      playlistPath
    ];

    console.log('Running FFmpeg with args:', ffmpegArgs);

    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        console.error(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('close', async (code) => {
        if (code === 0) {
          console.log('FFmpeg processing completed.');

          const filesToUpload = fs.readdirSync(hlsOutputDir);
          const s3Prefix = `hls/${hlsFolderName}/`;

          await Promise.all(
            filesToUpload.map(file => {
              const fullPath = path.join(hlsOutputDir, file);
              const body = fs.createReadStream(fullPath);
              const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

              return s3.send(
                new PutObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: s3Prefix + file,
                  Body: body,
                  ContentType: contentType,
                  ACL: 'public-read',
                })
              );
            })
          );

          renamedFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          });
          fs.rmSync(hlsOutputDir, { recursive: true, force: true });

          const hlsUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}index.m3u8`;

          return res.json({ message: 'Video created successfully', url: hlsUrl });
        } else {
          return reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('FFmpeg Process Error:', err);
        return reject(err);
      });
    });

  } catch (err) {
    console.error('Create Video Error:', err);
    return res.status(500).json({ error: 'Failed to create video', details: err.message });
  }
  //update 3:56 PM

};

export const createVideo_wrk = async (req, res) => {
  const uploadDir = '/var/www/139.59.223.130-node/uploads';
  try {
    const files = req.files;
    const { durations, videoUrl, userId } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    if (!durations || !videoUrl) {
      return res.status(400).json({ error: 'Durations and video URL are required' });
    }

    const durationArray = durations.split(',').map(d => parseFloat(d.trim()));
    if (durationArray.length !== files.length) {
      return res.status(400).json({ error: 'Durations count must match number of images' });
    }

    const timestamp = Date.now();
    const hlsFolderName = `hls-from-images-${timestamp}`;
    const hlsOutputDir = path.join(uploadDir, hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    // Rename files to img1.jpg, img2.jpg, ...
    const renamedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i].path;
      const newFileName = `img${i + 1}.jpg`;
      const newPath = path.join(hlsOutputDir, newFileName);

      fs.renameSync(originalPath, newPath);
      renamedFiles.push(newPath);
    }

    // Ensure files exist
    for (let file of renamedFiles) {
      if (!fs.existsSync(file)) {
        return res.status(500).json({ error: 'Image file missing after renaming' });
      }
    }

    // Build FFmpeg filter (force scale to 720x1280)
    const filterParts = renamedFiles.map((file, index) => {
      return `[${index}:v]scale=720:1280,trim=duration=${durationArray[index]},setpts=PTS-STARTPTS[stream${index}]`;
    });

    const filterConcat = renamedFiles.map((_, index) => `[stream${index}]`).join('') + `concat=n=${renamedFiles.length}:v=1:a=0[outv]`;

    const filter = `${filterParts.join(';')};${filterConcat}`;

    const playlistPath = path.join(hlsOutputDir, 'index.m3u8');
    const segmentPath = path.join(hlsOutputDir, 'segment_%03d.ts');

    // Build FFmpeg command arguments
    const ffmpegArgs = [
      ...renamedFiles.flatMap(file => ['-i', file]),
      '-i', videoUrl, // Audio input last
      '-y',
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', `${renamedFiles.length}:a?`, // Safe audio mapping
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-shortest',
      '-hls_time', '15',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPath,
      '-f', 'hls',
      playlistPath
    ];

    console.log('Running FFmpeg with args:', ffmpegArgs);

    // Run FFmpeg via spawn
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stdout.on('data', (data) => console.log(`FFmpeg stdout: ${data}`));
      ffmpegProcess.stderr.on('data', (data) => console.error(`FFmpeg stderr: ${data}`));

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('FFmpeg process completed.');
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });

    // Upload HLS files to S3
    const filesToUpload = fs.readdirSync(hlsOutputDir);
    const s3Prefix = `hls/${hlsFolderName}/`;

    await Promise.all(
      filesToUpload.map(file => {
        const fullPath = path.join(hlsOutputDir, file);
        const body = fs.createReadStream(fullPath);
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

        return s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Prefix + file,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
          })
        );
      })
    );

    // Cleanup local files
    renamedFiles.forEach(filePath => fs.existsSync(filePath) && fs.unlinkSync(filePath));
    fs.rmSync(hlsOutputDir, { recursive: true, force: true });

    const hlsUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}index.m3u8`;
    //insert into template
    const newTemplate = new UserTemplate({
      userId: userId,
      templateVideoUrl: hlsUrl,
      status: 'draft'
    });
    await newTemplate.save();
    //end template
    console.log({ message: 'Video created successfully', url: hlsUrl });
    return res.json({ message: 'Video created successfully', url: hlsUrl });
  } catch (err) {
    console.error('Create Video Error:', err);
    return res.status(500).json({ error: 'Failed to create video', details: err.message });
  }
};

export const createVideo_of_forNow = async (req, res) => {
  // Use absolute path for processing, but we'll save relative path in DB
  const rootUploadDir = path.resolve('./uploads/hls/');

  try {
    const files = req.files;
    const { durations, videoUrl, userId } = req.body;

    // 1. Validations
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    if (!durations || !videoUrl) {
      return res.status(400).json({ error: 'Durations and video URL are required' });
    }

    /*  const durationArray = durations.split(',').map(d => parseFloat(d.trim()));
     if (durationArray.length !== files.length) {
       return res.status(400).json({ error: 'Durations count must match number of images' });
     } */

    let durationArray = [];

    try {
      if (typeof durations === "string") {
        durationArray = JSON.parse(durations);
      } else {
        durationArray = durations;
      }
    } catch (e) {
      durationArray = durations.split(',').map(d => parseFloat(d));
    }

    if (durationArray.length !== files.length) {
      return res.status(400).json({ error: 'Durations count must match number of images' });
    }

    // 2. Setup Local Directory
    const timestamp = Date.now();
    const hlsFolderName = `hls-${userId}-${timestamp}`;
    const hlsOutputDir = path.join(rootUploadDir, hlsFolderName);

    if (!fs.existsSync(hlsOutputDir)) {
      fs.mkdirSync(hlsOutputDir, { recursive: true });
    }

    // 3. Move/Rename images to the specific HLS folder
    const renamedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i].path;
      const newFileName = `img${i + 1}${path.extname(files[i].originalname) || '.jpg'}`;
      const newPath = path.join(hlsOutputDir, newFileName);

      fs.renameSync(originalPath, newPath);
      renamedFiles.push(newPath);
    }

    // 4. Build FFmpeg filter
    const filterParts = renamedFiles.map((file, index) => {
      return `[${index}:v]loop=1:size=1:start=0,scale=720:1280,setsar=1,trim=duration=${durationArray[index]},setpts=PTS-STARTPTS[stream${index}]`;
    });

    const filterConcat = renamedFiles.map((_, index) => `[stream${index}]`).join('') +
      `concat=n=${renamedFiles.length}:v=1:a=0[outv]`;

    const filter = `${filterParts.join(';')};${filterConcat}`;

    const playlistPath = path.join(hlsOutputDir, 'index.m3u8');
    const segmentPath = path.join(hlsOutputDir, 'segment_%03d.ts');

    // 5. Build FFmpeg arguments
    const ffmpegArgs = [
      ...renamedFiles.flatMap(file => ['-framerate', '25', '-i', file]), // Increased framerate for smoother transitions
      '-i', videoUrl,
      '-y',
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', `${renamedFiles.length}:a?`,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'veryfast',
      '-crf', '23',
      '-shortest',
      '-hls_time', '4',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPath,
      '-f', 'hls',
      playlistPath
    ];

    // 6. Run FFmpeg
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      // Optional: logging for debugging
      ffmpegProcess.stderr.on('data', (data) => console.log(`FFmpeg: ${data}`));

      ffmpegProcess.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`FFmpeg failed with code ${code}`));
      });
    });

    // 7. Cleanup the temporary renamed images (optional, keep if you want them)
    renamedFiles.forEach(file => fs.unlinkSync(file));

    // 8. Generate Local URL/Path for DB
    // Assuming your server serves "/uploads" as a static route
    const localHlsUrl = `/uploads/hls/${hlsFolderName}/index.m3u8`;

    // 9. Save/Update DB
    // Using findOneAndUpdate if you want to update existing draft or create new
    const updatedTemplate = await UserTemplate.findOneAndUpdate(
      { userId: userId, status: 'draft' }, // Filter
      {
        templateVideoUrl: localHlsUrl,
        status: 'active', // Mark as active once done
        updatedAt: new Date()
      },
      { upsert: true, new: true } // Create if doesn't exist
    );

    return res.json({
      message: 'Video created locally',
      url: localHlsUrl,
      data: updatedTemplate
    });

  } catch (err) {
    console.error('Create Video Error:', err);
    return res.status(500).json({ error: 'Failed to create video', details: err.message });
  }
};

export const createVideo = async (req, res) => {
  const rootUploadDir = path.resolve("./uploads/hls/");

  try {
    const files = req.files;
    let { durations, videoUrl, userId } = req.body;

    console.log("BODY:", req.body);

    // ✅ 1. Validations
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    if (!durations || !videoUrl) {
      return res.status(400).json({ error: "Durations and video URL are required" });
    }

    // ✅ 2. Parse durations safely
    let durationArray = [];

    try {
      if (typeof durations === "string") {
        durationArray = JSON.parse(durations);
      } else {
        durationArray = durations;
      }
    } catch (err) {
      durationArray = durations.split(",").map((d) => parseFloat(d));
    }

    if (durationArray.length !== files.length) {
      return res.status(400).json({
        error: "Durations count must match number of images",
      });
    }

    // ✅ 3. Create HLS folder
    const timestamp = Date.now();
    const hlsFolderName = `hls-${userId}-${timestamp}`;
    const hlsOutputDir = path.join(rootUploadDir, hlsFolderName);

    if (!fs.existsSync(hlsOutputDir)) {
      fs.mkdirSync(hlsOutputDir, { recursive: true });
    }

    // ✅ 4. Move & rename images
    const renamedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i].path;
      const newFileName = `img${i + 1}.jpg`;
      const newPath = path.join(hlsOutputDir, newFileName);

      fs.renameSync(originalPath, newPath);
      renamedFiles.push(newPath);
    }

    // ✅ 5. Build FFmpeg input args (IMPORTANT FIX)
    const inputArgs = renamedFiles.flatMap((file, index) => [
      "-loop",
      "1",
      "-t",
      durationArray[index].toString(),
      "-i",
      file,
    ]);

    // ✅ 6. Build filter (scale + fps)
    const filterParts = renamedFiles.map((_, index) => {
      return `[${index}:v]scale=720:1280,fps=25,format=yuv420p[v${index}]`;
    });

    const concatPart =
      renamedFiles.map((_, i) => `[v${i}]`).join("") +
      `concat=n=${renamedFiles.length}:v=1:a=0[outv]`;

    const filter = `${filterParts.join(";")};${concatPart}`;

    // ✅ 7. Output paths
    const playlistPath = path.join(hlsOutputDir, "index.m3u8");
    const segmentPath = path.join(hlsOutputDir, "segment_%03d.ts");

    // ✅ 8. Build FFmpeg command
    const ffmpegArgs = [
      ...inputArgs,

      // 🔥 MUX support
      "-protocol_whitelist",
      "file,http,https,tcp,tls",

      "-i",
      videoUrl,

      "-y",
      "-filter_complex",
      filter,

      "-map",
      "[outv]",
      "-map",
      `${renamedFiles.length}:a?`,

      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",

      "-c:a",
      "aac",
      "-shortest",

      "-r",
      "25",

      "-hls_time",
      "4",
      "-hls_list_size",
      "0",
      "-hls_segment_filename",
      segmentPath,
      "-f",
      "hls",
      playlistPath,
    ];

    console.log("FFmpeg Command:", ffmpegArgs.join(" "));

    // ✅ 9. Run FFmpeg
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.stderr.on("data", (data) => {
        console.log("FFmpeg:", data.toString());
      });

      ffmpegProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed with code ${code}`));
      });
    });

    // ✅ 10. Cleanup temp images
    renamedFiles.forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    // ✅ 11. Generate URL
    const localHlsUrl = `/uploads/hls/${hlsFolderName}/index.m3u8`;

    // ✅ 12. Save to DB
    const updatedTemplate = await UserTemplate.findOneAndUpdate(
      { userId: userId, status: "draft" },
      {
        templateVideoUrl: localHlsUrl,
        status: "active",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: "Video created successfully",
      url: localHlsUrl,
      data: updatedTemplate,
    });

  } catch (err) {
    console.error("Create Video Error:", err);

    return res.status(500).json({
      error: "Failed to create video",
      details: err.message,
    });
  }
};

export const getUserTemplate = async (req, res) => {
  try {
    const { userId } = req.params;

    // Pagination parameters
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    console.log('..userId...', userId);
    console.log('..page...', page, '..limit...', limit);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch templates with pagination
    const templates = await UserTemplate.find({ userId: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createtimedate: -1 }); // Optional: latest first

    // Get total count
    const totalTemplates = await UserTemplate.countDocuments({ userId: userId });

    return res.json({
      templates,
      currentPage: page,
      totalPages: Math.ceil(totalTemplates / limit),
      totalTemplates
    });
  } catch (err) {
    console.error('Fetch Templates Error:', err);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Helper function to check if video input has audio
async function checkVideoHasAudio(videoUrl) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      if (err) {
        console.error('FFprobe Error:', err);
        return resolve(false);
      }
      const hasAudio = metadata.streams.some(stream => stream.codec_type === 'audio');
      resolve(hasAudio);
    });
  });
}
