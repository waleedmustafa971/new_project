import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../../models/users.js";
import mongoose from "mongoose";
import Restaurant from "../../models/food/Resturant.js";
import RestaurantCategory from "../../models/food/restaurant_categories.js";
import FoodCuisine from "../../models/food/FoodCuisines.js";
import ResturantCuisine from "../../models/food/restaurant_cuisines.js";
import ResturantBrand from "../../models/food/restaurant_brand.js";
import Company from "../../models/food/Company.js";
import Brand from "../../models/brandModal.js";

import FoodPromo from "../../models/food/FoodPromo.js";
import Promo from '../../models/Promo.js';
import FoodItem from "../../models/food/FoodItems.js";
import { getDistanceAndTime } from "../../config/distance.js";
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


export const addCategory = async (req, res) => {
 // console.log('....body.....', req.body)
  try {
    const {
      category_name,
      description,
      category_name_ar,
      description_ar,
      tax,
      status,
      recommended_by_admin,
    } = req.body;

    // 🔴 Check required field
    if (!category_name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // 🔴 Check duplicate
    const exists = await Category.findOne({ category_name });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    let imagePath = null;

    // ✅ Handle image upload (optional)
    if (req.files && req.files.length > 0) {
      const file = req.files[0];

      const fileName = `category_${Date.now()}.webp`;
      const uploadDir = "uploads/food/category";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    // ✅ Create category
    const category = new Category({
      category_name,
      category_image: imagePath || "categories/default.png",
      status: status ?? 1,
      description: description || null,
      category_name_ar: category_name_ar || null,
      description_ar: description_ar || null,
      recommended_by_admin: recommended_by_admin ?? 0,
      tax: tax ?? 0,
    });

    await category.save();

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

}
export const getCuisinesList = async (req, res) => {
  try {
    const categories = await FoodCuisine.find();
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export const deleteCategory = async (req, res) => {
  console.log('kkkkk' + req.params)
  try {
    const { id } = req.params;   // ✅ FIXED

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // OPTIONAL: Delete all subcategories belonging to this parent
    await Category.deleteMany({ parentId: id });

    // Delete category
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting category",
      error: error.message,
    });
  }
};

export const addResturant = async (req, res) => {
  try {
    const {
      restaurant_name,
      restaurant_name_ar,
      manual_address,
      contact_person_name,
      restaurant_phone_number,
      phone_with_code,
      google_address,
      zip_code,
      password,
      email,
      username,
      license_no,
      lat,
      lng,
      admin_user_id,
      status, shoptype, url, foodcuisine, offerpercent
    } = req.body;
    console.log('..req.body....', JSON.stringify(req.body))

    // 🔴 Required fields validation
    if (
      !restaurant_name ||
      !restaurant_phone_number ||
      !password ||
      !admin_user_id ||
      !email ||
      status === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    // 🔴 Duplicate checks
    const exists = await Restaurant.findOne({
      email: email
    });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Email address already exists" });
    }
    // ✅ Image upload
    let imagePath = "static_images/restaurant.jpg";
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const uploadDir = "uploads/food/restaurant";
      const fileName = `restaurant_${Date.now()}.webp`;
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const outputPath = path.join(uploadDir, fileName);
      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);
      fs.unlinkSync(file.path);
      imagePath = `/${outputPath}`;
    }
    let hashedPassword = null;
    if (req.body.password) {
      const rawPassword = req.body.password.trim();
      const salt = await bcrypt.genSalt(10);
      hashedPassword = rawPassword;
    }
    console.log("RAW PASSWORD:", req.body.password);
    console.log("HASHED PASSWORD:", hashedPassword);
    // ✅ Create restaurant
    const restaurant = new Restaurant({
      restaurant_name,
      restaurant_name_ar: restaurant_name_ar || null,
      restaurant_image: imagePath,
      manual_address,
      contact_person_name,
      restaurant_phone_number,
      phone_with_code,
      google_address: google_address || null,
      zip_code,
      password: hashedPassword, // ⚠️ hash recommended
      email: email || null,
      username: admin_user_id,
      licence_no: license_no || null,
      lat: lat || null,
      lng: lng || null,
      /* ⭐ GEO LOCATION */
      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)]
      },
      admin_user_id,
      status, shoptype, url, foodcuisine, offerpercent
    });

    await restaurant.save();


  

    return res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Add restaurant error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateResturant = async (req, res) => {
  try {
    const { id } = req.params;

    let {
      restaurant_name,
      restaurant_name_ar,
      manual_address,
      contact_person_name,
      restaurant_phone_number,
      phone_with_code,
      google_address,
      zip_code,
      password,
      email,
      username,
      license_no,
      lat,
      lng,
      admin_user_id,
      status,
      shoptype,
      url,
      foodcuisine, offerpercent
    } = req.body;

    console.log("req.body:", req.body);

    // ✅ Parse cuisine array if coming from FormData
    if (foodcuisine && typeof foodcuisine === "string") {
      foodcuisine = JSON.parse(foodcuisine);
    }

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ Image handling
    let imagePath = restaurant.restaurant_image;

    if (req.file) {
      const uploadDir = "uploads/food/restaurant";
      const fileName = `restaurant_${Date.now()}.webp`;

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(req.file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(req.file.path);

      imagePath = `/${outputPath}`;
    }

    // ✅ Update fields only if provided
    if (restaurant_name) restaurant.restaurant_name = restaurant_name;
    if (restaurant_name_ar) restaurant.restaurant_name_ar = restaurant_name_ar;
    if (manual_address) restaurant.manual_address = manual_address;
    if (contact_person_name) restaurant.contact_person_name = contact_person_name;
    if (restaurant_phone_number) restaurant.restaurant_phone_number = restaurant_phone_number;
    if (phone_with_code) restaurant.phone_with_code = phone_with_code;
    if (google_address) restaurant.google_address = google_address;
    if (zip_code) restaurant.zip_code = zip_code;
    if (email) restaurant.email = email;
    if (username) restaurant.username = username;
    if (password) restaurant.password = password;
    if (license_no) restaurant.licence_no = license_no;
    if (lat) restaurant.lat = lat;
    if (lng) restaurant.lng = lng;
    if (admin_user_id) restaurant.admin_user_id = admin_user_id;
    if (status !== undefined) restaurant.status = status;
    if (shoptype) restaurant.shoptype = shoptype;
    if (url) restaurant.url = url;
    if (foodcuisine) restaurant.foodcuisine = foodcuisine;
    if (offerpercent) restaurant.offerpercent = offerpercent;
    /* ⭐ GEO LOCATION */
    if (lat && lng) {
      restaurant.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)] // [lng, lat]
      };
    }

    restaurant.restaurant_image = imagePath;

    await restaurant.save();

    return res.status(200).json({
      message: "Restaurant updated successfully",
      restaurant
    });

  } catch (error) {
    console.error("Update restaurant error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const addRestaurantCategory = async (req, res) => {
  try {
    const { restaurant_id, category_id } = req.body;

    console.log(
      "...restaurant_id....",
      restaurant_id,
      "...category_id...",
      category_id
    );

    // ✅ FIXED validation
    if (
      !restaurant_id ||
      !category_id ||
      !mongoose.Types.ObjectId.isValid(restaurant_id) ||
      !mongoose.Types.ObjectId.isValid(category_id)
    ) {
      return res.status(400).json({
        message: "Invalid restaurant or category ID",
      });
    }

    // 🔴 Check restaurant exists
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // 🔴 Check category exists
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 🔴 Prevent duplicate mapping
    const exists = await RestaurantCategory.findOne({
      restaurant_id,
      category_id,
    });

    if (exists) {
      return res.status(400).json({
        message: "Category already mapped to this restaurant",
      });
    }

    // ✅ Create mapping
    const restaurantCategory = new RestaurantCategory({
      restaurant_id,
      category_id,
    });

    await restaurantCategory.save();

    return res.status(201).json({
      message: "Category added to restaurant successfully",
      data: restaurantCategory,
    });
  } catch (error) {
    console.error("Add restaurant category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const addFoodcuisines = async (req, res) => {
  try {
    const { cuisine_name, cuisine_name_ar, status } = req.body;

    // 🔴 Required field
    if (!cuisine_name) {
      return res.status(400).json({ message: "Cuisine name is required" });
    }

    // 🔴 Duplicate check
    const exists = await FoodCuisine.findOne({ cuisine_name });
    if (exists) {
      return res.status(400).json({ message: "Cuisine already exists" });
    }

    let imagePath = null;

    // ✅ Image upload (REQUIRED)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Cuisine image is required" });
    }

    const file = req.files[0];
    const uploadDir = "uploads/food/cuisines";
    const fileName = `cuisine_${Date.now()}.webp`;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const outputPath = path.join(uploadDir, fileName);

    await sharp(file.path)
      .resize(1024, 768, { fit: "inside" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(file.path);

    imagePath = `/${outputPath}`;

    // ✅ Create cuisine
    const cuisine = new FoodCuisine({
      cuisine_name,
      cuisine_name_ar: cuisine_name_ar || null,
      cuisine_image: imagePath,
      status: status ?? 1,
    });

    await cuisine.save();

    return res.status(201).json({
      message: "Food cuisine created successfully",
      data: cuisine,
    });
  } catch (error) {
    console.error("Add food cuisine error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//addRestaurantcuisines
export const addRestaurantcuisines = async (req, res) => {
  try {
    const { restaurant_id, cuisine_id } = req.body;

    console.log(
      "...restaurant_id....",
      restaurant_id,
      "...cuisine_id...",
      cuisine_id
    );

    // ✅ FIXED validation
    if (
      !restaurant_id ||
      !cuisine_id ||
      !mongoose.Types.ObjectId.isValid(restaurant_id) ||
      !mongoose.Types.ObjectId.isValid(cuisine_id)
    ) {
      return res.status(400).json({
        message: "Invalid restaurant or cuisine ID",
      });
    }

    // 🔴 Check restaurant exists
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // 🔴 Check category exists
    const category = await FoodCuisine.findById(cuisine_id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 🔴 Prevent duplicate mapping
    const exists = await ResturantCuisine.findOne({
      restaurant_id,
      cuisine_id,
    });

    if (exists) {
      return res.status(400).json({
        message: "Category already mapped to this restaurant",
      });
    }

    // ✅ Create mapping
    const restaurantCategory = new ResturantCuisine({
      restaurant_id,
      cuisine_id,
    });

    await restaurantCategory.save();

    return res.status(201).json({
      message: "Resturant Cuisine added to restaurant successfully",
      data: restaurantCategory,
    });
  } catch (error) {
    console.error("Add restaurant category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getDashboardList = async (req, res) => {
  const { lat, lng, page = 1, limit = 10, modulename="food", active_now=true, start_date, end_date, status } = req.query;
  const offerpercent = 14;
  // Check if provided
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }
  // Convert to numbers (use new variables)
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  // Check if valid numbers
  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      message: "lat and lng must be valid numbers",
    });
  }
  // Validate range
  if (parsedLat < -90 || parsedLat > 90) {
    return res.status(400).json({
      success: false,
      message: "lat must be between -90 and 90",
    });
  }
  if (parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({
      success: false,
      message: "lng must be between -180 and 180",
    });
  }


  try {
    const categories = await Category.find({ status: 0 });
    const foodcuisine = await FoodCuisine.find({ status: 0 });
    //const resturantbrand = await ResturantBrand.find({ status: 0 });
    const resturantbrand = await ResturantBrand.find({ status: 0 })
      .populate("restaurant_id")   // get restaurant details
      .populate("brand_name");     // get brand details

   // const foodprm = await FoodPromo.find(); //Promo
   const currentdate = new Date(); // ✅ correct
    console.log('....date...', currentdate)
   
    let filter = {};
    if (status !== undefined) {
      filter.status = status === "true";
    }
    if (modulename) {
      filter.modulename = modulename;
    }
    if (start_date || end_date) {
      filter.start_date = {};
      if (start_date) {
        filter.start_date.$gte = new Date(start_date);
      }
      if (end_date) {
        filter.start_date.$lte = new Date(end_date);
      }
    }
    if (active_now === "true") {
      filter.$and = [
        { start_date: { $lte: currentdate } },
        { end_date: { $gte: currentdate } },
        { status: true }
      ];
    }
    const foodprm = await Promo.find(filter).sort({ xtime: -1 });
    const resturant = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat], // ✅ use parsed values
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 2000,
          query: {
            status: 1,
            is_deleted: 0,
          },
        },
      },
      { $limit: 10 },
    ]);

    const resturantWithDistance = resturant.map((item) => {
      const distanceKm = item.distance / 1000;
      const deliveryTimeMin = (distanceKm / 30) * 60;

      return {
        ...item,
        distance_km: Number(distanceKm.toFixed(2)),
        delivery_time_min: Math.ceil(deliveryTimeMin),
        distance_text: `${distanceKm.toFixed(2)} km`,
        delivery_time_text: `${Math.ceil(deliveryTimeMin)} min`,
      };
    });
    /* start */
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    // ✅ Dynamic geo query
    let geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    // ✅ Add offer filter (>= offerpercent)
    if (offerpercent) {
      geoQuery.offerpercent = { $gte: Number(offerpercent) };
    }

    const resturantdiscount = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 2000,
          query: geoQuery, // ✅ applied filter here
        },
      },
      { $skip: skip },
      { $limit: parsedLimit },
    ]);

    // ✅ Add calculated fields
    const resturantdiscountWithDistance = resturantdiscount.map((item) => {
      const distanceKm = item.distance / 1000;
      const deliveryTimeMin = (distanceKm / 30) * 60;

      return {
        ...item,
        distance_km: Number(distanceKm.toFixed(2)),
        delivery_time_min: Math.ceil(deliveryTimeMin),
        distance_text: `${distanceKm.toFixed(2)} km`,
        delivery_time_text: `${Math.ceil(deliveryTimeMin)} min`,
      };
    });

    // ✅ Optional: total count for pagination (IMPORTANT)
    const totalCount = await Restaurant.countDocuments(geoQuery);



    /* end start */
    res.status(200).json({
      success: true,
      categories: categories || [],
      foodcuisine: foodcuisine || [],
      resturant: resturantWithDistance || [],
      discountresturant: resturantdiscountWithDistance || [],
      resturantbrand: resturantbrand || [],
      promooffer: foodprm || [],
    });
  } catch (error) {
    console.error("❌ Dashboard API error:", error);

    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
      error: error.message,
    });
  }
};

export const addBrandResturant = async (req, res) => {
  try {
    const {
      restaurant_id,
      brand_name,
      offer_discount,
      status
    } = req.body;

    // 🔴 Check required field
    if (!restaurant_id) {
      return res.status(400).json({ message: "restaurant_id is required" });
    }

    // 🔴 Check duplicate
    const exists = await ResturantBrand.findOne({ brand_name });
    if (exists) {
      return res.status(400).json({ message: "Resturant Brand already exists" });
    }

    let imagePath = null;

    // ✅ Handle image upload (optional)
    if (req.files && req.files.length > 0) {
      const file = req.files[0];

      const fileName = `category_${Date.now()}.webp`;
      const uploadDir = "uploads/food/brand";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    // ✅ Create category
    const category = new ResturantBrand({
      restaurant_id: restaurant_id,
      brand_name: brand_name,
      offer_discount: offer_discount,
      status: status,
      brand_logo: imagePath
    });

    await category.save();

    return res.status(201).json({
      message: "Resturant Brand created successfully",
      category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

}

export const getActivePromos = async (req, res) => {
  try {
    const today = new Date();

    const promos = await FoodPromo.find({
      status: true,
      start_date: { $lte: today },
      end_date: { $gte: today },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Active promos fetched successfully",
      count: promos.length,
      data: promos,
    });
  } catch (error) {
    console.error("Get active promos error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addPromo = async (req, res) => {
  try {
    const {
      promo_code,
      message,
      start_date,
      end_date,
      no_of_users,
      minimum_order_amount,
      discount,
      discount_type,
      max_discount_amount,
      repeat_usage,
      no_of_repeat_usage,
      status,
      is_cashback,
      list_promocode,
      details,
      image
    } = req.body;
    console.log('....json....', req.body)

    // 🔴 Required fields
    if (!promo_code || !start_date || !end_date) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    // 🔴 Duplicate promo code
    const exists = await FoodPromo.findOne({ promo_code });
    if (exists) {
      return res.status(400).json({ message: "Promo code already exists" });
    }

    // 🔴 Date validation
    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        message: "End date must be greater than start date",
      });
    }

    const promo = new FoodPromo({
      promo_code,
      message,
      start_date,
      end_date,
      no_of_users: no_of_users ?? 0,
      minimum_order_amount: minimum_order_amount ?? 0,
      discount,
      discount_type,
      max_discount_amount:
        discount_type === "percentage" ? max_discount_amount : null,
      repeat_usage: repeat_usage ?? false,
      no_of_repeat_usage: no_of_repeat_usage ?? 0,
      status: status ?? true,
      is_cashback: is_cashback ?? false,
      list_promocode: list_promocode ?? false,
      details: details ?? {},
      image: image
    });

    await promo.save();

    return res.status(201).json({
      message: "Promo created successfully",
      data: promo,
    });
  } catch (error) {
    console.error("Add promo error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addFoodItem = async (req, res) => {
  try {
    const {
      restaurant_id,
      category_id,
      item_name,
      item_name_ar,
      description,
      price,
      discount,
      is_veg,
      status,
      optional_items,
    } = req.body;

    console.log("...backend form....", req.body);

    if (!restaurant_id || !category_id || !item_name || !price) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Parse optional_items if it is a string
    let optionalItemsArray = [];
    if (optional_items) {
      if (typeof optional_items === "string") {
        optionalItemsArray = JSON.parse(optional_items);
      } else if (Array.isArray(optional_items)) {
        optionalItemsArray = optional_items;
      }
    }

    // Ensure category_id is a single ObjectId
    const finalCategoryId = Array.isArray(category_id)
      ? category_id[0]
      : category_id;

    // Ensure price and discount are numbers
    const numericPrice = Number(price);
    const numericDiscount = discount ? Number(discount) : 0;

    const final_price =
      numericDiscount && numericDiscount > 0
        ? numericPrice - (numericPrice * numericDiscount) / 100
        : numericPrice;

    let imagePath = null;

    // Handle main item image upload
    if (req.files && req.files.length > 0) {
      const file = req.files[0];

      const fileName = `items_${Date.now()}.webp`;
      const uploadDir = "uploads/food/items";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    const foodItem = new FoodItem({
      restaurant_id: new mongoose.Types.ObjectId(restaurant_id),
      category_id: new mongoose.Types.ObjectId(finalCategoryId),
      item_name,
      item_name_ar: item_name_ar || null,
      description: description || null,
      price: numericPrice,
      discount: numericDiscount,
      final_price,
      is_veg: is_veg === "true" || is_veg === true,
      status: status !== undefined ? Number(status) : 1,
      item_image: imagePath || "uploads/food/default.png",
      optional_items: optionalItemsArray,
    });

    await foodItem.save();

    //update category Regturant
    const existss = await RestaurantCategory.findOne({
      restaurant_id,
      category_id,
    });

    if (existss) {
    } else
    {
    const restaurantCategory = new RestaurantCategory({
      restaurant_id,
      category_id,
    });
    await restaurantCategory.save();
    }
    return res.status(201).json({
      message: "Food item added successfully",
      data: foodItem,
    });
  } catch (error) {
    console.error("Add food item error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

export const listFoodItems = async (req, res) => {
  try {
    const { restaurant_id, category_id, item_name, status } = req.query;
    const filter = {};
    if (restaurant_id) {
      filter.restaurant_id = new mongoose.Types.ObjectId(restaurant_id);
    }

    if (category_id) {
      filter.category_id = new mongoose.Types.ObjectId(category_id);
    }

    if (status !== undefined) {
      filter.status = Number(status);
    }

    if (item_name) {
      filter.item_name = { $regex: item_name, $options: "i" };
    }

    /* ---------- Fetch Restaurant ---------- */
    const restaurant = restaurant_id
      ? await Restaurant.findById(restaurant_id)
      : null;

    /* ---------- Fetch Categories for Restaurant ---------- */
    const restaurantCategories = restaurant_id
      ? await RestaurantCategory.find({ restaurant_id })
        .populate("category_id", "category_name category_name_ar description")
      : [];

    /* ---------- Fetch Food Items ---------- */
    const items = await FoodItem.find(filter)
      .populate("restaurant_id", "restaurant_name restaurant_image")
      .populate("category_id", "category_name category_name_ar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Food items fetched successfully",
      count: items.length,
      restaurant,
      restaurant_categories: restaurantCategories, //restaurant_categories
      data: items,
    });
  } catch (error) {
    console.error("List food items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getCategorywisefilter_off = async (req, res) => {
  const {
    restaurant_id,
    category_id,
    item_name,
    status,
    page = 1,
    limit = 10,
    lat,
    lng
  } = req.query;

  console.log('req.query....', JSON.stringify(req.query));

  // ✅ Validate lat/lng
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lat/lng",
    });
  }

  try {
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    /* ---------------------------------- */
    /* ✅ GEO: Find Nearby Restaurants */
    /* ---------------------------------- */
    let geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    if (restaurant_id) {
      geoQuery._id = new mongoose.Types.ObjectId(restaurant_id);
    }

    const nearbyRestaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          key: "location", // 🔥 Make sure your schema has `location` 2dsphere
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 5000, // 5km max distance
          query: geoQuery,
        },
      },
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    // ✅ Extract restaurant IDs
    const restaurantIds = nearbyRestaurants.map(r => r._id);

    if (!restaurantIds.length) {
      return res.status(200).json({
        message: "No nearby restaurants found",
        page: pageNumber,
        limit: limitNumber,
        total_items: 0,
        total_pages: 0,
        data: [],
        all_category: await Category.find(),
      });
    }

    /* ---------------------------------- */
    /* ✅ Build Food Filter */
    /* ---------------------------------- */
    const filter = {
      restaurant_id: { $in: restaurantIds },
    };

    if (category_id) {
      filter.category_id = new mongoose.Types.ObjectId(category_id);
    }

    if (status !== undefined) {
      filter.status = Number(status);
    }

    if (item_name) {
      filter.item_name = { $regex: item_name, $options: "i" };
    }

    /* ---------------------------------- */
    /* ✅ Fetch Food Items */
    /* ---------------------------------- */
    const items = await FoodItem.find(filter)
      .populate("restaurant_id", "restaurant_name restaurant_image location offerpercent balance commission balance points")
      .populate("category_id", "category_name category_name_ar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalItems = await FoodItem.countDocuments(filter);

    /* ---------------------------------- */
    /* ✅ Attach Distance & Delivery Time */
    /* ---------------------------------- */
    const itemsWithDistance = items.map(item => {
      const restaurant = nearbyRestaurants.find(
        r => r._id.toString() === item.restaurant_id._id.toString()
      );

      if (!restaurant) return item;

      const distanceKm = restaurant.distance / 1000;
      const deliveryTimeMin = (distanceKm / 30) * 60; // assuming 30km/h average speed

      return {
        ...item.toObject(),
        distance_km: Number(distanceKm.toFixed(2)),
        delivery_time_min: Math.ceil(deliveryTimeMin),
        distance_text: `${distanceKm.toFixed(2)} km`,
        delivery_time_text: `${Math.ceil(deliveryTimeMin)} min`,
      };
    });

    /* ---------------------------------- */
    /* ✅ Fetch all categories */
    /* ---------------------------------- */
    const categories = await Category.find();

    /* ---------------------------------- */
    /* ✅ Return Response */
    /* ---------------------------------- */
    return res.status(200).json({
      message: "Food items fetched successfully",
      page: pageNumber,
      limit: limitNumber,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limitNumber),
      data: itemsWithDistance,
      all_category: categories,
    });

  } catch (error) {
    console.error("List food items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCategorywisefilter = async (req, res) => {
  const {
    restaurant_id,
    category_id,
    item_name,
    status,
    page = 1,
    limit = 10,
    lat,
    lng
  } = req.query;

  console.log("req.query....", JSON.stringify(req.query));

  // -----------------------------
  // ✅ Validate lat/lng
  // -----------------------------
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lat/lng",
    });
  }

  try {
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // -----------------------------
    // ✅ GEO: Find Nearby Restaurants
    // -----------------------------
    let geoQuery = { status: 1, is_deleted: 0 };
    if (restaurant_id) geoQuery._id = new mongoose.Types.ObjectId(restaurant_id);

    const nearbyRestaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          key: "location", // Ensure your Restaurant schema has a 2dsphere 'location' index
          near: { type: "Point", coordinates: [parsedLng, parsedLat] },
          distanceField: "distance",
          spherical: true,
          maxDistance: 5000, // 5km
          query: geoQuery,
        },
      },
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    // No restaurants nearby
    if (!nearbyRestaurants.length) {
      return res.status(200).json({
        message: "No nearby restaurants found",
        page: pageNumber,
        limit: limitNumber,
        total_items: 0,
        total_pages: 0,
        data: [],
        all_category: await Category.find(),
      });
    }

    // -----------------------------
    // ✅ Build Food Filter
    // -----------------------------
    const restaurantIds = nearbyRestaurants.map(r => r._id);
    const filter = { restaurant_id: { $in: restaurantIds } };

    if (category_id) filter.category_id = new mongoose.Types.ObjectId(category_id);
    if (status !== undefined) filter.status = Number(status);
    if (item_name) filter.item_name = { $regex: item_name, $options: "i" };

    // -----------------------------
    // ✅ Fetch Food Items
    // -----------------------------
    const items = await FoodItem.find(filter)
      .populate("restaurant_id", "restaurant_name restaurant_image location")
      .populate("category_id", "category_name category_name_ar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalItems = await FoodItem.countDocuments(filter);

    // -----------------------------
    // ✅ Attach Distance & Delivery Time (Driving / Bicycling / Walking)
    // -----------------------------
    const itemsWithDistance = await Promise.all(
      items.map(async (item) => {
        const restaurant = nearbyRestaurants.find(
          r => r._id.toString() === item.restaurant_id._id.toString()
        );
        if (!restaurant) return item;

        const restLat = restaurant.location.coordinates[1]; // latitude
        const restLng = restaurant.location.coordinates[0]; // longitude

        // Get distance & duration for different modes
        const driving = await getDistanceAndTime(parsedLat, parsedLng, restLat, restLng, "driving");
        const bicycling = await getDistanceAndTime(parsedLat, parsedLng, restLat, restLng, "bicycling");
        const walking = await getDistanceAndTime(parsedLat, parsedLng, restLat, restLng, "walking");

        return {
          ...item.toObject(),
          distance_driving_m: driving?.distance_m || 0,
          distance_driving_text: driving?.distance_text || "N/A",
          delivery_time_driving_min: driving?.duration_s ? Math.ceil(driving.duration_s / 60) : 0,

          distance_bicycling_m: bicycling?.distance_m || 0,
          distance_bicycling_text: bicycling?.distance_text || "N/A",
          delivery_time_bicycling_min: bicycling?.duration_s ? Math.ceil(bicycling.duration_s / 60) : 0,

          distance_walking_m: walking?.distance_m || 0,
          distance_walking_text: walking?.distance_text || "N/A",
          delivery_time_walking_min: walking?.duration_s ? Math.ceil(walking.duration_s / 60) : 0,
        };
      })
    );

    // -----------------------------
    // ✅ Fetch all categories
    // -----------------------------
    const categories = await Category.find();

    // -----------------------------
    // ✅ Return Response
    // -----------------------------
    return res.status(200).json({
      message: "Food items fetched successfully",
      page: pageNumber,
      limit: limitNumber,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limitNumber),
      data: itemsWithDistance,
      all_category: categories,
    });

  } catch (error) {
    console.error("List food items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getBrandwisefilter = async (req, res) => {
  try {
    const {
      restaurant_id,
      category_id,
      item_name,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (restaurant_id) {
      filter.restaurant_id = new mongoose.Types.ObjectId(restaurant_id);
    }

    if (category_id) {
      filter.category_id = new mongoose.Types.ObjectId(category_id);
    }

    if (status !== undefined) {
      filter.status = Number(status);
    }

    if (item_name) {
      filter.item_name = { $regex: item_name, $options: "i" };
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    /* ---------- Fetch Restaurant ---------- */
    const restaurant = restaurant_id
      ? await Restaurant.findById(restaurant_id)
      : null;

    /* ---------- Fetch Categories for Restaurant ---------- */
    const restaurantCategories = restaurant_id
      ? await RestaurantCategory.find({ restaurant_id })
        .populate("category_id", "category_name category_name_ar description")
      : [];

    const categories = await Category.find();
    /* ---------- Fetch Food Items ---------- */
    const items = await FoodItem.find(filter)
      .populate("restaurant_id", "restaurant_name restaurant_image")
      .populate("category_id", "category_name category_name_ar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalItems = await FoodItem.countDocuments(filter);

    return res.status(200).json({
      message: "Food items fetched successfully",
      page: pageNumber,
      limit: limitNumber,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limitNumber),
      restaurant,
      restaurant_categories: restaurantCategories,
      data: items,
      all_category: categories
    });

  } catch (error) {
    console.error("List food items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

}

export const alllistFoodItems = async (req, res) => {
  try {
    const {
      restaurant_id,
      category_id,
      item_name,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (restaurant_id) filter.restaurant_id = restaurant_id;
    if (category_id) filter.category_id = category_id;
    if (status !== undefined) filter.status = status;

    if (item_name) {
      filter.item_name = { $regex: item_name, $options: "i" };
    }

    // Fetch paginated data
    const items = await FoodItem.find(filter)
      .populate("restaurant_id", "restaurant_name")
      .populate("category_id", "category_name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Total count for pagination
    const total = await FoodItem.countDocuments(filter);

    return res.status(200).json({
      message: "Food items fetched successfully",
      data: items,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("List food items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getResturantLists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const restaurant_id = req.query.restaurant_id;
    const skip = (page - 1) * limit;
    // Base filter
    let filter = { status: 1 };
    // Search by restaurant_id
    if (restaurant_id) {
      filter._id = restaurant_id;
    }
    // Search by restaurant_name
    if (search) {
      filter.restaurant_name = { $regex: search, $options: "i" };
    }
    const resturant = await Restaurant.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(filter);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      resturant: resturant || []
    });

  } catch (error) {
    console.error("❌ Restaurant API error:", error);
    res.status(500).json({
      message: "Restaurant fetch failed",
      error: error.message
    });
  }
};

export const getItemcuisines = async (req, res) => {
  try {
    const {
      restaurant_id,
      category_id,
      restaurant_name,
      status,
      foodcuisine,
      page = 1,
      limit = 10
    } = req.query;

    console.log("Query:", req.query);

    const filter = {
      is_deleted: 0
    };

    // status filter
    if (status !== undefined) {
      filter.status = Number(status);
    }
    // restaurant_id filter
    if (restaurant_id) {
      filter._id = restaurant_id;
    }
    // restaurant name search
    if (restaurant_name) {
      filter.restaurant_name = { $regex: restaurant_name, $options: "i" };
    }
    // cuisine filter (array)
    if (foodcuisine) {
      filter.foodcuisine = foodcuisine;
      // OR: filter.foodcuisine = { $in: [foodcuisine] }
    }
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    console.log("Mongo Filter:", filter);
    const items = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    const total = await Restaurant.countDocuments(filter);
    return res.status(200).json({
      message: "Restaurants fetched successfully",
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      data: items
    });
  } catch (error) {
    console.error("List restaurants error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const getItemname = async (req, res) => {
  try {
    let { search = "", page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $lookup: {
          from: "restaurants", // collection name in MongoDB
          localField: "restaurant_id",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      {
        $unwind: "$restaurant",
      },
      {
        $match: {
          $or: [
            { item_name: { $regex: search, $options: "i" } },
            { "restaurant.restaurant_name": { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ];

    const result = await FoodItem.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getNearbyrestaurants___ = async (req, res) => {
  const { lat, lng, page = 1, limit = 10 } = req.query;
  // ✅ Validation
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      message: "lat and lng must be valid numbers",
    });
  }

  try {
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    // ✅ SINGLE QUERY (data + count)
    const result = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 2000, // 2km
          query: geoQuery,
        },
      },
      {
      $sort: { offerpercent: 0 } // offer will show first
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parsedLimit },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ]);
    const restaurants = result[0].data;
    const totalCount = result[0].totalCount[0]?.count || 0;
    // ✅ Add Haversine + Driving distance
    const enrichedRestaurants = await Promise.all(
      restaurants.map(async (item) => {
        const distanceKm = item.distance / 1000;
        // 🔥 CALL GOOGLE API (DRIVING DISTANCE)
        let drivingData = null;
        if (item.location?.coordinates) {
          const [destLng, destLat] = item.location.coordinates;
          drivingData = await getDistanceAndTime(
            parsedLat,
            parsedLng,
            destLat,
            destLng
          );
        }

        return {
          ...item,

          // ✅ straight distance (fast)
          distance_km: Number(distanceKm.toFixed(2)),
          distance_text: `${distanceKm.toFixed(2)} km`,

          // ✅ driving distance (real)
          driving_distance_text: drivingData?.distance_text || null,
          driving_distance_m: drivingData?.distance_m || null,
          driving_duration_text: drivingData?.duration_text || null,
          driving_duration_s: drivingData?.duration_s || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      resturant: enrichedRestaurants,
    });

  } catch (error) {
    console.error("❌ API error:", error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};

export const getNearbyrestaurants_offer = async (req, res) => {
  const { lat, lng, page = 1, limit = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  try {
    const geoQuery = {
      status: 1,
      is_deleted: 0,
      offerpercent: { $gt: 0 }, // ✅ only offers
    };

    const result = await Restaurant.aggregate([
      // 1️⃣ GEO SEARCH
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 2000, // 2km
          query: geoQuery,
        },
      },

      // 2️⃣ SORT: highest offer first + nearest first
      {
        $sort: {
          offerpercent: -1, // 🔥 50 → 20 → 10
          distance: 1       // 📍 nearest first
        },
      },

      // 3️⃣ PAGINATION + COUNT
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parsedLimit },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ]);

    const restaurants = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;

    const enrichedRestaurants = restaurants.map((item) => {
      const distanceKm = item.distance / 1000;

      return {
        ...item,

        // 📍 straight distance
        distance_km: Number(distanceKm.toFixed(2)),
        distance_text: `${distanceKm.toFixed(2)} km`,

        // 🎯 offer
        offerpercent: item.offerpercent || 0,
      };
    });

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      resturant: enrichedRestaurants,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};

export const getNearbyrestaurants = async (req, res) => {
  const { lat, lng, page = 1, limit = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  try {
    const geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    const result = await Restaurant.aggregate([
      // 1️⃣ GEO NEAR (FAST FILTER)
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 2000,
          query: geoQuery,
        },
      },

      // 2️⃣ CREATE STABLE OFFER FIELD
      {
        $addFields: {
          offer_sort: {
            $ifNull: ["$offerpercent", 0],
          },
        },
      },

      // 3️⃣ SORT (OFFER HIGH → LOW, THEN NEAREST)
      {
        $sort: {
          offer_sort: -1,
          distance: 1,
        },
      },

      // 4️⃣ PAGINATION
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parsedLimit },
          ],
          totalCount: [
            { $count: "count" },
          ],
        },
      },
    ]);

    const restaurants = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;

    // 5️⃣ GOOGLE DRIVING DISTANCE ENRICHMENT
    const enrichedRestaurants = await Promise.all(
      restaurants.map(async (item) => {
        const distanceKm = item.distance / 1000;

        let drivingData = null;

        if (item.location?.coordinates) {
          const [destLng, destLat] = item.location.coordinates;

          drivingData = await getDistanceAndTime(
            parsedLat,
            parsedLng,
            destLat,
            destLng,
            "driving"
          );
        }

        return {
          ...item,

          // 📍 Mongo straight distance
          distance_km: Number(distanceKm.toFixed(2)),
          distance_text: `${distanceKm.toFixed(2)} km`,

          // 🚗 GOOGLE DRIVING DISTANCE (THIS IS YOUR CLASS FUNCTION)
          driving_distance_m: drivingData?.distance_m || null,
          driving_distance_text: drivingData?.distance_text || null,
          driving_duration_s: drivingData?.duration_s || null,
          driving_duration_text: drivingData?.duration_text || null,

          // 🎯 OFFER INFO
          offerpercent: item.offerpercent || 0,
          has_offer: (item.offerpercent || 0) > 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      resturant: enrichedRestaurants,
    });

  } catch (error) {
    console.error("❌ API error:", error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};

export const getDiscountRestaurant___ = async (req, res) => {
  const { lat, lng, page = 1, limit = 10, offerpercent, restaurant_name } = req.query;

  // ✅ Validate lat/lng
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      message: "lat and lng must be valid numbers",
    });
  }

  if (parsedLat < -90 || parsedLat > 90) {
    return res.status(400).json({
      success: false,
      message: "lat must be between -90 and 90",
    });
  }

  if (parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({
      success: false,
      message: "lng must be between -180 and 180",
    });
  }

  try {
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ✅ Dynamic geo query
    let geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    // ✅ Add offer filter (>= offerpercent)
    if (offerpercent) {
      geoQuery.offerpercent = { $gte: Number(offerpercent) };
    }

    const resturant = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 5000, //5 = KM
          query: geoQuery, // ✅ applied filter here
        },
      },
      { $skip: skip },
      { $limit: parsedLimit },
    ]);

    // ✅ Add calculated fields
    const resturantWithDistance = resturant.map((item) => {
      const distanceKm = item.distance / 1000;
      const deliveryTimeMin = (distanceKm / 30) * 60;

      return {
        ...item,
        distance_km: Number(distanceKm.toFixed(2)),
        delivery_time_min: Math.ceil(deliveryTimeMin),
        distance_text: `${distanceKm.toFixed(2)} km`,
        delivery_time_text: `${Math.ceil(deliveryTimeMin)} min`,
      };
    });

    // ✅ Optional: total count for pagination (IMPORTANT)
    const totalCount = await Restaurant.countDocuments(geoQuery);

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount, // ✅ total records (not just current page)
      resturant: resturantWithDistance,
    });

  } catch (error) {
    console.error("❌ Dashboard API error:", error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};


/* import mongoose from "mongoose";
import FoodCuisine from "../../models/food/FoodCuisines.js";
 */
export const getDiscountRestaurant = async (req, res) => {
  const {
    lat,
    lng,
    page = 1,
    limit = 10,
    offerpercent,
    restaurant_name,
    cuisine_id, // optional filter
  } = req.query;

  // ✅ Validation
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: "lat & lng required" });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  try {
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ✅ Base filter
    let geoQuery = {
      status: 1,
      is_deleted: 0,
    };

    // ✅ Offer filter
    if (offerpercent) {
      geoQuery.offerpercent = { $gte: Number(offerpercent) };
    }

    // ✅ Name search
    if (restaurant_name) {
      geoQuery.name = { $regex: restaurant_name, $options: "i" };
    }

    // ✅ Cuisine filter (array field)
    if (cuisine_id) {
      geoQuery.foodcuisine = cuisine_id; // assuming array of ObjectId or string
    }

    // ✅ MAIN QUERY
    const result = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 5000,
          query: geoQuery,
        },
      },

      // 🔥 SORT BY OFFER FIRST
      {
        $sort: {
          offerpercent: -1,
          distance: 1,
        },
      },

      // ✅ JOIN CATEGORY (RestaurantCategory)
      {
        $lookup: {
          from: "restaurantcategories",
          localField: "_id",
          foreignField: "restaurant_id",
          as: "categories",
        },
      },

      // ✅ JOIN FOOD CATEGORY DETAILS
      {
        $lookup: {
          from: "foodcategories",
          localField: "categories.category_id",
          foreignField: "_id",
          as: "category_details",
        },
      },

      // ✅ JOIN FOOD CUISINE
      {
        $lookup: {
          from: "foodcuisines",
          localField: "foodcuisine",
          foreignField: "_id",
          as: "cuisine_details",
        },
      },

      // ✅ PAGINATION
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parsedLimit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const restaurants = result[0].data;
    const totalCount = result[0].totalCount[0]?.count || 0;

    // ✅ Distance format
    const finalData = restaurants.map((item) => {
      const distanceKm = item.distance / 1000;

      return {
        ...item,
        distance_km: Number(distanceKm.toFixed(2)),
        distance_text: `${distanceKm.toFixed(2)} km`,
      };
    });

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      resturant: finalData,
    });

  } catch (error) {
    console.error("❌ API error:", error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};

export const getListofbrand = async(req, res) => {

  try {
    const resturantbrand = await ResturantBrand.find({ status: 1 });
    res.status(200).json({
      success: true,
      brand: resturantbrand || []
    });
  } catch (error) {
    console.error("❌ resturantbrand API error:", error);

    res.status(500).json({
      success: false,
      message: "resturantbrand fetch failed",
      error: error.message,
    });
  }
}

//getListofbrandsetup
export const getListofbrandsetup = async(req, res) => {

  try {
    const resturantbrand = await Brand.find({ status: 1 });
    res.status(200).json({
      success: true,
      brand: resturantbrand || []
    });
  } catch (error) {
    console.error("❌ resturantbrand API error:", error);

    res.status(500).json({
      success: false,
      message: "resturantbrand fetch failed",
      error: error.message,
    });
  }
}


export const addNewcompany = async (req, res) => {
  try {
    const { company_name, phone_number,
      email,url,manual_address,
      lat,lng,modulename } = req.body;
    // 🔴 Required field
    if (!company_name) {
      return res.status(400).json({ message: "company_name is required" });
    }
    // 🔴 Duplicate check
    const exists = await Company.findOne({ company_name });
    if (exists) {
      return res.status(400).json({ message: "company_name already exists" });
    }
    let imagePath = null;
    // ✅ Image upload (REQUIRED)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "image is required" });
    }
    const file = req.files[0];
    const uploadDir = "uploads/logo/";
    const fileName = `logo_${Date.now()}.webp`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const outputPath = path.join(uploadDir, fileName);
    await sharp(file.path)
      .resize(1024, 768, { fit: "inside" })
      .webp({ quality: 80 })
      .toFile(outputPath);
    fs.unlinkSync(file.path);
    imagePath = `/${outputPath}`;
    // ✅ Create cuisine
    const newcompany = new Company({
       company_name,
      phone_number,
      email,
      url,
      manual_address,
      modulename,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      logo: imagePath
    });
    await newcompany.save();
    return res.status(201).json({
      message: "created successfully",
      data: newcompany,
    });
  } catch (error) {
    console.error("newcompany error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listCompany = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    // 🔍 search by company name
    if (search) {
      query.company_name = {
        $regex: search,
        $options: "i",
      };
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 }),

      Company.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: total,
      totalPages: Math.ceil(total / parsedLimit),
      data: companies,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Fetch failed",
    });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      company_name,
      phone_number,
      email,
      url,
      manual_address,
      lat,
      lng,
      modulename,
    } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    let imagePath = company.logo; // keep old image

    // ✅ if new image uploaded
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const uploadDir = "uploads/logo/";
      const fileName = `logo_${Date.now()}.webp`;

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(file.path);

      imagePath = `/${outputPath}`;
    }

    // ✅ update fields
    company.company_name = company_name;
    company.phone_number = phone_number;
    company.email = email;
    company.url = url;
    company.manual_address = manual_address;
    company.modulename = modulename;

    if (lat && lng) {
      company.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }

    company.logo = imagePath;

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: company,
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};

export const getCategoryResturant = async (req, res) => {
  try {
    const {
      restaurant_id,
      category_id,
      page = 1,
      limit = 10,
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // ✅ Build dynamic filter
    const filter = {};

    if (restaurant_id) {
      filter.restaurant_id = restaurant_id;
    }

    if (category_id) {
      filter.category_id = category_id;
    }

    // ✅ Get data + total count
    const [data, totalCount] = await Promise.all([
      RestaurantCategory.find(filter)
        .populate("restaurant_id")   // optional (remove if not needed)
        .populate("category_id")     // optional
        .skip(skip)
        .limit(parsedLimit)
        .sort({ createdAt: -1 }),

      RestaurantCategory.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      page: parsedPage,
      limit: parsedLimit,
      count: totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit),
      data,
    });

  } catch (error) {
    console.error("❌ getCategoryResturant error:", error);
    res.status(500).json({
      success: false,
      message: "fetch failed",
      error: error.message,
    });
  }
};

export const getPromos = async (req, res) => {
  console.log('...form data....', req.query)
  try {
    const currentdate = new Date(); // ✅ correct
    console.log('....date...', currentdate)

    const { status, start_date, end_date, modulename, active_now } = req.query;

    let filter = {};

    if (status !== undefined) {
      filter.status = status === "true";
    }

    if (modulename) {
      filter.modulename = modulename;
    }

    if (start_date || end_date) {
      filter.start_date = {};

      if (start_date) {
        filter.start_date.$gte = new Date(start_date);
      }

      if (end_date) {
        filter.start_date.$lte = new Date(end_date);
      }
    }

    if (active_now === "true") {
      filter.$and = [
        { start_date: { $lte: currentdate } },
        { end_date: { $gte: currentdate } },
        { status: true }
      ];
    }

    const promos = await Promo.find(filter).sort({ xtime: -1 });

    return res.status(200).json(promos);

  } catch (error) {
    console.error("Error fetching promos:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};




