import Socialgroup from "../models/socialmediagroup.js";
import { processLogo } from "../helpers/uploadGroupimage.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/* ---------------- ADD VENDOR ---------------- */
export const addGroup = async (req, res) => {
  try {
    // Process logo if uploaded
    let logoFilename = null;
    if (req.file) {
      logoFilename = await processLogo(req.file);
    }

    const vendorData = {
      ...req.body,
      logo: logoFilename,
    };

    const newVendor = new Socialgroup(vendorData);
    const savedVendor = await newVendor.save();

    res.status(201).json({ success: true, data: savedVendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ---------------- UPDATE VENDOR ---------------- */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    let vendor = await Vendor.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    // Email duplicate check if changed
    if (req.body.email && req.body.email !== vendor.email) {
      const exists = await Vendor.findOne({ email: req.body.email });
      if (exists) return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Process new logo if uploaded (replace)
    let logoFilename = vendor.logo;
    if (req.file) {
      // delete old file if exists
      if (logoFilename) {
        const oldPath = path.join("uploads/vendors/optimized", logoFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      logoFilename = await processLogo(req.file);
    }

    // If password provided, hash it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    } else {
      // don't include password in update if not provided
      delete req.body.password;
    }

    // Ensure addresses if provided (client should send array)
    const updateData = {
      ...req.body,
      logo: logoFilename,
    };

    const updated = await Vendor.findByIdAndUpdate(id, updateData, { new: true });
    const obj = updated.toObject();
    delete obj.password;
    res.json({ success: true, data: obj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- DELETE VENDOR ---------------- */
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    // remove logo file
    if (vendor.logo) {
      const logoPath = path.join("uploads/vendors/optimized", vendor.logo);
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }

    res.json({ success: true, message: "Vendor deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- LIST VENDORS ---------------- */
export const listGroup = async (req, res) => {
  try {
    // support query params: page, limit, search, status
    const { page = 1, limit = 20, search = "", status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } }
      ];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const total = await Socialgroup.countDocuments(filter);
    const vendors = await Socialgroup.find(filter)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: vendors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

