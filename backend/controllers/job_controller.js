import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import CvModel from '../models/CvModel.js';
import IndustryType from "../models/IndustryType.js";
import JobpostModal from "../models/JobpostModal.js";
import JobCategory from "../models/JobCategory.js";
//import User from "../models/Users.js";
import Users from '../models/users.js';
import multer from "multer";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import fetch from "node-fetch";
import slugify from "slugify";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from "dotenv";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;


export const getListJobtitle = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";

    console.log("Query:", req.query);

    // MATCH stage for searching
    const matchStage = {};

    // Search ANY of the group fields
    if (searchQuery) {
      matchStage.$or = [
        { jobtitle: { $regex: searchQuery, $options: "i" } },
        { industrytype: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // AGGREGATION PIPELINE
    const pipeline = [
      { $match: matchStage },

      {
        $group: {
          _id: {
            jobtitle: "$jobtitle",
            industrytype: "$industrytype",
            category: "$category",
          },
          count: { $sum: 1 }, // total items inside group
        },
      },

      { $sort: { "_id.jobtitle": 1 } }, // sort alphabetically

      { $skip: skip },
      { $limit: limit },

      {
        $project: {
          _id: 0,
          jobtitle: "$_id.jobtitle",
          industrytype: "$_id.industrytype",
          category: "$_id.category",
          count: 1,
        },
      },
    ];

    // RUN PIPELINE
    const groupedData = await JobpostModal.aggregate(pipeline);

    // COUNT TOTAL GROUPS
    const countPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            jobtitle: "$jobtitle",
            industrytype: "$industrytype",
            category: "$category",
          },
        },
      },
      { $count: "total" },
    ];

    const totalResult = await JobpostModal.aggregate(countPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return res.status(200).json({
      page,
      limit,
      totalGroups: total,
      totalPages: Math.ceil(total / limit),
      data: groupedData,
    });

  } catch (error) {
    console.error("Error fetching job titles:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const addJobData = async (req, res) => {
  try {
    const { body, file } = req; // ✅ use req.file (not req.files) since you’re using upload.single()

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Build CV file path
    const cvFilePath = `/uploads/cv/${file.filename}`;

    // Save to DB
    const ad = new CvModel({
      ...body,
      uploadcvfile: cvFilePath,
    });

    await ad.save();

    return res.status(201).json({ message: "CV created", ad });
  } catch (error) {
    console.error("Error adding CV data:", error);
    res.status(500).json({ error: error.message });
  }
};
export const deleteJobcategory = async(req, res) => {
    try {
      const categoryId = req.params.id;
      const subcategories = await JobCategory.find({ parentId: categoryId });
      const subcategoryIds = subcategories.map((sub) => sub._id.toString());
      const allCategoryIds = [categoryId, ...subcategoryIds];
      // ✅ 3. Safe to delete category and subcategories
      await JobCategory.deleteMany({
        $or: [{ _id: categoryId }, { parentId: categoryId }],
      });
  
      return res.status(200).json({
        message: "Category and its subcategories deleted successfully!",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  
}

export const getCategoryWithJobCount = async (req, res) => {
  try {
    const jobCounts = await JobpostModal.aggregate([
      {
        $group: {
          _id: "$category", // group by category slug
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 } // optional: sort descending by count
      }
    ]);

    return res.status(200).json(jobCounts);
  } catch (error) {
    console.error("Error fetching job counts by category:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getEducationQualificationCount = async (req, res) => {
  try {
    // 1️⃣ Predefined education levels with icons
    const educationLevels = [
      { id: "1", title: "High School / Secondary", icon: "school-outline" },
      { id: "2", title: "Bachelors Degree", icon: "book-open-variant" },
      { id: "3", title: "Masters Degree", icon: "book-education-outline" },
      { id: "4", title: "PhD", icon: "school-outline" },
    ];

    // 2️⃣ Aggregate job counts from JobpostModal
    const educationCounts = await JobpostModal.aggregate([
      {
        $group: {
          _id: { $trim: { input: "$minimumeducationlevel" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3️⃣ Create a lookup map for faster access
    const countMap = {};
    educationCounts.forEach(item => {
      if (item._id) {
        countMap[item._id.toLowerCase()] = item.count;
      }
    });

    // 4️⃣ Merge counts into predefined levels, keeping icons
    const result = educationLevels.map(level => {
      const key = level.title.toLowerCase();
      return {
        id: level.id,
        title: level.title,
        icon: level.icon,
        count: countMap[key] || 0, // if missing → 0
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting education qualification counts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getJobtype = async (req, res) => {
  try {
    // 1️⃣ Predefined education levels with icons
    const educationLevels = [
      { id: "1", title: "Full Time", icon: "school-outline" },
      { id: "2", title: "Part Time", icon: "book-open-variant" },
      { id: "3", title: "Contact", icon: "book-education-outline" },
      { id: "4", title: "Remote", icon: "school-outline" },
    ];

    // 2️⃣ Aggregate job counts from JobpostModal
    const educationCounts = await JobpostModal.aggregate([
      {
        $group: {
          _id: { $trim: { input: "$employementtype" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3️⃣ Create a lookup map for faster access
    const countMap = {};
    educationCounts.forEach(item => {
      if (item._id) {
        countMap[item._id.toLowerCase()] = item.count;
      }
    });

    // 4️⃣ Merge counts into predefined levels, keeping icons
    const result = educationLevels.map(level => {
      const key = level.title.toLowerCase();
      return {
        id: level.id,
        title: level.title,
        icon: level.icon,
        count: countMap[key] || 0, // if missing → 0
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting education qualification counts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getparSublist = async (req, res) => {
  try {
    // 1️⃣ Fetch all categories
    const categories = await JobCategory.find().lean();

    // 2️⃣ Aggregate job counts by JobpostModal.category (slug)
    const jobCounts = await JobpostModal.aggregate([
      {
        $group: {
          _id: "$category", // category slug
          count: { $sum: 1 },
        },
      },
    ]);

    // 3️⃣ Create a lookup for faster access
    const countMap = {};
    jobCounts.forEach((item) => {
      if (item && item._id) {
        countMap[item._id.toLowerCase().trim()] = item.count;
      }
    });

    // 4️⃣ Recursive hierarchy builder
    const buildHierarchy = (parentId = null) => {
      return categories
        .filter((cat) => {
          // Properly handle null parentIds (root categories)
          if (parentId === null) return !cat.parentId;
          return String(cat.parentId) === String(parentId);
        })
        .map((cat) => {
          const slugKey = cat.slug ? cat.slug.toLowerCase().trim() : "";
          const jobCount = countMap[slugKey] || 0;

          return {
            _id: cat._id,
            title: cat.title,
            slug: cat.slug,
            icon: cat.icon,
            parentId: cat.parentId,
            jobCount,
            subcategories: buildHierarchy(cat._id),
          };
        });
    };

    // 5️⃣ Build the final structure
    const result = buildHierarchy(null);

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error fetching categories with job counts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getparSublist_____ = async(req, res) => {
    try {
      const categories = await JobCategory.find();
  
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

export const addIndustryData = async (req, res) => {
  try {
    const { body } = req;
    console.log('...body....' + JSON.stringify(body))
    const ad = new IndustryType({
      title: body.title,
      slug: body.slug // optional, will auto-generate if missing
    });

    await ad.save();
    return res.status(201).json({ message: "IndustryType created", ad });
  } catch (error) {
    console.error("Error adding IndustryType data:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    if (error.code === 11000) {
      return res.status(400).json({ error: "Title or slug must be unique" });
    }

    res.status(500).json({ error: "Server error" });
  }
};

export const getIndustryData = async (req, res) => {
  try {
    const industries = await IndustryType.find().sort({ title: 1 }); // sort alphabetically
    return res.status(200).json({ success: true, data: industries });
  } catch (error) {
    console.error("Error fetching IndustryType data:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getJobaApproval = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('req........' + JSON.stringify(req.query));

    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";
    const _id = req.query._id || "";
    const companyname = req.query.companyname || "";
    const industrytype = req.query.industrytype || "";
    const category = req.query.category || "";

    const filter = {};

    if (userid) filter.userid = userid;
    if (category) filter.category = category;
    if (companyname) filter.status = companyname;
    if (_id) filter._id = _id;
    if (industrytype) filter.industrytype = industrytype;

    if (searchQuery) {
      filter.jobtitle = { $regex: searchQuery, $options: "i" };
    }

    const users = await JobpostModal.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await JobpostModal.countDocuments(filter);

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


//addJobPost
export const addJobPost = async (req, res) => {
   try {
    const body = req.body;
    console.log('....body...dilw-----' + JSON.stringify(req.body))

    // ⚡ If frontend sends arrays (skills, benefits, languages) as comma-separated strings in FormData,
    // convert them back into arrays
    const parseArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return val.split(",").map((item) => item.trim());
    };

    const job = new JobpostModal({
      companyname: body.companyname,
      hidecompany: body.hidecompany,
      companysize: body.companysize,
      tradelicenseno: body.tradelicenseno,
      companycity: body.companycity,
      companyaddress: body.companyaddress,
      companyemail: body.companyemail,
      phoneno: body.phoneno,
      Writedetailsaboutcompany: body.Writedetailsaboutcompany,
      jobtitle: body.jobtitle,
      jobrole: body.jobrole,
      industrytype: body.industrytype,
      jobdescription: body.jobdescription,
      employementtype: body.employementtype,
      remotejob: body.remotejob,
      minimumworkingexperience: body.minimumworkingexperience,
      minimumeducationlevel: body.minimumeducationlevel,
      monthlysalary: body.monthlysalary,
      cvrequired: body.cvrequired,

      gender: body.gender,
      skills: parseArray(body.skills),
      Benefits: parseArray(body.Benefits),
      languages: parseArray(body.languages),

      category: body.category,
      subcategory: body.subcategory,
      userid: body.userid,
      status: body.status || "pending"
    });

    await job.save();
    res.status(201).json({ message: "Job post created successfully", job });
  } catch (error) {
    console.error("Error creating job post:", error);
    res.status(500).json({ error: error.message });
  }
};


export const getListJob = async (req, res) => {
    try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log('req........' + JSON.stringify(req.query))
    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";
    const _id = req.query._id || "";
    const companyname = req.query.companyname || "";
    const industrytype = req.query.industrytype || "";
    const category = req.query.category || "";

    // Build filter dynamically
    const filter = {};

    if (userid) {
      filter.userid = userid;
    }
    if(category){
      filter.category = category;
    }
    if (companyname) {
      filter.status = companyname;
    }
    if (_id) {
      filter._id = _id;
    }
    if (industrytype) {
      filter.industrytype = industrytype;
    }

    if (searchQuery) {
      filter.jobtitle = { $regex: searchQuery, $options: "i" };
    }

    // Query with filters, pagination
    const users = await JobpostModal.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: sort newest first

    const total = await JobpostModal.countDocuments(filter);

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

export const AddJobCategory = async (req, res) => {
  try {
    const { title, slug, parentId } = req.body;
  console.log("Request body:", req.body);

    const slugname = slug
      ? slug
      : slugify(title, { lower: true, strict: true }); // ✅ use title, not body.title

    const ad = new JobCategory({
      title,
      slug: slugname,
      parentId: parentId || null
    });

    await ad.save();
    return res.status(201).json({ message: "JobCategory created", ad });
  } catch (error) {
    console.error("Error adding JobCategory data:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    if (error.code === 11000) {
      return res.status(400).json({ error: "Title or slug must be unique" });
    }

    res.status(500).json({ error: "Server error" });
  }
};

export const getJcategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const parentId = req.query.parentId || null;

    console.log("req.query:", req.query);

    // Build filter dynamically
    const filter = {};

    // Search by title (case-insensitive)
    if (searchQuery) {
      filter.title = { $regex: searchQuery, $options: "i" };
    }

    // Filter by parentId — null = top-level categories
    if (parentId === "null" || parentId === "" || !parentId) {
      filter.parentId = null; // get only parent categories
    } else {
      filter.parentId = parentId; // get subcategories of a parent
    }

    // Query with filters, pagination, sorting
    const categories = await JobCategory.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("parentId", "title slug"); // optional: show parent info

    const total = await JobCategory.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      categories,
    });

  } catch (error) {
    console.error("Error fetching job categories:", error);
    res.status(500).json({ message: "Error fetching job categories" });
  }
};









