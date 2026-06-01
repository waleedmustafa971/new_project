import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import mime from 'mime-types';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import User from "../models/users.js"; // import model user
import Reel from "../models/Reels.js";
//import Music from '../models/Music.js';
const SECRET_KEY =
  "yutuytuyddfsdsfd646545646545sdssasa435434tbuytyutbyaf34assxd43443"; // Replace with a secure secret key
import multer from "multer";
import AWS from 'aws-sdk';

//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();

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

export const register = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { name, email, password, mobileno } = req.body;
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
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobileno: mobileno,
    });
    await newUser.save();
    // 3️⃣ Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    return res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token: token,
    });
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

export const welcome = (req, res) => {
  return res.json("You are not authorized");
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }
    // 1️⃣ Check if user exists
    const user = await User.findOne({ email });
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
  //GET http://localhost:8800/api/auth/users?page=1&limit=5
  //GET http://localhost:8800/api/auth/users?page=1&limit=5&search=john
  try {
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || ""; // Get search query

    // Filtering condition: If search query exists, filter by name or email
    const filter = searchQuery
      ? {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
          { email: { $regex: searchQuery, $options: "i" } },
        ],
      }
      : {};
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit);
    // Get total count of filtered users
    const totalUsers = await User.countDocuments(filter);
    return res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
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

export const updateReelpost_off = async (req, res) => {
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

export const updateReelpost = async (req, res) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const mimeType = mime.lookup(filePath);
    let videoUrl = '';

    try {
      const timestamp = Date.now();

      // 🟦 Handle image
      if (mimeType.startsWith('image/')) {
        const optimizedPath = filePath.replace(path.extname(filePath), '.webp');
        await sharp(filePath)
          .resize({ width: 1024, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(optimizedPath);

        fs.unlinkSync(filePath); // delete original image

        const s3Key = `images/${timestamp}.webp`;
        const fileContent = fs.readFileSync(optimizedPath);

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'image/webp',
            ACL: 'public-read',
          })
        );

        fs.unlinkSync(optimizedPath); // clean local
        videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      }

      // 🔴 Handle video
      else if (mimeType.startsWith('video/')) {
        const folderKey = `videos/${timestamp}`;
        const outputDir = path.join('uploads/hls', `${timestamp}`);
        fs.mkdirSync(outputDir, { recursive: true });

        const outputM3U8 = path.join(outputDir, 'index.m3u8');

        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .addOptions([
              '-preset ultrafast',
              '-profile:v baseline',
              '-level 3.0',
              '-start_number 0',
              '-hls_time 10',
              '-hls_list_size 0',
              '-f hls',
            ])
            .output(outputM3U8)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        fs.unlinkSync(filePath); // delete original

        const files = fs.readdirSync(outputDir);

        for (const file of files) {
          const localFilePath = path.join(outputDir, file);
          const fileContent = fs.readFileSync(localFilePath);
          const s3Key = `${folderKey}/${file}`;
          const contentType = mime.lookup(file) || 'application/octet-stream';

          await s3.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: s3Key,
              Body: fileContent,
              ContentType: contentType,
              ACL: 'public-read',
            })
          );

          fs.unlinkSync(localFilePath);
        }

        fs.rmdirSync(outputDir);
        videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderKey}/index.m3u8`;
      }

      else {
        return res.status(400).json({ message: 'Unsupported file type' });
      }

      // 🎯 Save Reel to DB
      const {
        videoTitle,
        username,
        sound,
        posttype,
        tagpeople,
        location,
        sharegroup,
        posttypechild,
        ispost,
        videosound,
        textoverlays,
        emojioverlays,
      } = req.body;

      const newReel = new Reel({
        videoUrl, // ⬅️ Always string
        videoTitle,
        username,
        sound,
        posttype,
        tagpeople,
        location,
        sharegroup,
        posttypechild,
        ispost,
        videosound,
        textoverlays,
        emojioverlays,
      });

      const savedReel = await newReel.save();

      return res.status(201).json({
        message: 'File uploaded successfully',
        url: videoUrl,
        data: savedReel,
      });
    } catch (err) {
      console.error('Processing or Upload Error:', err);
      return res.status(500).json({
        message: 'Processing failed',
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





