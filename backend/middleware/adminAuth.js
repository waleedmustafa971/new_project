import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

/*
  Auth for the admin panel UI (/admin).
  Kept separate from middleware/auth.js so the panel keeps working even when
  SECRET_KEY is not configured in .env (falls back to a local dev secret).
*/
export const ADMIN_SECRET =
  process.env.ADMIN_SECRET || process.env.SECRET_KEY || "superapp-admin-panel-dev-secret";

export const signAdminToken = (admin) =>
  jwt.sign(
    { adminId: admin._id, username: admin.username, email: admin.email, name: admin.name },
    ADMIN_SECRET,
    { expiresIn: "12h" }
  );

const adminAuth = async (req, res, next) => {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No admin token provided" });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    const admin = await Admin.findById(decoded.adminId).select("-password");
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin no longer exists" });
    }
    if (admin.status === false) {
      return res.status(403).json({ success: false, message: "Admin account is disabled" });
    }
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }
};

export default adminAuth;
