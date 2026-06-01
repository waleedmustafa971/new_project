import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import Slider from "../models/sliderModel.js";

import sharp from "sharp";

const optimizedDir = "uploads/slider/optimized";
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
export const addSlider = async (req, res) => {
  try {
    const { description, title } = req.body;

    const optimized = req.files && req.files.length > 0
      ? await optimizeImages(req.files)
      : [];

    const newSlider = new Slider({
      description,
      title,
      image: optimized,
    });

    const saved = await newSlider.save();
    res.status(201).json({ success: true, data: saved });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ------------------  UPDATE SLIDER (with SHARP) ------------------ */
export const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Slider.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Slider not found" });

    let images = existing.image;

    // Optimize and append new images
    if (req.files && req.files.length > 0) {
      const optimized = await optimizeImages(req.files);
      images = [...images, ...optimized];
    }

    // Deleting old images
    if (req.body.deleteImages) {
      const deleteImages = JSON.parse(req.body.deleteImages);

      images = images.filter(img => !deleteImages.includes(img));

      deleteImages.forEach(img => {
        const filePath = path.join(optimizedDir, img);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }

    const updated = await Slider.findByIdAndUpdate(
      id,
      {
        description: req.body.description || existing.description,
        title: req.body.title || existing.title,
        image: images,
      },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ------------------  LIST SLIDERS (unchanged) ------------------ */
export const listSliders = async (req, res) => {
  try {
    const { page = 1, limit = 10, userid, title } = req.query;

    const filter = {};
    if (userid) filter.userid = userid;
    if (title) filter.title = { $regex: title, $options: "i" };

    const sliders = await Slider.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Slider.countDocuments(filter);

    res.json({
      success: true,
      data: sliders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.params)

    const brand = await Slider.findByIdAndDelete(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    // Delete optimized images
    if (brand.image && brand.image.length > 0) {
      brand.image.forEach((imgFile) => {
        const filePath = path.join("uploads/brand/optimized", imgFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.json({ success: true, message: "Brand deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

