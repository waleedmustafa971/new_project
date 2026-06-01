import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import PropertyVideoModel from '../models/PropertyVdieoModal.js'
import Users from '../models/users.js';
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from "dotenv";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;


export const addVideo = async (req, res) => {
 try {
    const video = new PropertyVideoModel(req.body);
    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
export const updateVideo = async (req, res) => {
   try {
    const video = await PropertyVideoModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
export const addDelete = async (req, res) => {
    try {
    const video = await PropertyVideoModel.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json({ message: "Video deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
export const listVideo = async (req, res) => {
    try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1;
    const skip = (page - 1) * limit;

    const videos = await PropertyVideoModel.find()
      .sort({ xtime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // lean gives plain JS object

    // Add likeCount and commentCount
    const result = videos.map((v) => ({
      ...v,
      likeCount: v.likes?.length || 0,
      commentCount: v.comments?.length || 0,
    }));

    const total = await PropertyVideoModel.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.json({
      page,
      totalPages,
      total,
      videos: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
