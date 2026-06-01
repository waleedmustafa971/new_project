import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Package from '../models/Package.js';
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

export const addPackageData = async (req, res) => {
  
    if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }  
  try {
    const { body } = req;

      // Create new ad
      const ad = new Package({
        ...body
       // images: optimizedImages,
      });
      await ad.save();
      return res.status(200).json({ message: 'insert', data: ad });
    }
   catch (error) {
    console.error('Error adding data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updatePackageData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
   try {
    req.body.updateby = new Date();
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
 }

export const updateStatus = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const { id, status } = req.body;
    console.log('.....property controller ...... ' + id + '...status....' + status)
    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        status
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}


export const getList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await Package.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await Package.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data:users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};

export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if the ID is a valid MongoDB ObjectId
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const deleted = await Package.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "package not found" });
    }

    res.status(200).json({ message: "Package deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};






