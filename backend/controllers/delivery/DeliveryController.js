import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../../models/users.js";
import mongoose from "mongoose";
import Rider from "../../models/delivery/Rider.js";
import Orderfood from "../../models/foodorderModal.js";
import multer from "multer";
import sharp from "sharp";
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;
import Category from '../../models/food/FoodCategory.js'

import fetch from "node-fetch";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // store in env


export const addDeliveryboyRegistration = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      vehicleType,
      licenseNumber,
    } = req.body;

    // 🔴 Validation
    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Name, phone and password are required",
      });
    }

    // 🔴 Check duplicate
    if (email) {
      const exists = await Rider.findOne({ email });
      if (exists) {
        return res.status(400).json({
          message: "Rider already exists with this email",
        });
      }
    }

    let imagePath = null;

    // 📸 Handle image upload
    if (req.files && req.files.length > 0) {
      const file = req.files[0];

      const fileName = `rider_${Date.now()}.webp`;
      const uploadDir = "uploads/riders";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(500, 500, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create rider
    const rider = new Rider({
      name,
      email,
      password: hashedPassword,
      phone,
      vehicleType: vehicleType || "bike",
      licenseNumber: licenseNumber || null,
      image: imagePath || null,
    });

    await rider.save();

    return res.status(201).json({
      message: "Rider registered successfully",
      rider,
    });
  } catch (error) {
    console.error("Rider registration error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//RiderList
export const RiderList = async (req, res) => {
 try {
    // 👉 Query params
    const {
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const skip = (page - 1) * limit;

    // 🔍 Search filter (name, email, phone)
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // 📦 Fetch riders
    const riders = await Rider.find(searchFilter)
      .select("-password") // hide password
      .sort({ createdAt: -1 }) // latest first
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // 📊 Total count
    const total = await Rider.countDocuments(searchFilter);

    return res.status(200).json({
      message: "Riders fetched successfully",
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      riders,
    });
  } catch (error) {
    console.error("Get riders error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export const orderList_old = async (req, res) => {
  try {
    const riderId = req.params.id;

    // 📌 pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // 📦 get orders
    const orders = await Orderfood.find({
      deliveryboyid: riderId
    })
      .populate("userid deliveryboyid")
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    // 📊 total count
    const total = await Orderfood.countDocuments({
      deliveryboyid: riderId
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const orderList = async (req, res) => {
  try {
    const riderId = req.params.id;

    // 📌 pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 📦 orders with deep populate
    const orders = await Orderfood.find({
      deliveryboyid: riderId
    })
      .populate("userid deliveryboyid")
      .populate({
        path: "products.productId",
        model: "Fooditems",
        populate: {
          path: "restaurant_id",
          model: "Restaurant"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 📊 total count
    const total = await Orderfood.countDocuments({
      deliveryboyid: riderId
    });

    // 🎯 Clean response (optional but recommended)
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderid: order.orderid,
      orderdate: order.orderdate,
      ordertime: order.ordertime,
      orderstatus: order.orderstatus,
      deliveryfee: order.deliveryfee,

      user: {
        name: order.userid?.name,
        email: order.userid?.email
      },

      rider: {
        name: order.deliveryboyid?.name,
        phone: order.deliveryboyid?.phone
      },

      payment: order.payment,

      products: order.products.map(p => ({
        qty: p.qty,
        price: p.price,

        product: {
          _id: p.productId?._id,
          name: p.productId?.item_name,
          image: p.productId?.item_image,
          final_price: p.productId?.final_price,

          restaurant: {
            name: p.productId?.restaurant_id?.restaurant_name,
            image: p.productId?.restaurant_id?.restaurant_image
          }
        }
      }))
    }));

    return res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Order List Error:", error);
    res.status(500).json({ message: error.message });
  }
};


export const riderStatusChange = async (req, res) => {
  try {
    const { riderId, isOnline } = req.body;

    if (!riderId) {
      return res.status(400).json({ message: "Rider ID is required" });
    }

    const rider = await Rider.findByIdAndUpdate(
      riderId,
      { isOnline },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.json({
      success: true,
      message: "Status updated",
      data: rider
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//updateRiderLocation

export const updateRiderLocation = async (req, res) => {
  try {
    const { riderId, latitude, longitude } = req.body;

    // 🔴 Validation
    if (!riderId || latitude == null || longitude == null) {
      return res.status(400).json({
        message: "riderId, latitude and longitude are required"
      });
    }

    // 📍 Update location (IMPORTANT: lng first, lat second)
    const rider = await Rider.findByIdAndUpdate(
      riderId,
      {
        location: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    return res.json({
      success: true,
      message: "Location updated successfully",
      location: rider.location
    });

  } catch (error) {
    console.error("Location update error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
