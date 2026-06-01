import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import Product from "../models/productModel.js";
import Category from "../models/EcomCategory.js";
import Slider from "../models/sliderModel.js";
import multer from "multer";
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";
import { processImages } from "../middleware/imageHelper.js"; // the code above
import brandModal from "../models/brandModal.js";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

export const addProduct = async (req, res) => {
  try {
    let body = req.body;

    // Parse JSON fields from FormData
    if (body.specialDiscount) {
      body.specialDiscount = JSON.parse(body.specialDiscount);
    }
    if (body.sizes) {
      body.sizes = JSON.parse(body.sizes);
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = await processImages(req.files);
    }

    const product = new Product({
      ...body,
      images,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created",
      data: product,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
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
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
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
export const listProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", categoryId, vendorId } = req.query;
    const filter = {};

    if (search) filter.name = { $regex: search, $options: "i" };
    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId;

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate("vendorId", "shopName email")
      .populate("categoryId", "name")
      .populate("sucategoryId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

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

export const dashboardHome = async (req, res) => {
  try {
    // 1️⃣ Sliders - Full collection
    const sliders = await Slider.find().sort({ createdAt: -1 });
    const brands = await brandModal.find().sort({ createdAt: -1 });

    // 2️⃣ Categories - Full collection
    const categories = await Category.find().sort({ name: 1 });

    // 3️⃣ Products grouped by showcasecategory (limit 10 each group)
    const productGroups = await Product.aggregate([
      {
        $group: {
          _id: "$showcasecategory",
          products: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          showcasecategory: "$_id",
          products: { $slice: ["$products", 10] },
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      sliders,
      brands,
      categories,
      productGroups
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const categorywiseProduct = async(req, res) => {
  const { page = 1, limit = 10, search = "", categoryId, vendorId, sucategoryId } = req.query;
  console.log('...log...' + req.query)
  try {
      // Find categories where parentId matches the given one
    const subcategories = await Category.find({ parentId: categoryId });
      //brand filter
    const filter = {};

    if (search) filter.name = { $regex: search, $options: "i" };
    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId; 
    if (sucategoryId) filter.sucategoryId = sucategoryId; 

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate("vendorId", "shopName email")
      .populate("categoryId", "name")
      .populate("sucategoryId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      subcategories: subcategories,
      data: products,
    });


     } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }

}
export const singlewiseProduct = async(req, res) => {
  const { page = 1, limit = 10, search = "", categoryId, vendorId, sucategoryId,_id } = req.query;
  try {
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId; 
    if (sucategoryId) filter.sucategoryId = sucategoryId; 
    if(_id) filter._id = _id;
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .populate("vendorId", "shopName email")
      .populate("categoryId", "name")
      .populate("sucategoryId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: products,
    });
     } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }

}

export const showCase = async(req, res) => {
  const { page = 1, limit = 10, search = "", categoryId, vendorId, sucategoryId,_id, showcasecategory } = req.query;
  try {
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId; 
    if (sucategoryId) filter.sucategoryId = sucategoryId;
    if (showcasecategory) filter.showcasecategory = showcasecategory; 

    if(_id) filter._id = _id;
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .populate("vendorId", "shopName email")
      .populate("categoryId", "name")
      .populate("sucategoryId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: products,
    });
     } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }

}

export const globalProductsearch_product = async (req, res) => {
    try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const filter = {};
    if (searchQuery) {
      filter.productname = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await Product.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
}

export const globalProductsearch = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search Text
    const searchText = req.query.search || "";
    const searchRegex = new RegExp(searchText, "i"); // case insensitive

    /*
    =======================================
    1️⃣ PRODUCT SEARCH
    =======================================
    */
    const productFilter = {};
    if (searchText) {
      productFilter.productname = searchRegex;
    }

    const productData = await Product.find(productFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalProducts = await Product.countDocuments(productFilter);

    /*
    =======================================
    2️⃣ CATEGORY SEARCH (name matches search text)
    =======================================
    */
    const categoryData = await Category.find({
      parentId: null,       // Only top-level categories
      name: searchRegex,
    });

    /*
    =======================================
    3️⃣ SUBCATEGORY SEARCH (name matches search text)
    =======================================
    */
    const subcategoryData = await Category.find({
      parentId: { $ne: null },  // Only subcategories
      name: searchRegex,
    });

    /*
    =======================================
    RESPONSE
    =======================================
    */
    return res.status(200).json({
      page,
      limit,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      productData,
      categoryData,
      subcategoryData,
    });

  } catch (error) {
    console.error("Error in global product search:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

