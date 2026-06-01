import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import Brand from "../models/brandModal.js";

import sharp from "sharp";

const optimizedDir = "uploads/brand/optimized";
if (!fs.existsSync(optimizedDir)) fs.mkdirSync(optimizedDir, { recursive: true });

/* ------------ Helper: Optimize Images with Sharp ------------ */
const optimizeImages = async (files) => {
    const optimizedFiles = [];

    for (let file of files) {
        const inputPath = file.path;
        const outputFilename = file.filename.replace(/\.[^/.]+$/, "") + ".webp";
        const outputPath = path.join(optimizedDir, outputFilename);

        await sharp(inputPath)
            .resize(1200) // max width 1200px
            .webp({ quality: 80 })
            .toFile(outputPath);

        fs.unlinkSync(inputPath); // delete original uploaded file

        optimizedFiles.push(outputFilename);
    }

    return optimizedFiles;
};

/* ------------------  ADD SLIDER (with SHARP) ------------------ */
export const addBrand = async (req, res) => {
    try {
        const { name,status } = req.body;

        const optimized = req.files && req.files.length > 0
            ? await optimizeImages(req.files)
            : [];

        const newBrand = new Brand({
            name,
            image: optimized[0] || "", 
            status
        });

        const saved = await newBrand.save();
        res.status(201).json({ success: true, data: saved });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/* ------------------  UPDATE SLIDER (with SHARP) ------------------ */
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Brand.findById(id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Brand not found" });

    let image = existing.image;

    // If new image uploaded
    if (req.files && req.files.length > 0) {
      const optimized = await optimizeImages(req.files);
      image = optimized[0]; // store single filename
    }

    const updated = await Brand.findByIdAndUpdate(
      id,
      {
        name: req.body.name || existing.name,
        status: req.body.status || existing.status,
        image,
      },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Brand.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, message: "Brand deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ------------------  LIST SLIDERS (unchanged) ------------------ */
export const listBrand = async (req, res) => {
  try {
    let { page = 1, limit = 10, name } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    // Search by name
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    const brands = await Brand.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Brand.countDocuments(filter);

    res.json({
      success: true,
      data: brands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

