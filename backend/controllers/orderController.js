import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import Order from "../models/orderModal.js"; //foodorderModal
import Orderfood from "../models/foodorderModal.js"; //
import FoodCartModal from "../models/FoodCartModal.js"; //FoodCartModal
import mongoose from "mongoose";
import Product from "../models/productModel.js";

const generateOrderId = async () => {
  // Find last order sorted by createdAt
  const lastOrder = await Order.findOne().sort({ createdAt: -1 });

  if (!lastOrder || !lastOrder.orderid) {
    return "ORD-000001"; // first order
  }

  // Extract number part
  const lastNumber = parseInt(lastOrder.orderid.replace("ORD-", ""), 10);

  // Increase
  const newNumber = lastNumber + 1;

  // Return formatted ID
  return `ORD-${String(newNumber).padStart(6, "0")}`;
};

export const addOrder = async (req, res) => {
  try {
    // Generate new order ID
    const newOrderId = await generateOrderId();

    // Insert order
    const order = await Order.create({
      ...req.body,
      orderid: newOrderId
    });

    return res.status(201).json({
      message: "Order created successfully",
      data: order
    });
  } catch (err) {
    console.error("Add order error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { orderid } = req.params;

    const updated = await Order.findOneAndUpdate(
      { orderid },
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Order not found" });

    return res.status(200).json({
      message: "Order updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("Update order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { orderid } = req.params;

    const deleted = await Order.findOneAndDelete({ orderid });

    if (!deleted)
      return res.status(404).json({ message: "Order not found" });

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const orderList = async (req, res) => {
  try {
    const {
      query = "",
      page = 1,
      limit = 10,
      userid = "",
      startDate,
      endDate,
      orderstatus,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (query.trim()) {
      filter.orderid = { $regex: query, $options: "i" };
    }

    if (userid && mongoose.Types.ObjectId.isValid(userid)) {
      filter.userid = userid;
    }

    if (orderstatus) {
      filter.orderstatus = orderstatus;
    }

    if (startDate || endDate) {
      filter.orderdate = {};
      if (startDate) filter.orderdate.$gte = new Date(startDate);
      if (endDate) filter.orderdate.$lte = new Date(endDate);
    }

    const data = await Order.find(filter)
      .populate({
        path: "products.productId",
        select: "productname images price", // ✅ only required fields
      })
      .populate({
        path: "products.vendorId",
        select: "shopName commission", // ✅ vendor fields
      })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      message: "Order list fetched",
      data,
      pagination: {
        currentPage: pageNum,
        totalPage: Math.ceil(total / limitNum),
        totalItems: total,
      },
    });
  } catch (err) {
    console.error("Order list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const orderfoodList = async (req, res) => {
    try {
    const {
      query = "",
      page = 1,
      limit = 10,
      userid = "",
      startDate,
      endDate,
      orderstatus,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (query.trim()) {
      filter.orderid = { $regex: query, $options: "i" };
    }

    if (userid && mongoose.Types.ObjectId.isValid(userid)) {
      filter.userid = userid;
    }

    if (orderstatus) {
      filter.orderstatus = orderstatus;
    }

    if (startDate || endDate) {
      filter.orderdate = {};
      if (startDate) filter.orderdate.$gte = new Date(startDate);
      if (endDate) filter.orderdate.$lte = new Date(endDate);
    }

    const data = await Orderfood.find(filter)
      .populate({
        path: "products.productId",
        select: "item_name item_image price discount final_price", // ✅ only required fields
      })
      .populate({
        path: "products.vendorId",
        select: "restaurant_name restaurant_image manual_address contact_person_name", // ✅ vendor fields
      })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Orderfood.countDocuments(filter);

    return res.status(200).json({
      message: "Order list fetched",
      data,
      pagination: {
        currentPage: pageNum,
        totalPage: Math.ceil(total / limitNum),
        totalItems: total,
      },
    });
  } catch (err) {
    console.error("Order list error:", err);
    return res.status(500).json({ message: "Server error" });
  }

}

export const addOrUpdateReview_update_only_product_collection = async (req, res) => {
  try {
    const { productId, rating, comment, userId } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: "Product ID & rating required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existingReview = product.reviews.find(
      r => r.userId.toString() === userId
    );

    if (existingReview) {
      // 🔄 UPDATE REVIEW
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = new Date();
    } else {
      // ➕ ADD REVIEW
      product.reviews.push({
        userId,
        rating,
        comment
      });
    }

    // ⭐ Recalculate average rating
    product.rating =
      product.reviews.reduce((sum, r) => sum + r.rating, 0) /
      product.reviews.length;

    await product.save();

    res.status(200).json({
      message: "Review saved successfully",
      rating: product.rating,
      reviews: product.reviews
    });

  } catch (error) {
    console.error("Review Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addOrUpdateReview = async (req, res) => {
  try {
    const { orderId, productId, userId, rating, comment } = req.body;
    console.log(req.body)
    if (!orderId || !productId || !userId || !rating) {
      return res.status(400).json({
        message: "orderId, productId, userId and rating are required"
      });
    }

    /* =====================================================
       1️⃣ VERIFY ORDER & PRODUCT EXISTS IN ORDER
    ===================================================== */
    const order = await Order.findOne({
      _id: orderId,
      userid: userId,
      "products.productId": productId
    });

    if (!order) {
      console.log("Order or product not found for this user")
      return res.status(404).json({
        message: "Order or product not found for this user"
      });
    }

    /* =====================================================
       2️⃣ UPDATE REVIEW INSIDE ORDER (product-wise)
    ===================================================== */
    await Order.updateOne(
      {
        "_id": orderId,
        "products.productId": productId
      },
      {
        $set: {
          "products.$.review": {
            rating,
            comment,
            reviewedAt: new Date()
          }
        }
      }
    );

    /* =====================================================
       3️⃣ UPDATE PRODUCT COLLECTION REVIEW
    ===================================================== */
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingReview = product.reviews.find(
      r => r.userId.toString() === userId
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.createdAt = new Date();
    } else {
      product.reviews.push({
        userId,
        rating,
        comment
      });
    }

    // ⭐ Recalculate average rating
    product.rating =
      product.reviews.reduce((sum, r) => sum + r.rating, 0) /
      product.reviews.length;

    await product.save();

    /* =====================================================
       4️⃣ RESPONSE
    ===================================================== */
    return res.status(200).json({
      message: "Review submitted successfully",
      productRating: product.rating
    });

  } catch (error) {
    console.error("Review Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const generateOrderIdfood = async () => {
  const lastOrder = await Orderfood.findOne().sort({ createdAt: -1 });

  if (!lastOrder || !lastOrder.orderid) {
    return "fod-000000000001";
  }

  const lastNumber = parseInt(lastOrder.orderid.replace("fod-", ""), 10);

  const newNumber = lastNumber + 1;

  return `fod-${String(newNumber).padStart(12, "0")}`;
};


export const addOrderfood = async (req, res) => {
  try {
   const userId = req.body.userid;
   console.log("USER ID:", userId);
    // 1️⃣ Generate order ID
   // return
    const newOrderId = await generateOrderIdfood();

    // 2️⃣ Create order
    const order = await Orderfood.create({
      ...req.body,
      orderid: newOrderId
    });

    // 3️⃣ Update user's cart items
    await FoodCartModal.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        status: "not yet submit"
      },
      {
        $set: {
          orderid: newOrderId,
          status: "submit"
        }
      }
    );

    return res.status(201).json({
      message: "Order created successfully",
      data: order
    });

  } catch (err) {
    console.error("Add order error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

export const orderfoodDelete = async (req, res) => {
  try {
    const { id } = req.query; // 👈 get id from query

    if (!id) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const deleted = await Orderfood.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ message: "Order deleted successfully", data: deleted });

  } catch (err) {
    console.error("Error deleting order:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



