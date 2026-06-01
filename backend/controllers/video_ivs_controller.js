import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import Reel from "../models/Reels.js";
import multer from "multer";
import AWS from 'aws-sdk';

//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
//import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();

// Set your AWS credentials securely via environment variables
AWS.config.update({
  region: 'ap-south-1', //IVS server region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const ivs = new AWS.IVS();

export const createStm = async (req, res) => {
  try {
    // Create a channel (this also returns a stream key)
    const channelResponse = await ivs.createChannel({
      name: `channel-${Date.now()}`,
      latencyMode: 'LOW',
      type: 'STANDARD',
    }).promise();

    const { channel, streamKey } = channelResponse;

    res.json({
      streamUrl: channel.playbackUrl,
      ingestEndpoint: channel.ingestEndpoint,
      streamKey: streamKey.value,
      channelArn: channel.arn
    });
  } catch (error) {
    console.error('IVS error:', error);
    res.status(500).json({ error: 'Stream creation failed', details: error.message });
  }
};










