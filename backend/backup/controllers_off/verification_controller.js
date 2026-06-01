import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Verification from '../models/Verification.js';
import Users from '../models/users.js';
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import dotenv from "dotenv";

dotenv.config();

export const addData = async (req, res) => {

    try {
    const { body, files } = req;

    // ✅ Check for files
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // ✅ Check if userid already exists
    const existing = await Verification.findOne({ userid: body.userid });
    if (existing) {
      return res
        .status(201)
        .json({ error: "Verification already exists for this user" });
    }

    // ✅ Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(
          file.originalname,
          path.extname(file.originalname)
        );
        const webpFileName = `verify_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join("uploads/verify", webpFileName);

        await sharp(file.path)
          .resize(1024, 768, { fit: "inside" })
          .webp({ quality: 80 })
          .toFile(outputPath);

        fs.unlinkSync(file.path); // delete original upload

        return {
          slNo: index + 1,
          image: `/uploads/verify/${webpFileName}`,
        };
      })
    );

    // ✅ Create new verification entry (use lowercase variable)
    const verification = new Verification({
      ...body,
      images: optimizedImages,
    });

    await verification.save();

    return res.status(201).json({ message: "created", verification });
  } catch (error) {
    console.error("Error adding data:", error);
    res.status(201).json({ error: error.message });
  }

};


export const updateData = async (req, res) => {
  try {
    const { body, files } = req;
    const { _id } = req.body;
    
    if (!_id) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      // return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `verify_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/verify', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path); // Delete original uploaded file
        return {
          slNo: index + 1,
          image: `/uploads/verify/${webpFileName}`
        };
      })
    );

    const updateData = {
      ...body,
    };

    let updateQuery = {
      $set: updateData,
    };

    // If new files are uploaded, push them to the existing array
    if (files.length > 0) {
      updateQuery.$push = {
        images: { $each: optimizedImages }
      };
    }

    // Update ad
    const updatedAd = await Verification.findByIdAndUpdate(
      _id,
      updateQuery,
      { new: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    return res.status(200).json({ message: 'Ad updated', ad: updatedAd });


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updateStatus = async (req, res) => {
  try {
    const { body } = req;
    const { _id } = req.body;
    
    if (!_id) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const updateData = {
      ...body,
    };

    let updateQuery = {
      $set: updateData,
    };


    // Update ad
    const updatedAd = await Verification.findByIdAndUpdate(
      _id,
      updateQuery,
      { new: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    return res.status(200).json({ message: 'Ad updated', ad: updatedAd });


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const userid = req.query.userid || "";

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (userid) {
      filter.userid = userid;
    }
    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await Verification.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await Verification.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user Verification:", error);
    res.status(500).json({ message: "Error fetching user Verification" });
  }
};

export const deleteData = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if the ID is a valid MongoDB ObjectId
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid Verification ID" });
    }

    const deleted = await Verification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Verification not found" });
    }

    res.status(200).json({ message: "Verification deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting Verification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




