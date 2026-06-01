import express from "express";
import Category from "../models/Category.js";
import upload from '../config/uploadecommerce.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import authMiddleware from '../middleware/auth.js'
const router = express.Router();
import axios from "axios";

// 🟢 Create Category (Main, Subcategory, or Sub-subcategory)
router.post("/add", authMiddleware, upload.array("images", 1), async (req, res) => {
  try {
    const { name, parentId, files, type, url, slug, propertytype } = req.body;
    console.log('... req body.... ', JSON.stringify(req.body))
    // Check if category already exists
    // Validate files
    if (!req.files || req.files.length === 0) {
      //  return res.status(400).json({ message: "No image file uploaded." });
      const newCategory = new Category({ name, parentId: parentId || null, image: null, type: type, url, slug });
      await newCategory.save();
      return res.status(201).json({ message: "Category created successfully!", category: newCategory });

    }
    else {
    /*   const existingCategory = await Category.findOne({ name });
      if (existingCategory) return res.status(400).json({ message: "Category already exists!" }); */

      const optimizedImages = await Promise.all(req.files.map(async (file, index) => {
        const newFileName = `category_${Date.now()}_${file.originalname}`;
        const outputPath = path.join('uploads/ecommerce', newFileName);

        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath.replace(/\.\w+$/, '.webp'));

        fs.unlinkSync(file.path);

        return {
          image: `/uploads/ecommerce/${newFileName.replace(/\.\w+$/, '.webp')}`
        };
      }));
      const newCategory = new Category({ name, parentId: parentId || null, image: optimizedImages[0].image, type: type, url, slug, propertytype });
      await newCategory.save();
      return res.status(201).json({ message: "Category created successfully!", category: newCategory });
    }
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🟡 Update Category
router.put("/update/:id", authMiddleware, upload.array("images", 1), async (req, res) => {
  try {

    const { name, propertytype,type } = req.body;
    let updateFields = {};
    if (name) updateFields.name = name;
    if (propertytype) updateFields.propertytype = propertytype;
    if (type) updateFields.type = type;

    // If image is uploaded, optimize and include it
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const newFileName = `category_${Date.now()}.webp`;
      const outputPath = path.join("uploads/ecommerce", newFileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path); // Delete original

      updateFields.image = `/uploads/ecommerce/${newFileName}`;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found!" });
    }

    res.status(200).json({
      message: "Category updated successfully!",
      category
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🔴 Delete Category (And Subcategories)
router.delete("/delete_____/:id", authMiddleware, async (req, res) => {
  try {
    const categoryId = req.params.id;
    // Delete category and all its subcategories
    await Category.deleteMany({ $or: [{ _id: categoryId }, { parentId: categoryId }] });

    return res.status(200).json({ message: "Category and its subcategories deleted successfully!" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const subcategories = await Category.find({ parentId: categoryId });
    const subcategoryIds = subcategories.map((sub) => sub._id.toString());
    const allCategoryIds = [categoryId, ...subcategoryIds];
    // ✅ 3. Safe to delete category and subcategories
    await Category.deleteMany({
      $or: [{ _id: categoryId }, { parentId: categoryId }],
    });

    return res.status(200).json({
      message: "Category and its subcategories deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
//authMiddleware,
router.get("/list", async (req, res) => {
  try {
    const { type } = req.query;

    // 1️⃣ Fetch ALL categories (do NOT filter here)
    const categories = await Category.find().lean();

    // 2️⃣ Build tree
    const buildHierarchy = (parentId = null) =>
      categories
        .filter(cat => {
          if (parentId === null) {
            // Filter type ONLY for root categories
            if (type) return cat.parentId === null && cat.type === type;
            return cat.parentId === null;
          }
          return cat.parentId?.toString() === parentId.toString();
        })
        .map(cat => ({
          ...cat,
          subcategories: buildHierarchy(cat._id),
        }));

    res.status(200).json(buildHierarchy());
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


//menulist
router.get("/menulist", async (req, res) => {
  try {
    const { type } = req.query;
    // 1️⃣ Fetch ALL categories
    const categories = await Category.find().lean();
    // 2️⃣ Function to build hierarchy
    const buildHierarchy = (parentId = null, filterType = null) =>
      categories
        .filter(cat => {
          // Root level
          if (parentId === null) {
            if (filterType) {
              return cat.parentId === null && cat.type === filterType;
            }
            return cat.parentId === null;
          }

          // Child level
          return cat.parentId?.toString() === parentId.toString();
        })
        .map(cat => ({
          ...cat,
          subcategories: buildHierarchy(cat._id),
        }));

    // ✅ CASE 1: If type is provided → return only that type hierarchy
    if (type) {
      return res.status(200).json(buildHierarchy(null, type));
    }

    // ✅ CASE 2: If no type → group by type
    const groupedByType = {};

    categories.forEach(cat => {
      if (!groupedByType[cat.type]) {
        groupedByType[cat.type] = buildHierarchy(null, cat.type);
      }
    });

    res.status(200).json(groupedByType);

  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

let cachedIPInfo = null;
let lastFetched = 0;

router.get("/getlogs", async (req, res) => {
  try {
    const now = Date.now();
    // Cache for 5 minutes
    if (cachedIPInfo && now - lastFetched < 5 * 60 * 1000) {
      return res.status(200).json({ success: true, data: cachedIPInfo });
    }

    const response = await axios.get("https://ipapi.co/json/");
    cachedIPInfo = response.data;
    lastFetched = now;

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error fetching IP info:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch IP information",
      error: error.message
    });
  }
});



export const getCategoryList = async (req, res) => {
  try {
    const categories = await Category.find();
    // Convert flat categories list into a hierarchical structure
    const buildHierarchy = (parentId = null) =>
      categories
        .filter(cat => String(cat.parentId) === String(parentId))
        .map(cat => ({ ...cat._doc, subcategories: buildHierarchy(cat._id) }));

    return res.status(200).json(buildHierarchy());
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

}


// 🔍 Get Subcategories by Parent ID
router.get("/subcategories/:parentId", authMiddleware, async (req, res) => {
  try {
    const { parentId } = req.params;

    // Find categories where parentId matches the given one
    const subcategories = await Category.find({ parentId });

    return res.status(200).json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;
