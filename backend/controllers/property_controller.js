import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
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

export const sellerData = async (req, res) => {
  try {
    console.log("...query...", req.query);

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build user filter
    const userFilter = {};
    if (req.query.userId) userFilter._id = req.query.userId;

    // Fetch users with pagination
    const users = await Users.find(userFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Attach property ads for each user
    const usersWithProperties = await Promise.all(
      users.map(async (user) => {
        const propertyFilter = { userid: user._id };
        // Optional: apply property filters too
        if (req.query.add_post) propertyFilter.add_post = req.query.add_post;
        if (req.query.city) propertyFilter.city = req.query.city;
        if (req.query.mainCategory)
          propertyFilter.mainCategory = req.query.mainCategory;

        const properties = await PropertyAds.find(propertyFilter).sort({
          createdAt: -1,
        });

        return { ...user.toObject(), properties };
      })
    );

    // Total count of users
    const total = await Users.countDocuments(userFilter);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users: usersWithProperties,
    });
  } catch (error) {
    console.error("Error fetching users with properties:", error);
    return res.status(500).json({ message: "Error fetching data" });
  }
};


export const updatePackage = async (req, res) => {

  try {
    const { id } = req.params;  // PropertyAd _id
    const packageData = req.body; // must match packageSchema
    if (!id) {
      return res.status(400).json({ error: 'Invalid package ID' });
    }
    const updatedAd = await PropertyAds.findByIdAndUpdate(
      id,
      { $push: { package: packageData } },  // push into array
      { new: true, runValidators: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: "PropertyAd not found" });
    }

    res.json(updatedAd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const updatePaymentprocess = async (req, res) => {
  //app.post('/api/lemonsqueezy/create-checkout', async (req, res) => {
  const SECRET_KEY = process.env.SECRET_KEY;
  console.log('LEMON_SQUEEZY_API_KEY :', process.env.LEMON_SQUEEZY_API_KEY);
  console.log('LEMON_SQUEEZY_STORE_ID : ', process.env.LEMON_SQUEEZY_STORE_ID);
  console.log('..kkk.....' + JSON.stringify(req.body))

  try {
    const { variantId, email, customData, cancelUrl, redirectUrl, customPriceCents } = req.body;

    if (!variantId) {
      return res.status(400).json({ error: "variantId is required" });
    }

    const body = {
      data: {
        type: "checkouts",
        /*     attributes: {
              cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel`,
              redirect_url: redirectUrl || `${process.env.FRONTEND_URL}/checkout/success`
            }, */
        relationships: {
          store: {
            data: { type: "stores", id: String(process.env.LEMON_SQUEEZY_STORE_ID) }
          },
          variant: { data: { type: "variants", id: String(variantId) } }
        }
      }
    };



    // ✅ This is where you send `application/vnd.api+json`
    const resp = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json"
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Lemon Squeezy error:", data);
      return res.status(resp.status).json(data);
    }

    res.json({
      checkoutUrl: data?.data?.attributes?.url,
      checkout: data.data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating checkout" });
  }

  /*   try {
      const { variantId, email, customData, cancelUrl, redirectUrl, customPriceCents } = req.body;
  
      if (!variantId) {
        return res.status(400).json({ error: 'variantId is required' });
      }
  
      const body = {
        data: {
          type: 'checkouts',
          attributes: {
            // optional UI/data options
            checkout_options: { logo: true, media: false },
            checkout_data: {
              email: email || undefined,
              custom: customData || undefined
            },
            custom_price: Number.isInteger(customPriceCents) ? customPriceCents : undefined,
            preview: false,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel`,
            redirect_url: redirectUrl || `${process.env.FRONTEND_URL}/checkout/success`
          },
          relationships: {
            store: { data: { type: 'stores', id: String(process.env.LEMON_SQUEEZY_STORE_ID) } },
            variant: { data: { type: 'variants', id: String(variantId) } }
          }
        }
      };
  
      const resp = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(body)
      });
  
      const data = await resp.json();
  
      if (!resp.ok) {
        return res.status(resp.status).json({ error: data?.errors || data || 'Lemon Squeezy error' });
      }
  
      // Checkout URL to redirect the customer
      const url = data?.data?.attributes?.url;
      if (!url) return res.status(500).json({ error: 'No checkout URL returned' });
  
      res.json({ url, checkout: data.data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error creating checkout' });
    } */
};

export const addClassified = async (req, res) => {
  try {
    const { body, files } = req;


    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }


    // Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `property_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/property', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path); // Delete original uploaded file
        return {
          slNo: index + 1,
          image: `/uploads/property/${webpFileName}`
        };
      })
    );

    /*     Propertyads validation failed: add_post: Cast to string failed for 
    value "[ 'classified', 'classified' ]" (type Array) at path "add_post" */


    const ad = new PropertyAds({
      ...body,
      images: optimizedImages,
    });
    await ad.save();
    return res.status(201).json({ message: 'Ad created', ad });


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const addPropertyData = async (req, res) => {
  console.log('...property.....', JSON.stringify(req.body))
  try {
    const { body, files } = req;
    const { lat, long } = req.body;
    const { _id } = req.body;
    // Convert strings to numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);

    if (_id) {

    }
    else {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
    }

    // Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `property_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/property', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path); // Delete original uploaded file
        return {
          slNo: index + 1,
          image: `/uploads/property/${webpFileName}`
        };
      })
    );

    if (!_id) {
      // Create new ad
      const ad = new PropertyAds({
        ...body,
        images: optimizedImages,
        maplocation: {
          type: 'Point',
          coordinates: [longitude, latitude], // IMPORTANT: [long, lat]
        }
      });
      await ad.save();
      return res.status(201).json({ message: 'Ad created', ad });
    } else {
      // Update existing ad
      const updatedAd = await PropertyAds.findByIdAndUpdate(
        _id,
        {
          $set: {
            ...body,
            images: optimizedImages,
            maplocation: {
              type: 'Point',
              coordinates: [longitude, latitude], // IMPORTANT: [long, lat]
            }
          }
        },
        { new: true } // return the updated document
      );

      if (!updatedAd) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      return res.status(200).json({ message: 'Ad updated', ad: updatedAd });
    }


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updateStepone = async (req, res) => {
  try {
    const { body, files } = req;
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      // return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `property_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/property', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path); // Delete original uploaded file
        return {
          slNo: index + 1,
          image: `/uploads/property/${webpFileName}`
        };
      })
    );

    const updateData = {
      ...body,
    };

    let updateQuery = {
      $set: updateData,
    };

    // If new files are uploaded, push them to the existing array
    if (files.length > 0) {
      updateQuery.$push = {
        images: { $each: optimizedImages }
      };
    }

    // Update ad
    const updatedAd = await PropertyAds.findByIdAndUpdate(
      _id,
      updateQuery,
      { new: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    return res.status(200).json({ message: 'Ad updated', ad: updatedAd });


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updatePropertyImage = async (req, res) => {
  try {
    const { body, files } = req;
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      // return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process and optimize images to WebP format
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `property_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/property', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path); // Delete original uploaded file
        return {
          slNo: index + 1,
          image: `/uploads/property/${webpFileName}`
        };
      })
    );

    const updateData = {
      ...body,
    };

    let updateQuery = {
      $set: updateData,
    };

    // If new files are uploaded, push them to the existing array
    if (files.length > 0) {
      updateQuery.$push = {
        images: { $each: optimizedImages }
      };
    }

    // Update ad
    const updatedAd = await PropertyAds.findByIdAndUpdate(
      _id,
      updateQuery,
      { new: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    return res.status(200).json({ message: 'Ad updated', ad: updatedAd });


  } catch (error) {
    console.error('Error adding property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const recentPropertyList = async (req, res) => {
  console.log(' ..... propertyList..... ', JSON.stringify(req.query))
  try {
    const page = parseInt(req.query.page) || 1;
    const kilometer = parseInt(req.query.kilometer) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || "";
    const lat = parseFloat(req.query.lat) || "";
    const long = parseFloat(req.query.long) || "";
    const add_post = req.query.add_post || "";
    const propertyType = req.query.propertyType || "";
    const CategoryId = req.query.Category || "";

    //size
    // Build filter dynamically
    const filter = {};
    if (propertyType) {
      filter.propertyType = propertyType;
    }

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }

    if (!isNaN(lat) && !isNaN(long)) {
      // 1 km radius → radius in meters
      const radiusInMeters = kilometer * 1000;

      filter.maplocation = {
        $geoWithin: {
          $centerSphere: [[long, lat], radiusInMeters / 6378137], // Earth's radius in meters
        },
      };
    }
    // const subcategories = await Category.find({ parentId: Category });
    const subcategories = CategoryId ? await Category.find({ parentId: CategoryId }) : [];
    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      //  .populate("userid") // 👈 MUST match schema field name
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await PropertyAds.countDocuments(filter);
    // const userinfo = await User.findById(users?.userid);
    return res.status(200).json({
      subcategories,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};


export const propertyList = async (req, res) => {
  console.log(' ..... propertyList..... ', JSON.stringify(req.query))
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";
    const propertyType = req.query.propertyType || "";
    const CategoryId = req.query.Category || "";
    const location = req.query.location || "";

    const subCategory = req.query.subCategory || "";
    const city = req.query.city || "";
    const bedrooms = req.query.bedrooms || "";
    const bathrooms = req.query.bathrooms || "";
    const rentispaid = req.query.rentispaid || "";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

    const minSize = req.query.minSize ? Number(req.query.minSize) : undefined;
    const maxSize = req.query.maxSize ? Number(req.query.maxSize) : undefined;

    //size
    // Build filter dynamically
    const filter = {};
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    if (CategoryId) {
      filter.mainCategory = CategoryId;

      // filter.mainCategory = { $regex: Category, $options: "i" };
    }
    if (subCategory) {
      filter.subCategory = subCategory;
    }

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }
    if (bedrooms) {
      filter.bedrooms = bedrooms;
    }
    if (rentispaid) {
      filter.rentispaid = rentispaid;
    }
    if (bathrooms) {
      filter.bathrooms = bathrooms;
    }
    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }
    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }
    // ✅ Price range filter
    // Only set filter if the values are valid numbers
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }

    if (!isNaN(minSize) || !isNaN(maxSize)) {
      filter.size = {};
      if (!isNaN(minSize)) filter.size.$gte = minSize;
      if (!isNaN(maxSize)) filter.size.$lte = maxSize;
    }


    // const subcategories = await Category.find({ parentId: Category });
    const subcategories = CategoryId ? await Category.find({ parentId: CategoryId }) : [];
    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      //  .populate("userid") // 👈 MUST match schema field name
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await PropertyAds.countDocuments(filter);
    // const userinfo = await User.findById(users?.userid);
    return res.status(200).json({
      subcategories,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};


export const RecommandList = async (req, res) => {
  console.log(' ..... RecommandList..... ', JSON.stringify(req.query))
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";
    const propertyType = req.query.propertyType || "";
    const CategoryId = req.query.Category || "";

    const subCategory = req.query.subCategory || "";
    const city = req.query.city || "";
    const age = req.query.age || "";
    const usage = req.query.usage || "";
    const condition = req.query.condition || "";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;


    // Build filter dynamically
    const filter = {};
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    if (CategoryId) {
      filter.mainCategory = CategoryId;

      // filter.mainCategory = { $regex: Category, $options: "i" };
    }
    if (subCategory) {
      filter.subCategory = subCategory;
    }

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }
    if (age) {
      filter.age = age;
    }
    if (condition) {
      filter.condition = condition;
    }
    if (usage) {
      filter.usage = usage;
    }
    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }
    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }
    // ✅ Price range filter
    // Only set filter if the values are valid numbers
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }
    // const subcategories = await Category.find({ parentId: Category });
    const subcategories = CategoryId ? await Category.find({ parentId: CategoryId }) : [];
    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      //  .populate("userid") // 👈 MUST match schema field name
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await PropertyAds.countDocuments(filter);
    // const userinfo = await User.findById(users?.userid);
    return res.status(200).json({
      subcategories,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};

export const globalsearchbyGroup = async (req, res) => {
  console.log('..search.... ', req.query.search)
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const pipeline = [
      // 🔹 Only live properties
      {
        $match: {
          status: "live",
          add_post: "Property",
        }
      },

      // 🔹 Lookup Main Category
      {
        $lookup: {
          from: "categories",
          localField: "mainCategory",
          foreignField: "_id",
          as: "mainCategory"
        }
      },
      { $unwind: "$mainCategory" },

      // 🔹 Lookup Sub Category
      {
        $lookup: {
          from: "categories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: "$subCategory" },

      // 🔹 Search filter
      {
        $match: {
          ...(search && {
            $or: [
              { shortTitle: { $regex: search, $options: "i" } },
              { "mainCategory.name": { $regex: search, $options: "i" } },
              { "subCategory.name": { $regex: search, $options: "i" } },
              { city: { $regex: search, $options: "i" } }
            ]
          })
        }
      },

      // 🔹 Grouping
      {
        $group: {
          _id: {
            propertyType: "$propertyType",
           // shortTitle: "$shortTitle",
            city: "$city",
            mainCategory: {
              _id: "$mainCategory._id",
              name: "$mainCategory.name"
            },
            subCategory: {
              _id: "$subCategory._id",
              name: "$subCategory.name"
            }
          },
          count: { $sum: 1 },
          latestCreatedAt: { $max: "$createdAt" }
        }
      },

      // 🔹 Clean response
      {
        $project: {
          _id: 0,
          propertyType: "$_id.propertyType",
          shortTitle: "$_id.shortTitle", // this not printing because i have stop from group how to acheive
          city: "$_id.city",
          mainCategory: "$_id.mainCategory",
          subCategory: "$_id.subCategory",
          count: 1,
          latestCreatedAt: 1
        }
      },

      // 🔹 Sort by newest group
      { $sort: { latestCreatedAt: -1 } },

      // 🔹 Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await PropertyAds.aggregate(pipeline);

    // 🔹 Count total grouped rows
    const totalPipeline = [...pipeline];
    totalPipeline.splice(-3); // remove skip & limit
    totalPipeline.push({ $count: "total" });

    const totalResult = await PropertyAds.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data
    });

  } catch (error) {
    console.error("Global grouped search error:", error);
    res.status(500).json({ message: "Global grouped search failed" });
  }
};

export const GlobalSearchList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const mainCategory = req.query.mainCategory || "";
    const subCategory = req.query.subCategory || "";

    const matchStage = {
      ...(search && {
        shortTitle: { $regex: search, $options: "i" }
      }),
      ...(mainCategory && { mainCategory }),
      ...(subCategory && { subCategory })
    };

    const pipeline = [
      { $match: matchStage },

      // 🔹 Lookup Main Category
      {
        $lookup: {
          from: "categories",
          localField: "mainCategory",
          foreignField: "_id",
          as: "mainCategory"
        }
      },
      { $unwind: { path: "$mainCategory", preserveNullAndEmptyArrays: true } },

      // 🔹 Lookup Sub Category
      {
        $lookup: {
          from: "categories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },

      // 🔹 Clean response
      {
        $project: {
          userid: 1,
          shortTitle: 1,
          price: 1,
          images: 1,
          city: 1,
          createdAt: 1,
          source: 1,

          mainCategory: {
            _id: "$mainCategory._id",
            name: "$mainCategory.name"
          },
          subCategory: {
            _id: "$subCategory._id",
            name: "$subCategory.name"
          }
        }
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const users = await PropertyAds.aggregate(pipeline);

    const total = await PropertyAds.countDocuments(matchStage);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users
    });

  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({ message: "Global search failed" });
  }
};


export const updatePropertyforrentsteponeupdate = async (req, res) => {
  try {
    const { body, files } = req;
    const { id } = body;  // ✅ properly extract id

    console.log('....id.....' + JSON.stringify(body));

    if (!id) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    // Files check
    if (!files || !Array.isArray(files) || files.length === 0) {
      // return res.status(400).json({ error: 'No files uploaded' });
    }

    // Optimize images
    const optimizedImages = await Promise.all(
      files.map(async (file, index) => {
        const baseName = path.basename(file.originalname, path.extname(file.originalname));
        const webpFileName = `property_${Date.now()}_${baseName}.webp`;
        const outputPath = path.join('uploads/property', webpFileName);
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(outputPath);
        fs.unlinkSync(file.path);
        return {
          slNo: index + 1,
          image: `/uploads/property/${webpFileName}`
        };
      })
    );

    const updateData = { ...body };
    let updateQuery = { $set: updateData };

    if (files && files.length > 0) {
      updateQuery.$push = { images: { $each: optimizedImages } };
    }

    const updatedAd = await PropertyAds.findByIdAndUpdate(id, updateQuery, { new: true });

    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    return res.status(200).json({ message: 'Ad updated', ad: updatedAd });

  } catch (error) {
    console.error('Error updating property data:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updatePropertyData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const {
      id, youtubeURL, phoneNo, whatsapp, price, description, size,
      totalClosingFee, bedrooms, bathrooms, readyByDate,
      annualCommunityFee, isFurnished, propertyReference,
      buyerTransferFee, sellerTransferFee, maintenanceFee,
      occupancyStatus, amenities, location, status, userid, add_post,
      minimumcontractperiodinmonth,
      noticeperiodinmonths,
      securitydeposit,
      typeoftenants,
      preferrednationalityoftenants,
      balcony,
      roomtype
    } = req.body;

    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        youtubeURL,
        phoneNo,
        whatsapp,
        price,
        description,
        size,
        totalClosingFee,
        bedrooms,
        bathrooms,
        readyByDate,
        annualCommunityFee,
        isFurnished,
        propertyReference,
        buyerTransferFee,
        sellerTransferFee,
        maintenanceFee,
        occupancyStatus,
        amenities,
        location,
        status,
        userid, add_post,
        minimumcontractperiodinmonth,
        noticeperiodinmonths,
        securitydeposit,
        typeoftenants,
        preferrednationalityoftenants,
        balcony,
        roomtype
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}
//updatePropertyforsaleData
export const updatePropertyforsaleData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const {
      id, youtubeURL, phoneNo, whatsapp, price, description, size,
      totalClosingFee, bedrooms, bathrooms, readyByDate,
      annualCommunityFee, isFurnished, propertyReference,
      buyerTransferFee, sellerTransferFee, maintenanceFee,
      occupancyStatus, amenities, location, status, userid, add_post,
      minimumcontractperiodinmonth,
      noticeperiodinmonths,
      securitydeposit,
      typeoftenants,
      preferrednationalityoftenants,
      balcony,
      roomtype, rentispaid,
      RERA_property_status,
      RERAlandlordname,
      RERApreregistrationnumber,
      RERAtitledeednumber, currency,
      developer
    } = req.body;

    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        youtubeURL,
        phoneNo,
        whatsapp,
        price,
        description,
        size,
        totalClosingFee,
        bedrooms,
        bathrooms,
        readyByDate,
        annualCommunityFee,
        isFurnished,
        propertyReference,
        buyerTransferFee,
        sellerTransferFee,
        maintenanceFee,
        occupancyStatus,
        amenities,
        location,
        status,
        userid, add_post,
        minimumcontractperiodinmonth,
        noticeperiodinmonths,
        securitydeposit,
        typeoftenants,
        preferrednationalityoftenants,
        balcony,
        roomtype,
        rentispaid,
        RERA_property_status,
        RERAlandlordname,
        RERApreregistrationnumber,
        RERAtitledeednumber, currency,
        developer
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}


export const updatePropertyforrentData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const {
      id, youtubeURL, phoneNo, whatsapp, price, description, size,
      totalClosingFee, bedrooms, bathrooms, readyByDate,
      annualCommunityFee, isFurnished, propertyReference,
      buyerTransferFee, sellerTransferFee, maintenanceFee,
      occupancyStatus, amenities, location, status, userid, add_post,
      minimumcontractperiodinmonth, noticeperiodinmonths, securitydeposit,
      typeoftenants, preferrednationalityoftenants, balcony, roomtype, rentispaid,
      RERA_property_status, RERAlandlordname,
      RERApreregistrationnumber,
      RERAtitledeednumber, currency, numberoftenants,
      preferrednationalitytenants, typeoftenantsallow,
      bathroomstype
    } = req.body;
    console.log('...form submit' + JSON.stringify(req.body))

    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        youtubeURL,
        phoneNo,
        whatsapp,
        price,
        description,
        size,
        totalClosingFee,
        bedrooms,
        bathrooms,
        readyByDate,
        annualCommunityFee,
        isFurnished,
        propertyReference,
        buyerTransferFee,
        sellerTransferFee,
        maintenanceFee,
        occupancyStatus,
        amenities,
        location,
        status,
        userid, add_post,
        minimumcontractperiodinmonth,
        noticeperiodinmonths,
        securitydeposit,
        typeoftenants,
        preferrednationalityoftenants,
        balcony,
        roomtype,
        rentispaid,
        RERA_property_status,
        RERAlandlordname,
        RERApreregistrationnumber,
        RERAtitledeednumber, currency,
        numberoftenants,
        preferrednationalitytenants,
        typeoftenantsallow,
        bathroomstype
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}



export const updatePropertyStatus = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const { id, status, lat, long, statename, bedrooms, bathrooms,
      mainCategory, subCategory
    } = req.body;
    console.log('.....property controller ...... ' + id + '...status....' + status)
    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        status, lat, long, statename, bedrooms, bathrooms, mainCategory, subCategory
      },
      {
        new: true, // return the updated document
        runValidators: true // ensure validation rules are enforced
      }
    );

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}

export const getMyownads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log('req........' + JSON.stringify(req.query))
    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";

    // Build filter dynamically
    const filter = {};

    if (userid) {
      filter.userid = userid;
    }

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }

    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }

    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first

    const total = await PropertyAds.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};


export const getDraftbyuser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log('req........' + JSON.stringify(req.query))
    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";

    // Build filter dynamically
    const filter = {};

    if (userid) {
      filter.userid = userid;
    }

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }

    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }

    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first

    const total = await PropertyAds.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};

export const getMyads = async (req, res) => {

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const userid = req.query.userid || "";
    console.log('...query....' + JSON.stringify(req.query))

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (userid) {
      filter.userid = userid;
    }
    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }

    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await PropertyAds.countDocuments(filter);

    // 👇 Group by category and count
    // 👇 Group by add_post and count
    const totalcategory = await PropertyAds.aggregate([
      { $match: filter }, // apply same filters
      { $group: { _id: "$add_post", count: { $sum: 1 } } },
      { $project: { add_post: "$_id", count: 1, _id: 0 } }, // clean output
    ]);


    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
      totalcategory, // 👈 now included
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }


}

export const getList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const userid = req.query.userid || "";

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (userid) {
      filter.userid = userid;
    }
    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await PropertyAds.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};

export const getListadmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";

    console.log('status..' + status + '... add_post...' + add_post + '...searchQuery...' + searchQuery);

    // Build filter dynamically
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (add_post) {
      filter.add_post = add_post;
    }

    if (searchQuery) {
      filter.shortTitle = { $regex: searchQuery, $options: "i" };
    }
    // Query with filters, pagination
    const users = await PropertyAds.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first
    const total = await PropertyAds.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};

export const filterData = async (req, res) => {
  if (req.query.securitycode == "999") {
    console.log('...formdata...' + JSON.stringify(req.query))
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build filter dynamically
      const filter = {};

      if (req.query.id) filter._id = req.query.id;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.city) filter.city = req.query.city;
      if (req.query.propertyType) filter.propertyType = req.query.propertyType; // rent or sale
      if (req.query.mainCategory) filter.mainCategory = req.query.mainCategory;
      if (req.query.subCategory) filter.subCategory = req.query.subCategory;

      // size range filter (fromSize - toSize)
      if (req.query.fromSize || req.query.toSize) {
        filter.size = {};
        if (req.query.fromSize) filter.size.$gte = Number(req.query.fromSize);
        if (req.query.toSize) filter.size.$lte = Number(req.query.toSize);
      }

      // price range filter (fromPrice - toPrice)
      if (req.query.fromPrice || req.query.toPrice) {
        filter.price = {};
        if (req.query.fromPrice) filter.price.$gte = Number(req.query.fromPrice);
        if (req.query.toPrice) filter.price.$lte = Number(req.query.toPrice);
      }
      if (req.query.rentispaid) filter.rentispaid = req.query.rentispaid;
      if (req.query.listedBy) filter.landlordAgent = req.query.listedBy;
      if (req.query.keyword) filter.shortTitle = req.query.keyword; //agency isFurnished
      if (req.query.isFurnished) filter.isFurnished = req.query.isFurnished; //agency isFurnished
      // if (req.query.agency) filter.agency = req.query.agency; //agency location
      if (req.query.location) {
        filter.location = { $regex: req.query.location, $options: "i" };
      }
      if (req.query.agency) {
        filter.agency = { $regex: req.query.agency, $options: "i" };
      }
      //keyword
      //listedBy landlordAgent
      if (req.query.bedrooms) filter.bedrooms = Number(req.query.bedrooms);
      if (req.query.bathrooms) filter.bathrooms = Number(req.query.bathrooms);
      if (req.query.isFurnished) filter.isFurnished = req.query.isFurnished === "true"; // boolean
      if (req.query.add_post) filter.add_post = req.query.add_post;
      if (req.query.balcony) filter.balcony = Number(req.query.balcony);

      // Query properties
      const properties = await PropertyAds.find(filter)
        .populate("mainCategory")     // 👈 ADD THIS
        .populate("subCategory")      // 👈 ADD THIS
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Attach user info
      const propertiesWithUserInfo = await Promise.all(
        properties.map(async (prop) => {
          const userInfo = await Users.findById(prop.userid).select("name email image");
          return { ...prop.toObject(), userinfo: userInfo || null };
        })
      );

      const total = await PropertyAds.countDocuments(filter);

      return res.status(200).json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        properties: propertiesWithUserInfo,
      });
    } catch (error) {
      console.error("Error fetching user properties:", error);
      res.status(500).json({ message: "Error fetching user property" });
    }

  }
  else {
    res.status(500).json({ message: "auth is failed" });

  }
};

export const getPropertydetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const id = req.query.id || "";

    // Build filter dynamically
    const filter = {};
    if (id) {
      filter._id = id;
    }

    // Query properties
    const properties = await PropertyAds.find(filter)
      .populate("mainCategory")     // 👈 ADD THIS
      .populate("subCategory")      // 👈 ADD THIS
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
      /* this i want to populate
       mainCategory: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category"
        },
        subCategory: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category"
        },
      */

    // Attach user info directly inside each property object
    const propertiesWithUserInfo = await Promise.all(
      properties.map(async (prop) => {
        const userInfo = await Users.findById(prop.userid).select("name email image");
        return { ...prop.toObject(), userinfo: userInfo || null };
      })
    );

    const total = await PropertyAds.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      properties: propertiesWithUserInfo,
    });

  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({ message: "Error fetching user property" });
  }
};


export const deletePropertyAd = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Check if the ID is a valid MongoDB ObjectId
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const deleted = await PropertyAds.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.status(200).json({ message: "Property deleted successfully", data: deleted });
  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getGroupdata = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || ""; // Get search query

    // Filtering condition: If search query exists, filter by name or email
    const filter = searchQuery
      ? {
        $or: [
          { musicname: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
          { email: { $regex: searchQuery, $options: "i" } },
        ],
      }
      : {};
    const users = await Music.find(filter)
      //  .select("-password")
      .skip(skip)
      .limit(limit);
    // Get total count of filtered users
    const totalMusic = await Music.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      totalMusic,
      totalPages: Math.ceil(totalMusic / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

export const deletePropertyImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageId, imagePath } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const ad = await PropertyAds.findById(id);

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const image = ad.images.id(imageId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // ✅ Remove from DB
    image.deleteOne();
    await ad.save();

    // ✅ Delete file
    if (imagePath) {
      const fullPath = path.join(process.cwd(), imagePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted:', fullPath);
      }
    }

    res.status(200).json({
      message: 'Image deleted successfully',
      ad
    });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const AddFavourite = async (req, res) => {
  try {
    const { userid, property_id, details } = req.body;

    // ✅ Check if ObjectId is valid
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    if (!mongoose.Types.ObjectId.isValid(property_id)) {
      return res.status(400).json({ message: "Invalid property ID format" });
    }

    // ✅ Check if user exists
    const userExists = await Users.findById(userid);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if property exists
    const propertyExists = await PropertyAds.findById(property_id);
    if (!propertyExists) {
      return res.status(404).json({ message: "Property not found" });
    }

    // ✅ Check if already in favourites
    const existingFav = await PropertyFavourite.findOne({ userid, property_id });
    if (existingFav) {
      return res.status(400).json({ message: "Already in favourites" });
    }

    // ✅ Save favourite
    const favourite = new PropertyFavourite({ userid, property_id, details });
    await favourite.save();

    res.status(201).json({ message: "Added to favourites", favourite });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getFavouritelist = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const favourites = await PropertyFavourite.find({ userid: userId })
      .populate("userid")
      .populate("property_id")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await PropertyFavourite.countDocuments({ userid: userId });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: favourites,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const updateHistory___ = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Insert the required fields' });
  }

  const { userId, id } = req.body;
  /* if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  } */

  try {
    // ✅ Fetch property by ID
    const property = await PropertyAds.findById(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // ✅ Attach user info (owner of this property)
    const userInfo = await Users.findById(property.userid).select("name email image");
    const propertyWithUserInfo = { ...property.toObject(), userinfo: userInfo || null };

    // ✅ Check if user already viewed
    const alreadyViewed = property.viewHistory.some(
      // (view) => view.userId.toString() === userId
      (view) => view.userId === userId
    );

    // ✅ If already viewed → return with similar ads
    if (alreadyViewed) {
      const similarAds = await PropertyAds.find({
        mainCategory: property.mainCategory,
        subCategory: property.subCategory,
        _id: { $ne: property._id }, // exclude current property
      })
        .limit(6)
        .sort({ createdAt: -1 });

      return res.status(200).json({
        message: 'User already viewed this property',
        data: propertyWithUserInfo,
        similar_ads: similarAds,
      });
    }

    // ✅ Otherwise → record new view
    property.viewsCount += 1;
    property.viewHistory.push({ userId });
    await property.save();

    const similarAds = await PropertyAds.find({
      mainCategory: property.mainCategory,
      subCategory: property.subCategory,
      _id: { $ne: property._id },
    })
      .limit(6)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'View recorded',
      data: propertyWithUserInfo,
      similar_ads: similarAds,
    });

  } catch (error) {
    console.error('Error updating view:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


export const updateHistory = async (req, res) => {
  const { userId, id } = req.body;

  if (!id || !userId) {
    return res.status(400).json({ message: "Property ID and userId are required" });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Invalid userId" });
  }

  try {
    // Fetch property and populate owner info
    const property = await PropertyAds.findById(id).populate("userid", "name email image");
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check if user already viewed
    const alreadyViewed = property.viewHistory.some(
      (view) => view.userid?.toString() === userId
    );

    // Find similar ads (same main & subcategory, exclude current property) and populate owner info
    const similarAds = await PropertyAds.find({
      mainCategory: property.mainCategory,
      subCategory: property.subCategory,
      _id: { $ne: property._id },
    })
      .limit(6)
      .sort({ createdAt: -1 })
      .populate("userid", "name email image");

    if (alreadyViewed) {
      return res.status(200).json({
        message: "User already viewed this property",
        data: property,
        similar_ads: similarAds,
      });
    }

    // Record new view
    property.viewsCount += 1;
    property.viewHistory.push({ userid: userId }); // Mongoose auto-casts string → ObjectId
    await property.save();

    return res.status(200).json({
      message: "View recorded",
      data: property,
      similar_ads: similarAds,
    });

  } catch (error) {
    console.error("Error updating view:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getViewHistory = async (req, res) => {
  const { userId, page = 1, limit = 10, addpost } = req.query;
  console.log(req.query);
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;

  try {
    const result = await PropertyAds.aggregate([
      {
        $match: {
          add_post: addpost,
          "viewHistory.userid": new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $addFields: {
          viewHistory: {
            $filter: {
              input: "$viewHistory",
              as: "vh",
              cond: {
                $eq: ["$$vh.userid", new mongoose.Types.ObjectId(userId)]
              }
            }
          }
        }
      },
      { $sort: { "viewHistory.viewedAt": -1 } },
      { $skip: skipNum },
      { $limit: limitNum }
    ]);

    const totalCount = await PropertyAds.countDocuments({
      add_post: "property",
      "viewHistory.userid": new mongoose.Types.ObjectId(userId)
    });

    return res.status(200).json({
      data: result,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalItems: totalCount
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
//globalsearchbyGroup

export const getTopCategoriesByViews = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Match stage
    const matchStage = {
      status: "live",
      add_post: req.query.add_post || "Property",
      mainCategory: { $ne: null },
    };

    // Aggregation pipeline
    const pipeline = [
      // 1️⃣ Filter
      { $match: matchStage },

      // 2️⃣ Lookup USER info
      {
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userinfo",
        },
      },
      { $unwind: { path: "$userinfo", preserveNullAndEmptyArrays: true } },

      // 3️⃣ Sort properties by viewsCount descending
      { $sort: { viewsCount: -1 } },

      // 4️⃣ Group by mainCategory
      {
        $group: {
          _id: "$mainCategory",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              mainCategory: "$mainCategory",
              subCategory: "$subCategory",
              propertyType: "$propertyType",
              shortTitle: "$shortTitle",
              userid: "$userid",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",
              phoneNo: "$phoneNo",
              whatsapp: "$whatsapp",
              similartransaction: "$similartransaction",
              RERAlandlordname: "$RERAlandlordname",
              RERApreregistrationnumber: "$RERApreregistrationnumber",
              RERAtitledeednumber: "$RERAtitledeednumber",
              RERA_property_status: "$RERA_property_status",
              propertyReference: "$propertyReference",
              rentispaid: "$rentispaid",


            dealername: "$dealername",
            landlordAgent: "$landlordAgent",
            youtubeURL: "$youtubeURL",
            totalClosingFee : "$totalClosingFee",
            bedrooms: "$bedrooms",
            bathrooms: "$bathrooms",
            readyByDate: "$readyByDate",
            annualCommunityFee: "$annualCommunityFee",
            isFurnished: "$isFurnished",
            propertyReference: "$propertyReference",
            buyerTransferFee: "$buyerTransferFee",
            developer: "$developer",
            sellerTransferFee: "$sellerTransferFee",
            maintenanceFee: "$maintenanceFee",
            occupancyStatus: "$occupancyStatus", 
            amenities: "$amenities",
            maplocation: "$maplocation",

             minimumcontractperiodinmonth: "$minimumcontractperiodinmonth",
  noticeperiodinmonths: "$noticeperiodinmonths",
  securitydeposit: "$securitydeposit",
  numberoftenants: "$numberoftenants",
  typeoftenants: "$typeoftenants",
  bathroomstype: "$bathroomstype",
  preferrednationalityoftenants: "$preferrednationalityoftenants",
  balcony: "$balcony",
  roomtype: "$roomtype",
  optiontypes: "$optiontypes",
  contactoptions: "$contactoptions",

              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image",
              },
            },
          },
        },
      },

      // 5️⃣ Lookup CATEGORY info
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      // 6️⃣ Project final fields
      {
        $project: {
          _id: 1,
          categoryName: "$category.name",
          categoryIcon: "$category.icon",
          categoryImage: "$category.image",
          selecttype: "$category.selecttype",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }, // top 10 properties per category
        },
      },

      // 7️⃣ Sort categories by total views
      { $sort: { totalViews: -1 } },

      // 8️⃣ Pagination
      { $skip: skip },
      { $limit: limit },
    ];

    // Run aggregation
    const data = await PropertyAds.aggregate(pipeline);

    // Total categories count for pagination
    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);

    res.status(200).json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.ceil(totalCategories.length / limit),
      totalCategories: totalCategories.length,
    });
  } catch (error) {
    console.error("getTopCategoriesByViews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top categories",
      error: error.message,
    });
  }
};

export const getMarketPlacedata = async (req, res) => {
  try {
    // ✅ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Match stage
    const matchStage = {
      status: "live",
      add_post: req.query.add_post || { $exists: true }, // allow all if not passed
      mainCategory: { $ne: null },
    };

    // ✅ Aggregation pipeline
    const pipeline = [
      // 1️⃣ Filter
      { $match: matchStage },

      // 2️⃣ Lookup USER info
      {
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userinfo",
        },
      },
      { $unwind: { path: "$userinfo", preserveNullAndEmptyArrays: true } },

      // 3️⃣ Sort by views (important for top 10)
      { $sort: { viewsCount: -1 } },

      // 4️⃣ Group by add_post ✅
      {
        $group: {
          _id: "$add_post",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              add_post: "$add_post",
              mainCategory: "$mainCategory",
              subCategory: "$subCategory",
              propertyType: "$propertyType",
              shortTitle: "$shortTitle",
              userid: "$userid",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",

              // 🔥 property extra fields (kept from your code)
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",

              phoneNo: "$phoneNo",
              whatsapp: "$whatsapp",

              // 🏠 property related
              bedrooms: "$bedrooms",
              bathrooms: "$bathrooms",
              readyByDate: "$readyByDate",
              isFurnished: "$isFurnished",
              developer: "$developer",
              occupancyStatus: "$occupancyStatus",
              amenities: "$amenities",
              maplocation: "$maplocation",

              // 🧑 user info
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image",
              },
            },
          },
        },
      },

      // 5️⃣ Project final response
      {
        $project: {
          _id: 0,
          groupName: "$_id",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }, // ✅ only 10 per group
        },
      },

      // 6️⃣ Sort groups by popularity
      { $sort: { totalViews: -1 } },

      // 7️⃣ Pagination on groups
      { $skip: skip },
      { $limit: limit },
    ];

    // ✅ Run aggregation
    const data = await PropertyAds.aggregate(pipeline);

    // ✅ Count total groups
    const totalGroups = await PropertyAds.distinct("add_post", matchStage);

    res.status(200).json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.ceil(totalGroups.length / limit),
      totalGroups: totalGroups.length,
    });
  } catch (error) {
    console.error("getMarketPlacedata error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace data",
      error: error.message,
    });
  }
};

export const getTopCategoriesByViews_off18Jan = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const matchStage = {
      status: "live",
      add_post: req.query.add_post || "Property",
      mainCategory: { $ne: null }
    };

    const pipeline = [
      // 1️⃣ Match
      { $match: matchStage },

      // 2️⃣ Lookup USER
      {
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userinfo"
        }
      },
      {
        $unwind: {
          path: "$userinfo",
          preserveNullAndEmptyArrays: true
        }
      },

      // 3️⃣ Sort by views
      { $sort: { viewsCount: -1 } },

      // 4️⃣ Group by category
      {
        $group: {
          _id: "$mainCategory",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              mainCategory: "$mainCategory",
           //   categoryName : category modal math with mainCategory category modal
           //   subcategoryName : category modal math with mainCategory category modal
              subCategory: "$subCategory",
              propertyType: "$propertyType",
              shortTitle: "$shortTitle",
              userid: "$userid",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",
              phoneNo: "$phoneNo",
              whatsapp: "$whatsapp",
              similartransaction: "$similartransaction",
              RERAlandlordname: "$RERAlandlordname",
              RERApreregistrationnumber: "$RERApreregistrationnumber",
              RERAtitledeednumber: "$RERAtitledeednumber",
              RERA_property_status: "$RERA_property_status",
              propertyReference: "$propertyReference",
              rentispaid: "$rentispaid",
              dealername: "$dealername",
              landlordAgent: "$landlordAgent",
              youtubeURL: "$youtubeURL",
              totalClosingFee : "$totalClosingFee",
              bedrooms: "$bedrooms",
              bathrooms: "$bathrooms",
              readyByDate: "$readyByDate",
              annualCommunityFee: "$annualCommunityFee",
              isFurnished: "$isFurnished",
              propertyReference: "$propertyReference",
              buyerTransferFee: "$buyerTransferFee",
              developer: "$developer",
              sellerTransferFee: "$sellerTransferFee",
              maintenanceFee: "$maintenanceFee",
              occupancyStatus: "$occupancyStatus", 
              amenities: "$amenities",
              maplocation: "$maplocation",

              minimumcontractperiodinmonth: "$minimumcontractperiodinmonth",
              noticeperiodinmonths: "$noticeperiodinmonths",
              securitydeposit: "$securitydeposit",
              numberoftenants: "$numberoftenants",
              typeoftenants: "$typeoftenants",
              bathroomstype: "$bathroomstype",
              preferrednationalityoftenants: "$preferrednationalityoftenants",
              balcony: "$balcony",
              roomtype: "$roomtype",
              optiontypes: "$optiontypes",
              contactoptions: "$contactoptions",


              // ✅ userinfo NOW EXISTS
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image"
              }
            }
          }
        }
      },

      // 5️⃣ Lookup CATEGORY
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },

      // 6️⃣ Final shape
      {
        $project: {
          categoryName: "$category.name",
          categoryIcon: "$category.icon",
          categoryImage: "$category.image",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }
        }
      },

      // 7️⃣ Sort + paginate
      { $sort: { totalViews: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await PropertyAds.aggregate(pipeline);

    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);

    res.status(200).json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.ceil(totalCategories.length / limit),
      totalCategories: totalCategories.length
    });

  } catch (error) {
    console.error("getTopCategoriesByViews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top categories",
      error: error.message
    });
  }
};


export const getTopCategoriesByViews_1 = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const matchStage = {
      status: "live",
      add_post: req.query.add_post || "property",
      mainCategory: { $ne: null }
    };

    const pipeline = [
      // 1️⃣ Match live ads
      { $match: matchStage },

      // 2️⃣ Sort ads by views
      { $sort: { viewsCount: -1 } },

      // 3️⃣ Group by mainCategory
      {
        $group: {
          _id: "$mainCategory",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              shortTitle: "$shortTitle",
              userid: "$userid",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image",
              },
            }
          }
        }
      },

      // 4️⃣ Lookup category info
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },

      // 5️⃣ Final response shape
      {
        $project: {
          _id: 1,
          categoryName: "$category.name",
          categoryIcon: "$category.icon",
          categoryImage: "$category.image",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }
        }
      },

      // 6️⃣ Sort categories by views
      { $sort: { totalViews: -1 } },

      // 7️⃣ Pagination
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await PropertyAds.aggregate(pipeline);

    // 🔹 Total category count
    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);

    res.status(200).json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.ceil(totalCategories.length / limit),
      totalCategories: totalCategories.length
    });

  } catch (error) {
    console.error("getTopCategoriesByViews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top categories",
      error: error.message
    });
  }
};


export const getTopCategoriesByViews_11Jan = async (req, res) => {
  const { page = 1, limit = 10, add_post } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;

  try {
    // 🔹 Filter only live ads & ad type
    const matchStage = {
      status: "live",
      add_post: add_post || "property",
    };

    const pipeline = [
      // 1️⃣ Match
      { $match: matchStage },

      // 2️⃣ Convert mainCategory → ObjectId (🔥 REQUIRED FIX)
      {
        $addFields: {
          mainCategoryObj: {
            $cond: [
              { $eq: [{ $type: "$mainCategory" }, "objectId"] },
              "$mainCategory",
              { $toObjectId: "$mainCategory" },
            ],
          },
        },
      },

      // 3️⃣ Convert userid → ObjectId (safe)
      {
        $addFields: {
          useridObj: {
            $cond: [
              { $eq: [{ $type: "$userid" }, "objectId"] },
              "$userid",
              { $toObjectId: "$userid" },
            ],
          },
        },
      },

      // 4️⃣ Lookup user info
      {
        $lookup: {
          from: "users",
          localField: "useridObj",
          foreignField: "_id",
          as: "userinfo",
        },
      },
      {
        $unwind: {
          path: "$userinfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 5️⃣ Sort ads by views
      { $sort: { viewsCount: -1 } },

      // 6️⃣ Group by CATEGORY
      {
        $group: {
          _id: "$mainCategoryObj",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              shortTitle: "$shortTitle",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image",
              },
            },
          },
        },
      },

      // 7️⃣ Lookup CATEGORY details (🔥 NOW WORKS)
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 8️⃣ Sort categories by total views
      { $sort: { totalViews: -1 } },

      // 9️⃣ Final response shape
      {
        $project: {
          _id: 1,
          categoryName: "$category.name",
          categoryIcon: "$category.icon",
          categoryImage: "$category.image",
          categoryType: "$category.type",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] },
        },
      },

      // 🔟 Pagination
      { $skip: skipNum },
      { $limit: limitNum },
    ];

    const result = await PropertyAds.aggregate(pipeline);

    // 🔹 Total categories count
    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);

    res.status(200).json({
      success: true,
      data: result,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCategories.length / limitNum),
      totalCategories: totalCategories.length,
    });
  } catch (error) {
    console.error("Error fetching top categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching top categories",
      error: error.message,
    });
  }
};


export const getTopCategoriesByViews_____ = async (req, res) => {
  const { page = 1, limit = 10, add_post } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;

  try {
    // 🔹 Match only live properties and given add_post type
    const matchStage = {
      status: "live",
      add_post: add_post || "property",
    };

    const pipeline = [
      { $match: matchStage },

      // 🔹 Convert userid string → ObjectId (if needed)
      {
        $addFields: {
          useridObj: {
            $cond: [
              { $eq: [{ $type: "$userid" }, "objectId"] },
              "$userid",
              { $toObjectId: "$userid" },
            ],
          },
        },
      },

      // 🔹 Lookup user info from "users" collection
      {
        $lookup: {
          from: "users",
          localField: "useridObj",
          foreignField: "_id",
          as: "userinfo",
        },
      },
      {
        $unwind: {
          path: "$userinfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 Sort by viewsCount before grouping
      { $sort: { viewsCount: -1 } },

      // 🔹 Group by category
      {
        $group: {
          _id: "$mainCategory",
          //want to add here name it will comming from Category Modal
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              shortTitle: "$shortTitle",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image",
              },
            },
          },
          totalViews: { $sum: "$viewsCount" },
        },
      },

      // 🔹 Sort categories by totalViews
      { $sort: { totalViews: -1 } },

      // 🔹 Limit to top 10 properties per category
      {
        $project: {
          _id: 1,
          totalViews: 1,
          properties: { $slice: ["$properties", 10] },
        },
      },

      // 🔹 Pagination
      { $skip: skipNum },
      { $limit: limitNum },
    ];

    const result = await PropertyAds.aggregate(pipeline);

    // 🔹 Count total categories for pagination
    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);
    const totalPages = Math.ceil(totalCategories.length / limitNum);

    res.status(200).json({
      success: true,
      data: result,
      currentPage: pageNum,
      totalPages,
      totalCategories: totalCategories.length,
    });
  } catch (err) {
    console.error("Error fetching top categories:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching top categories",
      error: err.message,
    });
  }
};

export const getTopCategoriesByViews_off = async (req, res) => {
  const { page = 1, limit = 10, add_post } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;
  try {
    // Build match filter
    const matchStage = {
      status: "live",
      add_post: add_post || "property" // default to "property" if not provided
    };

    const pipeline = [
      { $match: matchStage },             // Filter by add_post and status
      { $sort: { viewsCount: -1 } },     // Sort properties by viewsCount descending

      {
        $group: {
          _id: "$mainCategory",
          properties: { $push: "$$ROOT" },
          userinfo: { // i want to add here properties.userid it will match with Users(Model) _id and will get name,email,image,_id
          },
          totalViews: { $sum: "$viewsCount" }
        }
      },

      { $sort: { totalViews: -1 } },     // Sort categories by total views

      {
        $project: {
          _id: 1,
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }  // Top 10 properties per category
        }
      },

      { $skip: skipNum },
      { $limit: limitNum }
    ];

    const result = await PropertyAds.aggregate(pipeline);

    // Count total categories for pagination info
    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);
    const totalPages = Math.ceil(totalCategories.length / limitNum);

    res.status(200).json({
      data: result,
      currentPage: pageNum,
      totalPages,
      totalCategories: totalCategories.length
    });
  } catch (err) {
    console.error("Error fetching top categories:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addSimilaradd = async (req, res) => {
  try {
    console.log('req....', JSON.stringify(req.params))
    console.log('...reqbody...', JSON.stringify(req.body))
    const { id } = req.params;
    const { date, price, sqft } = req.body;

    const property = await PropertyAds.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.similartransaction.push({ date, price, sqft });
    await property.save();

    res.status(201).json(property.similartransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}








