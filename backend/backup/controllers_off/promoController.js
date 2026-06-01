import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Promo from '../models/Promo.js';
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

// ------------------ CREATE ------------------
export const addPromo = async (req, res) => {
  console.log('....req body....' + JSON.stringify(req.body))
  try {
    const {
      promo_code,
      start_date,
      end_date,
    } = req.body;

    // ---------------------------------------
    // 1️⃣ Check Required Fields
    // ---------------------------------------
    if (!promo_code || !start_date || !end_date) {
      return res.status(400).json({
        message: "Promo Code, Start Date and End Date are required"
      });
    }

    // ---------------------------------------
    // 2️⃣ Check if promo_code already exists
    // ---------------------------------------
    const existingPromo = await Promo.findOne({ promo_code: promo_code.trim() });

    if (existingPromo) {
      return res.status(400).json({
        message: "Promo code already exists"
      });
    }

    // ---------------------------------------
    // 3️⃣ Validate Date order
    // ---------------------------------------
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start >= end) {
      return res.status(400).json({
        message: "End date must be greater than start date"
      });
    }

    // ---------------------------------------
    // 4️⃣ Save Promo
    // ---------------------------------------
    const promo = new Promo(req.body);
    await promo.save();

    return res.status(201).json({
      message: "Promo created successfully",
      data: promo
    });

  } catch (error) {
    console.error("Error creating promo:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// ------------------ UPDATE ------------------
export const updatePromo = async (req, res) => {
  try {
    const updated = await Promo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ------------------ UPDATE STATUS ------------
export const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    const updated = await Promo.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Promo not found" });
    }

    res.json({ message: "Status updated", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ LIST WITH PAGINATION -----
export const getList = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const status = req.query.status || "";

    const filter = {};

    if (search) {
      filter.promo_code = { $regex: search, $options: "i" };
    }
    if (status !== "") {
      filter.status = status;
    }

    const data = await Promo.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Promo.countDocuments(filter);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ DELETE ------------------
export const deletePromo = async (req, res) => {
  try {
    const deleted = await Promo.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Promo not found" });
    }

    res.json({ message: "Promo deleted", data: deleted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
