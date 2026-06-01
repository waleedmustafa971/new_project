import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import PropertyAds from '../models/PropertyAds.js';
import PropertyFavourite from '../models/propertyfavourite.js'
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
  try {
    const { body, files } = req;
    const { _id } = req.body;

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

export const RecommandList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const add_post = req.query.add_post || "";
    const propertyType = req.query.propertyType || "";
    const Category = req.query.Category || "";
    const subCategory = req.query.subCategory || "";

    // Build filter dynamically
    const filter = {};
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    if (Category) {
      filter.mainCategory = Category;
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
      minimumcontractperiodinmonth,noticeperiodinmonths,securitydeposit,
      typeoftenants,preferrednationalityoftenants,balcony,roomtype, rentispaid,
      RERA_property_status,RERAlandlordname,
      RERApreregistrationnumber,
      RERAtitledeednumber, currency,numberoftenants,
      preferrednationalitytenants,typeoftenantsallow,
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
    const { id, status, lat, long, statename, bedrooms, bathrooms } = req.body;
    console.log('.....property controller ...... ' + id + '...status....' + status)
    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        status, lat, long, statename, bedrooms, bathrooms
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
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

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
    const { slNo, imagePath } = req.body;
    console.log('...slno...' + slNo + '...id....' + id + '---image ---' + imagePath)
    if (!id) {
      return res.status(400).json({ error: 'Invalid property ID format' });
    }

    const ad = await PropertyAds.findById({ "_id": id });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    const deletedImage = ad.images.find(img => String(img.slNo) === String(slNo));
    if (!deletedImage) {
      return res.status(404).json({ error: 'Image not found by slNo' });
    }

    ad.images = ad.images.filter(img => String(img.slNo) !== String(slNo));
    ad.markModified('images');
    await ad.save();

    const fullPath = path.join(__dirname, 'uploads/property', path.basename(imagePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('Image file deleted:', fullPath);
    }

    res.status(200).json({ message: 'Image deleted successfully', ad });
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

export const updateHistory = async (req, res) => {
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


export const getViewHistory = async (req, res) => {
  const { userId, page = 1, limit = 10 } = req.query;
  console.log('....userId.....' + userId);

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;

  try {
    const result = await PropertyAds.aggregate([
      {
        $match: {
          "viewHistory.userId": userId
        }
      },
      {
        $addFields: {
          viewHistory: {
            $filter: {
              input: "$viewHistory",
              as: "vh",
              cond: { $eq: ["$$vh.userId", userId] }
            }
          }
        }
      },
      { $sort: { "viewHistory.viewedAt": -1 } }, // sort by latest view
      { $skip: skipNum },
      { $limit: limitNum }
    ]);

    // Get total count for pagination info
    const totalCount = await PropertyAds.countDocuments({
      "viewHistory.userId": userId
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

export const getTopCategoriesByViews = async (req, res) => {
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
    const { propertyId } = req.params;
    const { date, price, sqft } = req.body;

    const property = await PropertyAds.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.similartransaction.push({ date, price, sqft });
    await property.save();

    res.status(201).json(property.similartransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}








