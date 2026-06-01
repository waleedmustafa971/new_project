import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Music from '../models/Music.js';
const SECRET_KEY =
  "yutuytuyddfsdsfd646545646545sdssasa435434tbuytyutbyaf34assxd43443"; // Replace with a secure secret key
import multer from "multer";
import AWS from 'aws-sdk';

//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();

//console.log('Bucket Name:', process.env.S3_BUCKET_NAME);

// AWS S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,  //AKIAU6VTTOMEQBYUYF6T
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profile') {
      cb(null, 'uploads/music/bannerpicture');
    } else if (file.fieldname === 'audio') {
      cb(null, 'uploads/music');
    }
  }, //uploads/music/bannerpicture  uploads/music
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

// Middleware for multiple file types
const upload = multer({ storage }).fields([
  { name: 'profile', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);


export const updateOwnMusic = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    const profileFile = req.files?.profile?.[0];
    const audioFile = req.files?.audio?.[0];

    if (!profileFile || !audioFile) {
      return res.status(400).json({ error: 'Both files are required' });
    }

    try {
      //  uploads/music
   //   const imageUrl = `/uploads/music/${req.file.filename}`;
      const profileUrl = `/uploads/music/bannerpicture/${profileFile.filename}`;
      const audioUrl = `/uploads/music/${audioFile.filename}`;

      const music = new Music({
        musicname: req.body.musicname,
        musicfile: audioUrl,
        status: req.body.status || 'Active',
        music_group: req.body.music_group || '',
        type: req.body.type || '',
        username: req.body.username || '',
        image: profileUrl, // Save file path
        
      });
  
      await music.save();
      res.status(200).json({ success: true, music });
     /*  const { email } = req.body;
      const imageUrl = `/profilepicture/${req.file.filename}`;

      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { image: imageUrl } },
        { new: true }
      );

      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });

      res.json({ message: "User updated successfully", user: updatedUser }); */
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

export const getMusic = async (req, res) => {
  //GET http://localhost:8800/api/auth/users?page=1&limit=5
  //GET http://localhost:8800/api/auth/users?page=1&limit=5&search=john
  try {
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || ""; // Get search query

    // Filtering condition: If search query exists, filter by name or email
    const filter = searchQuery
      ? {
          $or: [
            { musicname: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
            { email: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};
    const users = await Music.find(filter)
    //  .select("-password")
      .skip(skip)
      .limit(limit);
    // Get total count of filtered users
    const totalMusic = await Music.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      totalMusic,
      totalPages: Math.ceil(totalMusic / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  }
};






