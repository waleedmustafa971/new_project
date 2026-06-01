import Vendor from "../models/vendorModel.js";
import { processLogo } from "../helpers/uploadHelpervendor.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import Orderfood from "../models/foodorderModal.js";

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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    // Find vendor
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password (same as user login style)
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Access token (short-lived)
    const token = jwt.sign(
      { vendorId: vendor._id, email: vendor.email },
      SECRET_KEY,
      { expiresIn: "10m" }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { vendorId: vendor._id, email: vendor.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password before sending response
    const vendorData = vendor.toObject();
    delete vendorData.password;

    return res.status(200).json({
      message: "Vendor login successful",
      token,
      refreshToken,
      vendorData
    });

  } catch (err) {
    console.error("Error logging in vendor:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const vendororderList = async (req, res) => {
  try {
    const vendorId = req.params.vendorid;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Orderfood.find({
      "products.vendorId": vendorId
    })
      .populate("userid deliveryboyid")
      .populate({
        path: "products.productId",
        model: "Fooditems",
        populate: {
          path: "restaurant_id",
          model: "Restaurant"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Orderfood.countDocuments({
      "products.vendorId": vendorId
    });

    // ✅ FILTER ONLY VENDOR PRODUCTS
    const formattedOrders = orders.map(order => {
      
      const filteredProducts = order.products.filter(
        p => p.vendorId?.toString() === vendorId
      );

      return {
        _id: order._id,
        orderid: order.orderid,
        orderdate: order.orderdate,
        ordertime: order.ordertime,
        orderstatus: order.orderstatus,
        deliveryfee: order.deliveryfee,
        address: order.address,

        user: order.userid ? {
          _id: order.userid._id,
          name: order.userid.name,
          email: order.userid.email,
          mobile: order.userid.mobileno
        } : null,

        rider: order.deliveryboyid ? {
          _id: order.deliveryboyid._id,
          name: order.deliveryboyid.name,
          phone: order.deliveryboyid.phone
        } : null,
        payment: order.payment,
        // 🎯 ONLY vendor-specific products
        products: filteredProducts.map(p => ({
          _id: p._id,
          qty: p.qty,
          price: p.price,
          product: p.productId ? {
            _id: p.productId._id,
            name: p.productId.item_name,
            image: p.productId.item_image,
            price: p.productId.price,
            final_price: p.productId.final_price,
            description: p.productId.description,
            is_veg: p.productId.is_veg,
            restaurant: p.productId.restaurant_id
          } : null
        }))
      };
    });

    return res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Vendor Order List Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
