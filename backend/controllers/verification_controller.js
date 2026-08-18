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

/* ==================================================================== */
/* Verified Badge (blue tick) — mobile-facing social verification        */
/*                                                                       */
/* Separate from the business/trade-licence flow above: these write       */
/* kind:"social" documents into the same collection so the admin review   */
/* queue at /admin covers both.                                          */
/* ==================================================================== */

const VERIFY_DIR = "uploads/verify";

// Turn uploaded ID documents into optimised webp, same as the business flow.
const storeDocuments = async (files) => {
  if (!fs.existsSync(VERIFY_DIR)) fs.mkdirSync(VERIFY_DIR, { recursive: true });

  return Promise.all(
    (files || []).map(async (file, index) => {
      const baseName = path.basename(file.originalname, path.extname(file.originalname));
      const webpFileName = `verify_${Date.now()}_${index}_${baseName}.webp`;
      const outputPath = path.join(VERIFY_DIR, webpFileName);

      await sharp(file.path)
        .resize(1600, 1600, { fit: "inside" })
        .webp({ quality: 82 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);
      return { slNo: index + 1, image: `/uploads/verify/${webpFileName}` };
    })
  );
};

const SOCIAL_CATEGORIES = [
  "creator", "public_figure", "business", "news", "sports", "entertainment", "other",
];

/*
  POST /apis/verification/apply
  Submit (or resubmit) a blue-tick application.
*/
export const applyForBadge = async (req, res) => {
  try {
    const { files } = req;
    const {
      userid, fullName, knownAs, category, country,
      idDocumentType, notes, referenceLinks,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({ success: false, message: "A valid userid is required" });
    }
    if (!fullName || !category) {
      return res.status(400).json({ success: false, message: "fullName and category are required" });
    }
    if (!SOCIAL_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${SOCIAL_CATEGORIES.join(", ")}`,
      });
    }

    const user = await Users.findById(userid).select("verifiedBadge name").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.verifiedBadge) {
      return res.status(409).json({ success: false, message: "This account is already verified" });
    }

    const existing = await Verification.findOne({ userid, kind: "social" });
    if (existing && existing.status === "pending") {
      return res.status(409).json({
        success: false,
        message: "You already have an application under review",
        request: existing,
      });
    }

    // referenceLinks may arrive as a JSON string or repeated form fields
    let links = [];
    if (Array.isArray(referenceLinks)) links = referenceLinks;
    else if (typeof referenceLinks === "string" && referenceLinks.trim()) {
      try {
        const parsed = JSON.parse(referenceLinks);
        links = Array.isArray(parsed) ? parsed : [referenceLinks];
      } catch {
        links = referenceLinks.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const images = await storeDocuments(files);
    const payload = {
      userid, kind: "social",
      fullName, knownAs, category, country,
      idDocumentType, notes,
      referenceLinks: links,
      status: "pending",
      reviewNote: "",
      reviewedAt: null,
      createdBy: userid,
      createdAt: new Date(),
    };
    if (images.length) payload.images = images;

    // A rejected application can be resubmitted in place
    const request = existing
      ? await Verification.findByIdAndUpdate(existing._id, payload, { new: true })
      : await Verification.create(payload);

    return res.status(201).json({
      success: true,
      message: "Application submitted — we'll review it shortly",
      request,
    });
  } catch (error) {
    console.error("Error applying for badge:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/*
  GET /apis/verification/my-status?userid=...
  What the "Verification" screen shows the user.
*/
export const getBadgeStatus = async (req, res) => {
  try {
    const userid = req.query.userid || req.query.userId;
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({ success: false, message: "A valid userid is required" });
    }

    const user = await Users.findById(userid).select("verifiedBadge accountType").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const request = await Verification.findOne({ userid, kind: "social" })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      verified: !!user.verifiedBadge,
      accountType: user.accountType || "personal",
      // Nothing submitted yet, or the last decision
      status: request ? request.status : "none",
      canApply: !user.verifiedBadge && (!request || request.status === "rejected"),
      reviewNote: request?.reviewNote || "",
      submittedAt: request?.createdAt || null,
      reviewedAt: request?.reviewedAt || null,
      request: request || null,
      categories: SOCIAL_CATEGORIES,
    });
  } catch (error) {
    console.error("Error fetching badge status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/*
  POST /apis/verification/withdraw
  Pull a pending application back.
*/
export const withdrawBadgeRequest = async (req, res) => {
  try {
    const userid = req.body?.userid || req.body?.userId;
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({ success: false, message: "A valid userid is required" });
    }

    const request = await Verification.findOne({ userid, kind: "social", status: "pending" });
    if (!request) {
      return res.status(404).json({ success: false, message: "No pending application to withdraw" });
    }

    await Verification.findByIdAndDelete(request._id);
    return res.status(200).json({ success: true, message: "Application withdrawn" });
  } catch (error) {
    console.error("Error withdrawing badge request:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/*
  GET /apis/verification/badge?userIds=a,b,c
  Bulk badge lookup so feed and comment lists can render ticks in one call.
*/
export const getBadges = async (req, res) => {
  try {
    const raw = req.query.userIds || "";
    const ids = String(raw).split(",").map((s) => s.trim())
      .filter((s) => mongoose.Types.ObjectId.isValid(s));

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "userIds is required" });
    }

    const users = await Users.find({ _id: { $in: ids } })
      .select("verifiedBadge accountType")
      .lean();

    const badges = {};
    for (const u of users) {
      badges[String(u._id)] = {
        verified: !!u.verifiedBadge,
        accountType: u.accountType || "personal",
      };
    }

    return res.status(200).json({ success: true, badges });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return res.status(500).json({ success: false, message: error.message });
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




