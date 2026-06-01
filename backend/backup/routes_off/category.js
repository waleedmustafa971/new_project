import express from "express";
import Category from "../models/Category.js";
import upload from '../config/uploadecommerce.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import authMiddleware from '../middleware/auth.js'
const router = express.Router();

// 🟢 Create Category (Main, Subcategory, or Sub-subcategory)
router.post("/add", authMiddleware, upload.array("images", 1), async (req, res) => {
  try {
    const { name, parentId, files, type } = req.body;
    // Check if category already exists
    // Validate files
    if (!req.files || req.files.length === 0) {
     //  return res.status(400).json({ message: "No image file uploaded." });
         const newCategory = new Category({ name, parentId: parentId || null, image: null, type: type });
         await newCategory.save();
         return res.status(201).json({ message: "Category created successfully!", category: newCategory });

    }
    else {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) return res.status(400).json({ message: "Category already exists!" });

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
         const newCategory = new Category({ name, parentId: parentId || null, image: optimizedImages[0].image, type: type });
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
    const { name } = req.body;
    let updateFields = { name };

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

// 🔍 Get All Categories with Subcategories (Nested Structure)
router.get("/list", authMiddleware, async (req, res) => {
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
});

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
