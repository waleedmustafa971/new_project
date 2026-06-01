import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Videodata from '../models/Video.js';
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();


export const addVideoData = async (req, res) => {
    try {
        const { body, files } = req;

        console.log('Request Body:', JSON.stringify(body));
        console.log('Uploaded Files:', JSON.stringify(files));

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Process and optimize the single uploaded image
        const file = files[0];
        const newFileName = `optimized_${Date.now()}_${file.originalname}`.replace(/\s+/g, '_'); // Remove spaces
        const outputPath = path.join('uploads/video', newFileName);

        await sharp(file.path)
            .resize(1024, 768, { fit: 'inside' })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Remove the original (unoptimized) image
        fs.unlinkSync(file.path);

        const ad = new Videodata({
            ...body,
            bannerImage: `/uploads/video/${newFileName}`,
        });

        await ad.save();
        res.status(201).json({ message: 'Video created successfully', ad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


export const getVideodata = async (req, res) => {

     try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = {
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ]
        };
        const videos = await Videodata.find(query)
            .sort({ uploadedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Videodata.countDocuments(query);
        res.json({
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            videos
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};






