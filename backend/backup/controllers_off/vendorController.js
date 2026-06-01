import Vendor from "../models/vendorModel.js";
import { processLogo } from "../helpers/uploadHelpervendor.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/* ---------------- ADD VENDOR ---------------- */
export const addVendor = async (req, res) => {
  try {
    // Process logo if uploaded
    let logoFilename = null;
    if (req.file) {
      logoFilename = await processLogo(req.file);
    }

    // Parse addresses
    let addresses = [];
    if (req.body.addresses) {
      addresses = JSON.parse(req.body.addresses);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const existingVendor = await Vendor.findOne({ email: req.body.email });
    if (existingVendor) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Password hashing
    let hashedPassword = null;
    if (req.body.password) {
      hashedPassword = await bcrypt.hash(req.body.password, 10);
    }

    const vendorData = {
      ...req.body,
      addresses,
      password: hashedPassword,
      logo: logoFilename,
    };

    const newVendor = new Vendor(vendorData);
    const savedVendor = await newVendor.save();

    res.status(201).json({ success: true, data: savedVendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addVendor_wrk = async (req, res) => {
  try {
    const data = req.body;
    console.log('..form data....' + JSON.stringify(data))
    // Parse addresses if sent as string
    if (data.addresses) {
      data.addresses = JSON.parse(data.addresses);
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Check if email already exists
    const existingVendor = await Vendor.findOne({ email: data.email });
    if (existingVendor) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Hash password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Handle logo upload
    if (req.file) {
      data.logo = req.file.filename;
    }

    const newVendor = new Vendor(data);
    const savedVendor = await newVendor.save();

    res.status(201).json({ success: true, data: savedVendor });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- UPDATE VENDOR ---------------- */
export const updateVendor = async (req, res) => {
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
export const listVendors = async (req, res) => {
  try {
    // support query params: page, limit, search, status
    const { page = 1, limit = 20, search = "", status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { shopName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileno: { $regex: search, $options: "i" } },
      ];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const total = await Vendor.countDocuments(filter);
    const vendors = await Vendor.find(filter)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // remove password from results
    const cleaned = vendors.map(v => {
      const o = v.toObject();
      delete o.password;
      return o;
    });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: cleaned,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- VENDOR LOGIN ---------------- */
export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const match = await vendor.matchPassword(password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const obj = vendor.toObject();
    delete obj.password;
    res.json({ success: true, data: obj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
