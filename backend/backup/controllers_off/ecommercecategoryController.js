import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js";
import multer from "multer";
import sharp from "sharp";
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;
import upload from '../config/uploadecommerce.js';
import Category from '../models/EcomCategory.js'


export const addCategory = async (req, res) => {
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
                const outputPath = path.join('uploads/category', newFileName);

                await sharp(file.path)
                    .resize(1024, 768, { fit: 'inside' })
                    .webp({ quality: 80 })
                    .toFile(outputPath.replace(/\.\w+$/, '.webp'));

                fs.unlinkSync(file.path);

                return {
                    image: `/uploads/category/${newFileName.replace(/\.\w+$/, '.webp')}`
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
}

export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        let updateFields = { name };

        // If image is uploaded, optimize and include it
        if (req.files && req.files.length > 0) {
            const file = req.files[0];
            const newFileName = `category_${Date.now()}.webp`;
            const outputPath = path.join("uploads/category", newFileName);

            await sharp(file.path)
                .resize(1024, 768, { fit: "inside" })
                .webp({ quality: 80 })
                .toFile(outputPath);

            fs.unlinkSync(file.path); // Delete original

            updateFields.image = `/uploads/category/${newFileName}`;
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

}

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

export const deleteCategory = async (req, res) => {

}