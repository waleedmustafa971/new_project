import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import productchat from '../models/productchat.js';
import PropertyAds from '../models/PropertyAds.js';
import PropertyFavourite from '../models/propertyfavourite.js'
import Category from '../models/Category.js'
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
import User from "../models/users.js";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;


export const sendMessage = async (req, res) => {
  try {
    const { productId, senderId, receiverId, message, messageType } = req.body;

    // Try to find existing chat
    let chat = await productchat.findOne({
      productId,
      participants: { $all: [senderId, receiverId] },
    });

    if (chat) {
      // Update existing chat
      chat.messages.push({
        senderId,
        receiverId,
        message,
        messageType: messageType || "text",
      });
      chat.lastMessage = message;
      chat.lastMessageAt = new Date();
      await chat.save();
    } else {
      // Create new chat
      chat = new productchat({
        productId,
        participants: [senderId, receiverId],
        messages: [
          {
            senderId,
            receiverId,
            message,
            messageType: messageType || "text",
          },
        ],
        lastMessage: message,
        lastMessageAt: new Date(),
      });
      await chat.save();
    }

    res.status(200).json({ success: true, chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};


export const sendMessage__off = async (req, res) => {
    try {
        const { productId, senderId, receiverId, message, messageType } = req.body;
        const chat = await productchat.findOneAndUpdate(
            {
                productId,
                participants: { $all: [senderId, receiverId] },
            },
            {
                $push: { messages: { senderId, receiverId, message, messageType: messageType || "text" } },
                $set: { lastMessage: message, lastMessageAt: new Date() },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );

        // Handle participants for upsert separately
        if (!chat) {
            const newChat = new productchat({
                productId,
                participants: [senderId, receiverId],
                messages: [{ senderId, receiverId, message, messageType: messageType || "text" }],
                lastMessage: message,
                lastMessageAt: new Date(),
            });
            await newChat.save();
            return res.status(200).json({ success: true, chat: newChat });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getMessages_____offf = async (req, res) => {
    const { productId, userId, otherUserId } = req.params;

    const chat = await productchat.findOne({
        productId, // i want to get PropertyAds and also want to add pagination
        participants: { $all: [userId, otherUserId] },
    })
        .populate("messages.senderId", "name")
        .populate("messages.receiverId", "name");

    res.json(chat || { messages: [] });
};

/**
 * GET CHAT MESSAGES WITH PRODUCT (PAGINATED)
 * /apis/productchat/product-chat/:productId/:userId/:otherUserId?page=1&limit=10
 */
export const getMessages = async (req, res) => {
  try {
    const { productId, userId, otherUserId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

    /* --------------------------------
       1️⃣ FETCH PRODUCT (ONCE)
    -------------------------------- */
    const productResult = await productchat.aggregate([
      {
        $match: {
          productId: productObjectId,
          participants: { $all: [userObjectId, otherUserObjectId] },
        },
      },
      {
        $lookup: {
          from: "propertyads",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          product: {
            _id: "$product._id",
            shortTitle: "$product.shortTitle",
            images: "$product.images",
            price: "$product.price",
            currency: "$product.currency",
          },
        },
      },
    ]);

    const product = productResult[0]?.product || null;

    /* --------------------------------
       2️⃣ COUNT TOTAL MESSAGES
    -------------------------------- */
    const countResult = await productchat.aggregate([
      {
        $match: {
          productId: productObjectId,
          participants: { $all: [userObjectId, otherUserObjectId] },
        },
      },
      { $project: { total: { $size: "$messages" } } },
    ]);

    const totalMessages = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalMessages / limit);

    /* --------------------------------
       3️⃣ FETCH PAGINATED MESSAGES
    -------------------------------- */
    const messages = await productchat.aggregate([
      {
        $match: {
          productId: productObjectId,
          participants: { $all: [userObjectId, otherUserObjectId] },
        },
      },
      { $unwind: "$messages" },
      { $sort: { "messages.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit },

      // Sender
      {
        $lookup: {
          from: "users",
          localField: "messages.senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      { $unwind: "$sender" },

      // Receiver
      {
        $lookup: {
          from: "users",
          localField: "messages.receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      { $unwind: "$receiver" },

      {
        $project: {
          _id: "$messages._id",
          message: "$messages.message",
          messageType: "$messages.messageType",
          isRead: "$messages.isRead",
          createdAt: "$messages.createdAt",
          sender: {
            _id: "$sender._id",
            name: "$sender.name",
          },
          receiver: {
            _id: "$receiver._id",
            name: "$receiver.name",
          },
        },
      },
    ]);

    /* --------------------------------
       4️⃣ RESPONSE
    -------------------------------- */
    res.status(200).json({
      success: true,
      page,
      limit,
      totalMessages,
      totalPages,
      product,   // 👈 ONLY ONCE
      messages,  // 👈 PAGINATED
    });

  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const getUserChats = async (req, res) => {
    const { userId } = req.params;
    console.log('....userid getuserchats ..... ', userId)

    const chats = await productchat.find({
        participants: userId,
    })
        .populate("participants", "name")
        .populate("productId", "shortTitle images")
        .sort({ lastMessageAt: -1 });

    res.json(chats);
}

export const markAsSeen = async (req, res) => {
    const { chatId, userId } = req.body;

    await productchat.updateOne(
        { _id: chatId },
        {
            $set: {
                "messages.$[msg].isRead": true,
            },
        },
        {
            arrayFilters: [{ "msg.receiverId": userId }],
        }
    );

    res.json({ success: true });
};

export const unreadCount = async (req, res) => {
    const { userId } = req.params;

    const count = await productchat.aggregate([
        { $unwind: "$messages" },
        {
            $match: {
                "messages.receiverId": mongoose.Types.ObjectId(userId),
                "messages.isRead": false,
            },
        },
        { $count: "unread" },
    ]);

    res.json({ unread: count[0]?.unread || 0 });
};

