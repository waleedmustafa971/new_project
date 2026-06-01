import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import Product from "../models/productModel.js";
import Category from "../models/EcomCategory.js";
import CartModal from "../models/CartModal.js";
import Slider from "../models/sliderModel.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';
import dotenv from "dotenv";
dotenv.config();

export const addCart = async (req, res) => {
  try {
    const {
      productId,
      productname,
      qty,
      userId,
      price,
      sizes // <-- NEW field
    } = req.body;

    console.log("📥 Incoming Add-To-Cart Data:", req.body);

    if (!productId || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    // Check if already in cart
    let existing = await CartModal.findOne({ productId, userId });
    if (existing) {
      existing.qty += 1;
      existing.price = price; 
      existing.sizes = sizes;
      await existing.save();
      return res.json({ message: "Cart updated", data: existing });
    }
    const newCartItem = new CartModal({
      productId,
      productname,
      qty,
      userId,
      price,
      sizes  // <-- save sizes
    });

    await newCartItem.save();

    return res.json({ message: "Added to cart", data: newCartItem });

  } catch (err) {
    console.error("❌ Error in Add-To-Cart API:", err);
    return res.status(500).json({ message: "Internal server error", error: err });
  }
};

export const updateCart = async (req, res) => {
  try {
    let body = req.body;

    if (body.specialDiscount) {
      body.specialDiscount = JSON.parse(body.specialDiscount);
    }
    if (body.sizes) {
      body.sizes = JSON.parse(body.sizes);
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = await processImages(req.files);
      body.images = images; // replace or merge
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true });

    if (!updated)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, message: "Product updated", data: updated });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE PRODUCT
export const deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CartModal.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ success: false, message: "cart not found" });
    res.json({ success: true, message: "cart deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editList = async (req, res) => {
  try {
    const { id } = req.query; // product id

    if (!id) {
      return res.status(400).json({ success: false, message: "Product ID required" });
    }

    // --- Fetch product ---
    const product = await Product.findById(id)
      .populate("vendorId", "shopName email")
      .populate("categoryId", "name")
      .populate("sucategoryId", "name");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // --- Fetch subcategories under selected category ---
    const subcategorylist = await Category.find({ parentId: product.categoryId });

    res.json({
      success: true,
      data: product,
      subcategorylist,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// LIST PRODUCTS (with pagination, filter, search)
export const listCarts = async (req, res) => {
  try {
    
    const { page = 1, limit = 10, search = "", categoryId, vendorId, userId } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId;
    if(userId) filter.userId = userId;
    const skip = (page - 1) * limit;
    const products = await CartModal.find(filter)
      .populate("productId", "productname producttype images")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await CartModal.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const increaseQty = async (req, res) => {
  try {
    const { id } = req.params;

    let cartItem = await CartModal.findById(id);
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    cartItem.qty += 1;
    await cartItem.save();

    return res.json({ message: "Quantity increased", data: cartItem });

  } catch (err) {
    console.error("❌ Error in Increase Qty:", err);
    return res.status(500).json({ message: "Internal server error", error: err });
  }
};

export const decreaseQty = async (req, res) => {
  try 
  {
    const { id } = req.params;
    let cartItem = await CartModal.findById(id);
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    if (cartItem.qty > 1) {
      cartItem.qty -= 1;
      await cartItem.save();
      return res.json({ message: "Quantity decreased", data: cartItem });
    }
    return res.json({
      message: "Cannot decrease below 1",
      data: cartItem,
    });
  } catch (err) {
    console.error("❌ Error in Decrease Qty:", err);
    return res.status(500).json({ message: "Internal server error", error: err });
  }
};



