import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Music from '../models/Music.js';
import User from '../models/users.js'
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
    if (file.fieldname === 'gallery') {
      cb(null, 'uploads/gallery');
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
  { name: 'gallery', maxCount: 1 }
]);


export const addGallery = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const { userid } = req.body;

      const user = await User.findById(userid);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!req.files || !req.files['gallery'] || req.files['gallery'].length === 0) {
        return res.status(400).json({ message: 'No image uploaded' });
      }

      const imageUrl = `${req.files['gallery'][0].filename}`;

      user.gallery.push(imageUrl);
      await user.save();

      res.status(200).json({ message: 'Image uploaded successfully', imageUrl });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};


export const deleteGallery = async(req, res) => {
  try {
        const { userid, imageid } = req.query;
        
        console.log('--userid---' + userid + '---' + imageid)
        const user = await User.findById(userid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const imageUrl = user.gallery.find(url => url.includes(imageid));
        if (!imageUrl) return res.status(404).json({ message: 'Image not found' });

        // Remove file from storage
        const filePath = './uploads/gallery/' + path.basename(imageUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from gallery array
        user.gallery = user.gallery.filter(url => !url.includes(imageid));
        await user.save();

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
}


export const getGallery = async (req, res) => {
    /* 
      http://192.168.0.104:5000/apis/gallery/get-gallery?userid=67f772ab25b7e3f3b5f04783&page=1&limit=10    
    */
  try {
        const { userid, page = 1, limit = 12 } = req.query;
        const user = await User.findById(userid);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const totalImages = user.gallery.length;
        const totalPages = Math.ceil(totalImages / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);

        const paginatedGallery = user.gallery.slice(startIndex, endIndex);

        res.json({ gallery: paginatedGallery, totalPages });
    } catch (error) {
        console.error('Error fetching gallery:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};






