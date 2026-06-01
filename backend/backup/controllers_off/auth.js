import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import Reel from "../models/Reels.js";
//import Music from '../models/Music.js';
import multer from "multer";
import AWS from 'aws-sdk';

//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;


console.log('Bucket Name:', process.env.S3_BUCKET_NAME);

/*  const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "profilepicture/");
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "_" + file.originalname);
    },
  }),
}).single("profileImage");  */ // <-- This MUST match the frontend field name

// AWS S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,  //AKIAU6VTTOMEQBYUYF6T
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer local storage

//use for aws
/* const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});
const upload = multer({ storage }); */
//end aws server upload 
// Multer local storage



// Storage Config
/* const storage = multer.diskStorage({
  destination: 'uploads/music/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

//const upload = multer({ storage });
const upload = multer({ storage: storage }).single('file'); */

// Define storage

// Middleware for multiple file types

/* this is for local upload in nodejs public folder */


/* const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profile') {
      cb(null, 'uploads/music/bannerpicture');
    } else if (file.fieldname === 'audio') {
      cb(null, 'uploads/music');
    }
  }, //uploads/music/bannerpicture  uploads/music
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
}); 
const upload = multer({ storage }).fields([
  { name: 'profile', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]); 


*/
/* setup is for aws server */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });
/* End setup is for aws server */

export const Googlecheck = async (req, res) => {
 // console.log("......json....", req.body);
 // console.log("JWT_SECRET:", process.env.SECRET_KEY);
  try {
    const { email, securitycode } = req.body;
    console.log("......json..email..", email);

    /*  if (!email) {
       return res.status(400).json({ message: "email is required" });
     }
  */
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Invalid info" });
    }

    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Generate refresh token (longer-lived)
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

   /*  const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    ); */

    return res.status(200).json({
      message: "User verified successfully",
      token,
      refreshToken,
      usersdata: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const Googlesignin = async (req, res) => {
  console.log('body...Googlesignin....' + JSON.stringify(req.body))
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(201).json({ message: "name, email is required" });
    }
    const password = "!@HGs6723232";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists

    const existingUseremail = await User.findOne({ email: email });
    if (existingUseremail) {
      console.log({ message: "email is already used" });
       // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: existingUseremail._id, email: existingUseremail.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Generate refresh token (longer-lived)
    const refreshToken = jwt.sign(
      { userId: existingUseremail._id, email: existingUseremail.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    console.log({ message: "email already exits", token, refreshToken, usersdata: existingUseremail })
    return res
      .status(201)
      .json({ message: "User registered successfully", token, refreshToken, usersdata: existingUseremail });

    //  return res.status(201).json({ message: "email is already used" });
     
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      emailverify: 'Verify',
      regtype: 'email',
      regby: "google"
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.mobileno },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Generate refresh token (longer-lived)
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    console.log({ message: "User registered successfully", token, refreshToken, usersdata: user })
    return res
      .status(201)
      .json({ message: "User registered successfully", token, refreshToken, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }

}


export const reg = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  // 1️⃣ Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already in use" });
  }

  // 2️⃣ Create new user and save to database
  const newUser = new User({ name, email, password });
  await newUser.save();

  return res
    .status(201)
    .json({ message: "User registered successfully", user: newUser });
  /*   
  res.status(200).json({
      message: "Form-data received successfully!",
      data: { name, email, password }
  });
 */
};

export const registerMobile = async (req, res) => {
  // console.log('body....' + JSON.stringify(req.body))
  try {
    const { name, email, password, mobileno, otpcode, type } = req.body;
    if (!name || !email || !password) {
      return res.status(201).json({ message: "All fields are required" });
    }
    // console.log("Received Form Data:", req.body); // Debugging
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: mobileno });
    if (existingUser) {
      const token = jwt.sign(
        { userId: existingUser._id, email: mobileno },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      return res.status(201).json({ message: "mobile no is already used", token, usersdata: existingUser });
    }
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobileno: mobileno,
      regtype: type,
      otpcode: otpcode,
      mobileverify: 'Not Verify',
      type: type
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.mobileno },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    return res
      .status(201)
      .json({ message: "User registered successfully", token, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const verifyMobile = async (req, res) => {
  console.log('Received body:', req.body);

  try {
    const { mobileno, otpcode } = req.body;

    if (!mobileno || !otpcode) {
      return res.status(400).json({ message: "mobileno and otpcode are required" });
    }

    // Check if user with matching mobile and OTP exists
    const existingUser = await User.findOne({ mobileno, otpcode });

    if (!existingUser) {
      return res.status(400).json({ message: "OTP not found or incorrect" });
    }

    // Update the user to mark mobile as verified
    const updatedUser = await User.findOneAndUpdate(
      { mobileno },
      { $set: { mobileverify: 'Verify' } },
      { new: true }
    );

    console.log("User verified:", updatedUser);

    return res.status(200).json({ message: "Mobile number verified", updateinfo: updatedUser });
  } catch (error) {
    console.error("Error in verifyMobile:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const updateDateofbirth = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { mobileno, dateofbirth, password, name } = req.body;
    /*   if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
      } */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: mobileno });
    if (existingUser) {
      console.log('...mobileno...' + existingUser)
      // Update the user to mark mobile as verified
      const updatedUser = await User.findOneAndUpdate(
        { mobileno },
        { $set: { dateofbirth: dateofbirth, password: hashedPassword, name: name } },
        { new: true }
      );

      console.log("User verified:", updatedUser);
      return res
        .status(201)
        .json({ message: "birthdate updated", usersdata: updatedUser });
    }
    else {
      return res
        .status(201)
        .json({ message: "mobile no not found", usersdata: null });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateDateofbirthbyemail = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { email, dateofbirth, password, name } = req.body;
    /*   if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
      } */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      console.log('...email...' + existingUser)
      // Update the user to mark mobile as verified
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { dateofbirth: dateofbirth, password: hashedPassword, name: name } },
        { new: true }
      );

      console.log("User verified:", updatedUser);
      return res
        .status(201)
        .json({ message: "birthdate updated", usersdata: updatedUser });
    }
    else {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        mobileno: 'null',
        regtype: 'Email',
        otpcode: '',
        emailverify: 'Not Verify',
        type: 'Email'
      });
      await newUser.save();

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(201).json({ message: "Invalid info" });
      }
      // 3️⃣ Generate JWT Token
      const token = jwt.sign(
        { userId: newUser._id, email: newUser.mobileno },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      return res
        .status(201)
        .json({ message: "User registered successfully", token, usersdata: user });

    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const updateInterest = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { email, interest } = req.body;
    /*   if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
      } */

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { interest: interest } },
        { new: true }
      );
      return res
        .status(201)
        .json({ message: "interested updated" });
    }


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};



export const register = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { name, email, password, mobileno, otpcode } = req.body;
    if (!name || !email || !password) {
      return res.status(201).json({ message: "All fields are required" });
    }
    // console.log("Received Form Data:", req.body); // Debugging
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {

      return res.status(201).json({ message: "Email already in use" });
    }
    // 2️⃣ Create new user and save to database
    if (type == "Mobile") {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        mobileno: mobileno,
        regtype: 'Mobile',
        otpcode: otpcode,
        mobileverify: 'Not Verify'
      });
      await newUser.save();
    }
    else {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        mobileno: mobileno,
        regtype: 'Email',
        otpcode: '0000'
      });
      await newUser.save();
    }


    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    return res
      .status(201)
      .json({ message: "User registered successfully", token, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(201).json({ message: "Email Address is required" });
    }

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(201).json({ message: "Email already in use" });
    }
    else {
      return res.status(201).json({ message: "Email Not Found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const checkMobile = async (req, res) => {
  console.log('body....', req.body)
  try {
    const { mobileno } = req.body;
    if (!mobileno) {
      return res.status(201).json({ message: "mobileno is required" });
    }
    // 1️⃣ Check if mobileno already exists
    const existingUser = await User.findOne({ mobileno });
    if (existingUser) {
      return res.status(201).json({ message: "mobileno already in use", userinfo: existingUser });
    }
    else {
      return res.status(201).json({ message: "mobileno not found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const welcome = (req, res) => {
  return res.json("You are not authorized");
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate access token (short-lived)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      SECRET_KEY,
      { expiresIn: "2m" } //1h 1h 1d
    );

    // Generate refresh token (longer-lived)
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // You can store refresh token in DB for extra security (optional)

    return res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      usersdata: user
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  console.log('...Refresh token.....' + refreshToken)
  console.log('.....JWT_SECRET....' + SECRET_KEY)
  console.log('.....JWT_REFRESH_SECRET....' + process.env.JWT_REFRESH_SECRET)

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    // Verify with the REFRESH secret
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Create new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      SECRET_KEY,
      { expiresIn: "15m" }
    );

    res.json({ token: newAccessToken });

  } catch (err) {
    console.error("Refresh token error:", err.message);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};



// API to Handle Image Upload
export const editProfile = async (req, res) => {
  //  if (err) return res.status(500).json({ error: err.message });
  try {
    const { name, email, bio, id } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      { _id: id },
      { name, email, bio },
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// API to Handle Image Upload
export const updateProfileImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const { email } = req.body;
      const imageUrl = `/profilepicture/${req.file.filename}`;

      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { image: imageUrl } },
        { new: true }
      );

      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });

      res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

export const updatePassword = async (req, res) => {
  const { password, email } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  if (!password || !email) {
    return res.status(400).json({
      message: "Password, email are required.",
    });
  }
  console.log('....json.....' + JSON.stringify(req.body))
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email }, // Find user by mobile number
      {
        $set: { password: hashedPassword }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const relstateProfile = async (req, res) => {
  const { firstname, lastname, dateofbirth, gender, email } = req.body;
  console.log('....json.....' + JSON.stringify(req.body))

  // Validation
  if (!firstname || !lastname || !dateofbirth || !gender || !email) {
    return res.status(400).json({
      message: "firstname, lastname, dateofbirth, gender, and email are required.",
    });
  }
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email }, // Find user by mobile number
      {
        $set: { firstname, dateofbirth, lastname, gender }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const updateByMobile = async (req, res) => {
  const { name, dateofbirth, email, password, mobileno, bio } = req.body;

  if (!mobileno || !email || !password) {
    return res
      .status(400)
      .json({ message: "Mobile No, email, and password are required." });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { mobileno }, // Find user by mobile number
      {
        $set: { name, dateofbirth, email, password, bio }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfile = async (req, res) => {
  const { email } = req.query; // Get email from request query params

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Find user by email and populate followers & following
    const user = await User.findOne({ email })
      .populate("followers", "name email") // Fetch followers data
      .populate("following", "name email"); // Fetch following data

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Count followers & following
    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    // Send response
    res.json({
      message: "User profile fetched successfully",
      user: {
        _id: user._id,
        image: user.image,
        name: user.name,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobileno: user.mobileno,
        status: user.status,
        dateofbirth: user.dateofbirth,
        bio: user.bio,
        nationality: user.nationality,
        gender: user.gender,
        type: user.type,
        image: user.image,
        onlinestatus: user.onlinestatus,
        enteredby: user.enteredby,
        updateby: user.updateby,
        xtime: user.xtime,
        gallery: user.gallery,
        address: user.address,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getSuggestions = async (req, res) => {
  //http://localhost:5000/users/65a3f1b2c3d4e5f678901234/suggestions?page=1&limit=10&search=john

  console.log("pars" + req.query);
  try {
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || "";
    const userId = req.query.userId;

    // Get the current user
    const user = await User.findById(userId).populate("following", "_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //console.log('..d....' + user)

    //return;
    // Extract following IDs
    const followingIds = user.following.map((f) => f._id.toString());

    // Construct filter criteria
    let filter = {
      _id: { $ne: userId, $nin: followingIds }, // Exclude self & already followed users
      followers: { $in: user.followers }, // Has mutual friends
    };

    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Find users who match the criteria with pagination
    const suggestedFriends = await User.find(filter)
      .select("name email image followers") // Only return relevant data
      .skip(skip)
      .limit(limit);

    res.status(200).json({ suggestions: suggestedFriends, page, limit });
  } catch (error) {
    console.error("Error fetching friend suggestions:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getuser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";

    let filter = {};

    // If userid exists and is a valid ObjectId, fetch by _id
    if (userid) {
      filter._id = userid;
    } else if (searchQuery) {
      // If no userid, search by name or email
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });

  } catch (error) {
    console.log("GET USER ERROR:", error);
    res.status(500).json({ message: "Error fetching user profile", error });
  }
};

export const notInfriends = async (req, res) => {
  try {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    // Step 1: Get current user's following list
    const currentUser = await User.findById(userId).select('following');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendIds = currentUser.following.map(id => id.toString());
    friendIds.push(userId); // Exclude self too

    // Step 2: Build query filter
    const filter = {
      _id: { $nin: friendIds },
      name: { $regex: searchQuery, $options: 'i' } // Case-insensitive name search
    };

    // Step 3: Fetch users with pagination
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);

    // Step 4: Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile", error: error.message });
  }

  /* try {
    const userId = req.query.userId; // Default page = 1
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || ""; // Get search query

     // Step 1: Get current user's following list
     const currentUser = await User.findById(userId).select('following');

     if (!currentUser) {
       return res.status(404).json({ message: 'User not found' });
     }
     const friendIds = currentUser.following.map(id => id.toString());
     friendIds.push(userId); // exclude self too
     // Step 2: Get non-friend users with pagination
     const users = await User.find({ _id: { $nin: friendIds } })
       .select('-password')
       .skip(skip)
       .limit(limit);
 
     // Step 3: Optionally get total count for frontend
     const total = await User.countDocuments({ _id: { $nin: friendIds } });
 
     res.status(200).json({
       users,
       total,
       currentPage: page,
       totalPages: Math.ceil(total / limit),
     });
 
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  } */
}
export const findPeople = async (req, res) => {
  try {
    //    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";


    // Step 2: Build query filter
    const filter = {
      name: { $regex: searchQuery, $options: 'i' } // Case-insensitive name search
    };

    // Step 3: Fetch users with pagination
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);

    // Step 4: Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile", error: error.message });
  }
}

export const updateAds = async (req, res) => {
  try {
    const { userId, address } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const formattedAddress = {
      type: address.type, // home | office | tutor
      location: address.location,
      houseNumber: address.houseNumber,
      name: address.name,
      mobile: address.mobile,
      instructions: address.instructions,
      latitude: address.latitude,
      longitude: address.longitude,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { address: formattedAddress } }, // Push new address into array
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


export const deleteAddress = async (req, res) => {
 // console.log('....form....' + JSON.stringify(req.body))
  try {
    const { userId, addressId } = req.body;

    if (!userId || !addressId) {
      return res.status(400).json({
        success: false,
        message: "userId and addressId are required"
      });
    }

    // Pull the specific address object from the array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { address: { _id: addressId } } },  // <-- remove matching address
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
  }
};




export const logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      secure: true,
      sameSite: "none",
    })
    .status(200)
    .json("User has been logged out.");
};


export const updateProfileImageaws = async (req, res) => {
  // Set up the multer upload middleware
  var singleUpload = upload.single('file'); //profile file

  singleUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Reading the file content from the local storage (disk)
    const fileContent = fs.readFileSync(req.file.path);
    const fileExt = path.extname(req.file.originalname);
    const s3Key = `${Date.now()}${fileExt}`;

    // S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype,
      ACL: 'public-read', // this sets the file to be publicly accessible
    };

    try {
      // Upload file to S3
      const command = new PutObjectCommand(params);
      await s3.send(command);

      // Delete the local file after upload
      fs.unlinkSync(req.file.path);

      // Return the file URL from S3
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

      const email = req.body.email;
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { image: fileUrl } },
        { new: true }
      );

      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });


      return res.json({
        message: 'File uploaded successfully',
        url: fileUrl,
        userdata: updatedUser
      });
    } catch (err) {
      console.error('S3 Upload Error:', err);

      // Log specific properties
      if (err.name) console.error('Error Name:', err.name);
      if (err.message) console.error('Error Message:', err.message);
      if (err.stack) console.error('Error Stack:', err.stack);

      return res.status(500).json({
        message: 'S3 upload failed',
        error: {
          name: err.name || 'UnknownError',
          message: err.message || 'No message provided',
          stack: err.stack || 'No stack trace',
        },
      });
    }
  });
};

export const webSignup = async (req, res) => {
  // console.log('body....' + JSON.stringify(req.body))
  
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(201).json({ message: "All fields are required" });
    }
    const name = firstName + ' ' + lastName;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: phone });
    if (existingUser) {
      return res.status(201).json({ message: "mobile no is already used" });
    }
    const existingUseremail = await User.findOne({ email: email });
    if (existingUseremail) {
      return res.status(201).json({ message: "email is already used" });
    }

    const newUser = new User({
      name, firstname: firstName, lastname: lastName,
      email,
      password: hashedPassword,
      mobileno: phone,
      regtype: 'email'
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.mobileno },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    return res
      .status(201)
      .json({ message: "User registered successfully", token, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const updateProfileMultiImageaws = async (req, res) => {
  // Set up the multer upload middleware for multiple files
  var multiUpload = upload.array('file'); // 'files' is the key name in the form data

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // An array to store uploaded file URLs
    const uploadedFiles = [];

    // Loop through each file and upload to S3
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileContent = fs.readFileSync(file.path);
      const fileExt = path.extname(file.originalname);
      const s3Key = `${Date.now()}-${i}${fileExt}`;

      // S3 upload parameters for each file
      const params = {
        Bucket: process.env.S3_BUCKET_NAME, // Ensure this is set in your .env file
        Key: s3Key,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'public-read', // Makes the file publicly accessible
      };

      try {
        // Upload file to S3
        const command = new PutObjectCommand(params);
        await s3.send(command);

        // Delete the local file after upload
        fs.unlinkSync(file.path);

        // Push the file URL to the uploadedFiles array
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        uploadedFiles.push(fileUrl);
      } catch (uploadError) {
        console.error('S3 Upload Error:', uploadError);
        return res.status(500).json({
          message: 'S3 upload failed for one or more files',
          error: uploadError,
        });
      }
    }

    // Return the uploaded file URLs
    return res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    });
  });
};

export const updateReelpost = async (req, res) => {
  // Set up the multer upload middleware
  var singleUpload = upload.single('file');

  singleUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Reading the file content from the local storage (disk)
    const fileContent = fs.readFileSync(req.file.path);
    const fileExt = path.extname(req.file.originalname);
    const s3Key = `${Date.now()}${fileExt}`;

    // S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype,
      ACL: 'public-read', // this sets the file to be publicly accessible
    };

    try {
      // Upload file to S3
      const command = new PutObjectCommand(params);
      await s3.send(command);

      // Delete the local file after upload
      fs.unlinkSync(req.file.path);

      // Return the file URL from S3
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      const { videoTitle, username, sound, posttype, tagpeople, location, sharegroup, posttypechild, ispost, videosound, textoverlays, emojioverlays } = req.body;
      // Assuming you're using multer and `upload.single("file")` middleware
      const newReel = new Reel({
        videoUrl: fileUrl,
        videoTitle,
        username,
        sound,
        posttype,
        tagpeople,
        location,
        sharegroup, posttypechild, ispost, videosound,
        textoverlays, emojioverlays
      });
      const savedReel = await newReel.save();
      return res.status(201).json({
        message: 'File uploaded successfully',
        url: fileUrl,
        data: savedReel
      });
    } catch (err) {
      console.error('S3 Upload Error:', err);

      // Log specific properties
      if (err.name) console.error('Error Name:', err.name);
      if (err.message) console.error('Error Message:', err.message);
      if (err.stack) console.error('Error Stack:', err.stack);

      return res.status(500).json({
        message: 'S3 upload failed',
        error: {
          name: err.name || 'UnknownError',
          message: err.message || 'No message provided',
          stack: err.stack || 'No stack trace',
        },
      });
    }
  });
};

export const updatePost = async (req, res) => {
  // Set up the multer upload middleware for multiple files
  var multiUpload = upload.array('file'); // 'files' is the key name in the form data

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // An array to store uploaded file URLs
    const uploadedFiles = [];

    // Loop through each file and upload to S3
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileContent = fs.readFileSync(file.path);
      const fileExt = path.extname(file.originalname);
      const s3Key = `${Date.now()}-${i}${fileExt}`;

      // S3 upload parameters for each file
      const params = {
        Bucket: process.env.S3_BUCKET_NAME, // Ensure this is set in your .env file
        Key: s3Key,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'public-read', // Makes the file publicly accessible
      };

      try {
        // Upload file to S3
        const command = new PutObjectCommand(params);
        await s3.send(command);

        // Delete the local file after upload
        fs.unlinkSync(file.path);

        // Push the file URL to the uploadedFiles array
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        uploadedFiles.push(fileUrl);
      } catch (uploadError) {
        console.error('S3 Upload Error:', uploadError);
        return res.status(500).json({
          message: 'S3 upload failed for one or more files',
          error: uploadError,
        });
      }
    }
    const { videoTitle, username, sound, posttype, tagpeople, location, sharegroup, posttypechild, ispost } = req.body;
    const newReel = new Reel({
      videoUrl: uploadedFiles,
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople,
      location,
      sharegroup, posttypechild, ispost
    });
    const savedReel = await newReel.save();
    return res.status(201).json({
      message: 'File uploaded successfully',
      data: savedReel
    });
    //////////////////////////
  });

};





