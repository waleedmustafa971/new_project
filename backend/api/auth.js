import { connectDB } from "../lib/db.js";
import User from "../models/users.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "POST") {
    const { name, email, password, type } = req.body;

    if (type === "signup") {
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "Email already exists" });

      // Hash password & save user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({ name, email, password: hashedPassword });

      return res.status(201).json({ message: "User registered successfully", userId: newUser._id });
    }

    if (type === "signin") {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "User not found" });

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

      return res.status(200).json({ message: "Login successful", token });
    }

    return res.status(400).json({ message: "Invalid request type" });
  }

  res.status(405).json({ message: "Method not allowed" });
}
