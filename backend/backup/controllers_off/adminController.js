import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import multer from "multer";
import Admin from '../models/Admin.js'
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;


export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }
    // 1️⃣ Check if user exists
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid email or password" });
    }

    // 2️⃣ Compare entered password with hashed password in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(201).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    return res
      .status(201)
      .json({ message: "Login successful", token, usersdata: user });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const createAdmin = async(req, res) => {
  try {
    const { name, designation, email, password, status, permissions } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      designation,
      email,
      password: hashedPassword,
      status,
      permissions,
    });

    await newAdmin.save();
    res.status(201).json(newAdmin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updates, { new: true });
    res.json(updatedAdmin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await Admin.findByIdAndDelete(id);
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
