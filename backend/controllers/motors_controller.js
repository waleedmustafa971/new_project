import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import PropertyAds from '../models/PropertyAds.js';
import Users from '../models/users.js';
import Category from '../models/Category.js'
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import dotenv from "dotenv";

dotenv.config();


export const addData = async (req, res) => {
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
      if (req.query.year) filter.year = req.query.year; // rent or sale
      if (req.query.mainCategory) filter.mainCategory = req.query.mainCategory;
      if (req.query.subCategory) filter.subCategory = req.query.subCategory; //
      if (req.query.makemodel) filter.makemodel = req.query.makemodel; //makemodel regional_specs
      if (req.query.regionalspecs) filter.regional_specs = req.query.regionalspecs; //makemodel regional_specs


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
      if (req.query.keyword) {
        filter.shortTitle = { $regex: req.query.keyword, $options: "i" };
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


export const updateMotorsData = async (req, res) => {
  if (!req.body) {
    return res.status(404).json({ message: 'insert the required fields' });
  }
  try {
    const {
      id, youtubeURL, phoneNo, 
      whatsapp, price, description, 
      location, status, userid,
        fueltype,
            externalcolor,
            interiorcolor,
            warranty,
            doors, 
            transmissiontypes,
            seatingcapacity,
            horosepower,
            steeringside,
            add_post,
            technical_features,
            extras, horsepower
    } = req.body;
    console.log('...form data....' + JSON.stringify(req.body))
    const updatedProperty = await PropertyAds.findByIdAndUpdate(
      id, // ✅ Use just the ID, not `_id: id`
      {
        youtubeURL,
        phoneNo,
        whatsapp,
        price,
        description,
        fueltype,
        externalcolor,
        interiorcolor,
        warranty,
        doors, 
        transmissiontypes,
        seatingcapacity,
        horosepower,
        steeringside,
        add_post,
        technical_features,
        extras, location, status, horsepower
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
      message: 'Motors updated successfully',
      data: updatedProperty
    });

  } catch (error) {
    console.error('Error updating Motors:', error);
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

    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";
    const status = req.query.status || "";

    // Build filter dynamically
    const filter = {};

    if (userid) {
      filter.userid = userid;
    }

    if (status) {
      filter.status = status;
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

export const deleteImage = async (req, res) => {
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

export const getmaincategoryList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const status = req.query.status || "";
    const userid = req.query.userid || ""; 
    const mainCategory = req.query.category || ""; 
    const scategory = req.query.subcategory || ""; 
    const add_post = req.query.add_post || ""; 
    const propertyType = req.query.propertyType || "";


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
    if (mainCategory) {
      filter.mainCategory = mainCategory;
    }
    if (scategory) {
      filter.subCategory = scategory;
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

export const motorsList = async (req, res) => {
  console.log(' ..... motorsList..... ', JSON.stringify(req.query))
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
    const makemodel = req.query.makemodel || "";
    const fueltype = req.query.fueltype || "";
    const regional_specs = req.query.regional_specs || "";
    const transmissiontypes = req.query.transmissiontypes || "";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

    const yearFrom = req.query.yearFrom ? Number(req.query.yearFrom) : undefined;
    const yearTo = req.query.yearTo ? Number(req.query.yearTo) : undefined;

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
    if (makemodel) {
      filter.makemodel = makemodel;
    }
    if (fueltype) {
      filter.fueltype = fueltype;
    }
    if (regional_specs) {
      filter.regional_specs = regional_specs;
    }
    //transmissiontypes
    if (transmissiontypes) {
      filter.transmissiontypes = transmissiontypes;
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

     if (!isNaN(yearFrom) || !isNaN(yearTo)) {
      filter.year = {};
      if (!isNaN(yearFrom)) filter.year.$gte = yearFrom;
      if (!isNaN(yearTo)) filter.year.$lte = yearTo;
    } 
   // const subcategories = await Category.find({ parentId: Category });
    const subcategories = CategoryId ? await Category.find({ parentId: CategoryId }): [];
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





