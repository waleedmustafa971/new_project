import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import Support from '../models/Support.js';
import TicketReply from '../models/TicketReply.js'
//import User from "../models/Users.js";
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
//console.log('SECRET_KEY property :', SECRET_KEY);
//console.log('LEMON_SQUEEZY_API_KEY :', process.env.LEMON_SQUEEZY_API_KEY);
//console.log('LEMON_SQUEEZY_STORE_ID : ', process.env.LEMON_SQUEEZY_STORE_ID);


export const addData = async (req, res) => {
  try {
    const { body, files } = req;

    let optimizedImages = [];

    if (Array.isArray(files) && files.length > 0) {
      // Process and optimize images to WebP format
      optimizedImages = await Promise.all(
        files.map(async (file, index) => {
          const baseName = path.basename(file.originalname, path.extname(file.originalname));
          const webpFileName = `support_${Date.now()}_${baseName}.webp`;
          const outputPath = path.join("uploads/support", webpFileName);

          await sharp(file.path)
            .resize(1024, 768, { fit: "inside" })
            .webp({ quality: 80 })
            .toFile(outputPath);

          fs.unlinkSync(file.path); // Delete original uploaded file
          return {
            slNo: index + 1,
            image: `/uploads/support/${webpFileName}`,
          };
        })
      );
    }

    // Create new ad
    const ad = new Support({
      ...body,
      images: optimizedImages.length > 0 ? optimizedImages : null,
    });

    await ad.save();
    return res.status(201).json({ message: "Add support", ad });
  } catch (error) {
    console.error("Error adding property data:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getTicketreplydata = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ticket ID format" });
  }

  try {
    // Fetch ticket with user details (name, email, image)
    const ticket = await Support.findById(id)
      .populate("user", "name email image") // added image
      .lean();
    //console.log('...ticket...' + JSON.stringify(ticket));
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Fetch all replies with user details (name, email, image)
    const replies = await TicketReply.find({ ticket: id })
      .populate("user", "name email image") // added image
      .sort({ createdAt: 1 })
      .lean();

    // Final JSON response
    res.json({ ...ticket, replies });
  } catch (err) {
    console.error("Error fetching ticket replies:", err);
    res.status(500).json({ error: err.message });
  }
};

//Reply Tickets
export const replyData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  if (!req.params) {
    return res.status(404).json({ message: 'ID Not Found' });
  }
  try {
    const { id } = req.params; // ticket ID
    const { user, message, attachments } = req.body;

    console.log('id' + id + '----user---'+ user + '----'+ message)

    const reply = new TicketReply({
      ticket: id,
      user,
      message,
      attachments,
      createdBy: user,
    });

    await reply.save();

    // Update ticket status when admin replies
    await Support.findByIdAndUpdate(id, { status: "Answered", updateBy: user });

    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


export const updateData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const {
      departmenttype, Subject, status, Message
    } = req.body;

    const updatedProperty = await Support.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        departmenttype, Subject, status, Message
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Support not found' });
    }

    res.status(200).json({
      message: 'Support updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating Support:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}

export const updateStatus = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const { id, status } = req.body;
    console.log('.....property controller ...... ' + id + '...status....' + status)
    const updatedProperty = await Support.findByIdAndUpdate(
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
      return res.status(404).json({ message: 'support not found' });
    }

    res.status(200).json({
      message: 'support updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating support:', error);
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
    const userid = req.query.userid || "";

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (userid) {
      filter.user = userid;
    }
    if (searchQuery) {
      filter.Subject = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await Support.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await Support.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user Support:", error);
    res.status(500).json({ message: "Error fetching user Support" });
  }
};


export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if the ID is a valid MongoDB ObjectId
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid Support ID" });
    }

    const deleted = await Support.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Support not found" });
    }

    res.status(200).json({ message: "Support deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting Support:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};










