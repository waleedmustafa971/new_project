import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import Order from "../models/orderModal.js";


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
    const { query = "", page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const filter = {};

    if (query.trim() !== "") {
      filter.orderid = { $regex: query, $options: "i" };
    }

    const data = await Order.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      message: "Order list fetched",
      data,
      pagination: {
        currentPage: Number(page),
        totalPage: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (err) {
    console.error("Order list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


