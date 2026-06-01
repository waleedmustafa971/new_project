import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Imagelibrary from "../../models/Imagelibrary.js";
import multer from "multer";
import sharp from "sharp";
import fs from 'fs';
import path from 'path';
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const addImage = async (req, res) => {
  try {
    const {
      image_name,
      size,
      type,
      uploaded_by
    } = req.body;

    // 🔴 Check required field
    if (!image_name) {
      return res.status(400).json({ message: "image name is required" });
    }
    let imagePath = null;
    // ✅ Handle image upload (optional)
    if (req.files && req.files.length > 0) {
      const file = req.files[0];

      const fileName = `img_${Date.now()}.webp`;
      const uploadDir = "uploads/imagelibrary/";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    // ✅ Create category
    const category = new Imagelibrary({
      image_name,
      image_url: imagePath || "categories/default.png",
      size, // how to import here image size
      type, // type will be module
      uploaded_by
    });

    await category.save();

    return res.status(201).json({
      message: "created successfully",
      category,
    });
  } catch (error) {
    console.error("Add image error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateImage = async (req, res) => {
  try {
    const {  image_name, size,
      type,
      uploaded_by } = req.body;
    let updateFields = { image_name, size,
      type,
      uploaded_by };

    // If image is uploaded, optimize and include it
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const newFileName = `img_${Date.now()}.webp`;
      const outputPath = path.join("uploads/imagelibrary", newFileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path); // Delete original

      updateFields.image = `/uploads/imagelibrary/${newFileName}`;
    }

    const category = await Imagelibrary.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found!" });
    }

    res.status(200).json({
      message: "updated successfully!",
      category
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

}

export const getImageList = async (req, res) => {
  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.image_name || "";

    const skip = (page - 1) * limit;

    // 🔍 Filter condition (case-insensitive search)
    const filter = {
      image_name: { $regex: search, $options: "i" }
    };

    // Fetch filtered + paginated data
    const categories = await Imagelibrary.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Count with filter (IMPORTANT ⚠️)
    const total = await Imagelibrary.countDocuments(filter);

    return res.status(200).json({
      data: categories,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};