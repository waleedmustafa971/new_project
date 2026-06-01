import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import LiveStream from "../models/LiveStream.js";
import multer from "multer";
import AWS from 'aws-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();

// AWS S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,  //AKIAU6VTTOMEQBYUYF6T
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/* setup is for aws server */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });
/* End setup is for aws server */

export const createLiveStream = async (req, res) => {
    try {
        const { 
            hostId, hostName, hostAvatar, streamUrl, thumbnail, title, location, coins 
        } = req.body;

        // Create a new stream object
        const newStream = new LiveStream({
            id: `stream${Date.now()}`, // Unique ID based on timestamp
            host: {
                id: hostId,
                name: hostName,
                avatar: hostAvatar,
                followers_count: 0,
                is_following: false
            },
            stream_url: streamUrl || '',
            thumbnail: thumbnail || 'https://example.com/default-thumbnail.jpg',
            title,
            location,
            coins: Number(coins) || 0,
            viewers_count: 0,
            request_boxes: 5,
            messages: [],
            status: 'Active',
            enteredby: new Date(),
            updateby: new Date(),
            xtime: new Date(),
        });

        // Save to MongoDB
        await newStream.save();

        return res.status(201).json({
            success: true,
            message: 'Live stream created successfully',
            data: newStream
        });
    } catch (error) {
        console.error('Create Live Stream Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const getStream = async (req, res) => {

     try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = search
            ? { id: { $regex: search, $options: 'i' } } // Case-insensitive partial match
            : {};

        const liveStreams = await LiveStream.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ enteredby: -1 }); // Optional: Latest first
    if (liveStreams.length === 0) {
      return res.status(201).json({ message: "No live stream found" });
    }
      
        const total = await LiveStream.countDocuments(query);

        res.json({
            data: liveStreams,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
        });
    } catch (error) {
        console.error('Error fetching live streams:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}







