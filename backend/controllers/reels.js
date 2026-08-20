import mongoose from "mongoose";
import Reel from "../models/Reels.js";
import User from "../models/users.js";
import Video from '../models/VideoFile.js'; 
import Savereel from '../models/savereel.js';
import { relationship, needsFollowApproval } from "../helpers/privacy.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { uploadMultiple } from "../middleware/multerConfig.js"; // Import multer setup
import ffmpeg from '../helpers/ffmpeg.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import Mux from '@mux/mux-node';
import { notify } from "../services/notificationService.js";
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});
//const mux = new Mux();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reels"); // make sure folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add Reel with File Upload
export const addRealls = async (req, res) => {
  uploadMultiple(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const { videoTitle, username } = req.body;

      // console.log("Files Received:", req.files);
      // console.log("Form Data:", req.body);

      // Save each file as a new Reel entry
      const uploadedFiles = req.files.map((file) => ({
        videoUrl: file.filename,
        videoTitle,
        username,
      }));

      const savedReels = await Reel.insertMany(uploadedFiles);
      res.status(201).json(savedReels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

export const removeLike = async (req, res) => {
  try {
    const { username, id } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    // Remove like from the array
    reel.likes = reel.likes.filter((like) => String(like.username) !== String(username));
    await reel.save();

    const totalLikes = reel.likes.length;

    res.json({ message: "Like removed", totalLikes, likes: reel.likes });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};


export const isLiked = async (req, res) => {
  try {
    const { username, id } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    const liked = reel.likes.some((like) => String(like.username) === String(username));

    res.json({ liked });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addSavepost = async (req, res) => {
  const { username, reelid } = req.body; // Destructure correctly
  try {
    // 1️⃣ Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(username) || !mongoose.Types.ObjectId.isValid(reelid)) {
      return res.status(201).json({ error: "Invalid user or reel ID" });
    }
    // 2️⃣ Check if already saved (to avoid duplicates in the Save collection)
    const alreadySaved = await Savereel.findOne({ 
      userid: username, 
      reels: reelid 
    });

    if (alreadySaved) {
      return res.status(201).json({ message: "Post already saved" });
    }

    // 3️⃣ Create a new Save entry
    const newSave = new Savereel({
      userid: username,
      reels: reelid
    });

    await newSave.save();

    res.status(201).json({
      success: true,
      message: "Post saved successfully",
      data: newSave
    });

  } catch (error) {
    console.error("Save post error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSavetimeline = async(req, res) => {
   try {
    const { userId } = req.params;

    const savedData = await Savereel
      .find({ userid: userId })
      .populate({
        path: "reels",
        populate: {
          path: "users",
          select: "firstname lastname image"
        }
      })
      .sort({ xtime: -1 });

    res.status(200).json(savedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching saved reels" });
  }
}

export const addLike = async (req, res) => {
  const { username, id } = req.body;
  try {
    // 1️⃣ Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(username)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // 2️⃣ Check user exists
    const user = await User.findById(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3️⃣ Get reel
    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    // 4️⃣ SAFE duplicate-like check
    const alreadyLiked = reel.likes.some(
      (like) =>
        like.username &&
        like.username.toString() === username
    );

    if (alreadyLiked) {
      console.log('Already liked')
      return res.status(400).json({ error: "Already liked" });
    }

    // 5️⃣ Push valid ObjectId
    reel.likes.push({ username });
    await reel.save();

    res.json({
      message: "Like added",
      totalLikes: reel.likes.length,
    });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ error: error.message });
  }
};


export const addFavourite = async (req, res) => {
  try {
    const { username, id } = req.body;
    const reel = await Reel.findById(id);

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    // ✅ Check if user has already liked
    const existingFav = reel.favorites.find((fav) => String(fav.username) === String(username));
    if (existingFav) {
      return res
        .status(400)
        .json({ error: "User has already Favorites this reel" });
    }

    // ✅ Add new like (only once per user)
    reel.favorites.push({ username });

    await reel.save();

    // ✅ Calculate total likes count
    const totalFavourites = reel.favorites.length;

    res.json({
      message: "Favorites added!",
      totalFavourites,
      favorites: reel.favorites,
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addReplyCommentsLikes = async (req, res) => {
  const { reelId, commentId, username } = req.body;
  //get User info from User Modal
  const user = await User.findOne({ email: username }).select("_id name email image"); // ✅
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  //const useri = JSON.stringify(user);
  try {
    const result = await Reel.updateOne(
      { _id: reelId, "comments._id": commentId },
      {
        $push: {
          "comments.$.likes": { username, userinfo: user }
        }
      }
    );

    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export const addReplyComments = async (req, res) => {
  const { reelId, commentId, username, message, userinfo } = req.body;
  //get User info from User Modal
  const user = await User.findOne({ email: username }).select("_id name email image"); // ✅
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  //const useri = JSON.stringify(user);
  try {
    const result = await Reel.updateOne(
      { _id: reelId, "comments._id": commentId },
      {
        $push: {
          "comments.$.reply": { username, message, userinfo: user }
        }
      }
    );

    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
export const addComments = async (req, res) => {
  try {
    const { username, id, message } = req.body;
    console.log('body ', req.body)
    const reel = await Reel.findById(id);

    if (!reel) {
      return res.status(201).json({ error: "Reel not found" });
    }

    // ✅ Check if user has already liked
    /*     const existingLike = reel.comments.find(like => like.username === username);
    if (existingLike) {
      return res.status(400).json({ error: "User has already liked this reel" });
    } */

    // ✅ Add new like (only once per user)
    reel.comments.push({ username, message });

    await reel.save();

    // ✅ Calculate total likes count
    const totalComments = reel.comments.length;
    // want to print here reel

    const user = await User.findOne({ _id: username }); // Get user from DB
    const enrichedComments = reel.comments.map((comment) => ({
      ...comment.toObject(), // make sure it's a plain object
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
    }));
    res.json({
      message: "Comments added!",
      totalComments: reel.comments.length,
      comments: enrichedComments,
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getCommentsSingleReels = async (req, res) => {
  const reelId = req.query.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const video = await Reel.findById(reelId).select("comments");
    if (!video || !video.comments || video.comments.length === 0) {
      return res.status(404).json({ error: "No comments found" });
    }
    // Sort comments by createdAt descending
    const sortedComments = video.comments.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    // Paginate comments
    const paginatedComments = sortedComments.slice(skip, skip + limit);
    // Get all emails from the comments
    const emails = paginatedComments.map((comment) => comment.username);
    // Find user info for each comment
    const users = await User.find({ email: { $in: emails } }).select(
      "name image email"
    );

    // Map email to user for quick lookup
    const userMap = {};
    users.forEach((user) => {
      userMap[user.email] = {
        name: user.name,
        image: user.image,
      };
    });

    // Attach user info to each comment
    const commentsWithUser = paginatedComments.map((comment) => ({
      ...comment.toObject(),
      user: userMap[comment.username] || null,
    }));

    res.json({
      page,
      limit,
      total: video.comments.length,
      comments: commentsWithUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const myFollowers = async (req, res) => {
  try {
    const userId = req.query.userId; //login user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Fetch the user and get their followers' IDs
    const user = await User.findById(userId).select("followers").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let isFollowing = false;
    if (user && user.followers) {
      isFollowing = user.followers.some(
        (followerId) => followerId.toString() === userId
      );
    }

    // Build follower query
    const followersQuery = {
      _id: { $in: user.followers },
      name: { $regex: search, $options: "i" }, // Case-insensitive search
    };

    const totalFollowers = await User.countDocuments(followersQuery);

    /*   const followers = await User.find(followersQuery)
        .select("_id name image, followStatus: isFollowing ? "follow" : "not follow",")   
        .skip(skip)
        .limit(limit)
        .lean(); */

    const followersRaw = await User.find(followersQuery)
      .select("_id name image")
      .skip(skip)
      .limit(limit)
      .lean();

    // Add followStatus manually (although this is redundant in this context)
    const followers = followersRaw.map((follower) => ({
      ...follower,
      followStatus: isFollowing ? "follow" : "not follow", // Since they are all followers, status is "follow"
    }));

    res.json({
      page,
      totalPages: Math.ceil(totalFollowers / limit),
      totalFollowers,
      followers,
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const myFollowering = async (req, res) => {
  try {
    const userId = req.query.userId; //login user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Fetch the user and get their followers' IDs
    const user = await User.findById(userId).select("following").lean();

    if (!user) {
      /*   res.json({
        page,
        totalPages: Math.ceil(totalFollowers / limit),
        totalFollowers,
        followers,
      }); */
      return res.status(404).json({ message: "User not found" });
    }

    let isFollowing = false;
    if (user && user.following) {
      isFollowing = user.following.some(
        (followerId) => followerId.toString() === userId
      );
    }

    // Build follower query
    const followersQuery = {
      _id: { $in: user.following },
      name: { $regex: search, $options: "i" }, // Case-insensitive search
    };

    const totalFollowers = await User.countDocuments(followersQuery);

    /*   const followers = await User.find(followersQuery)
        .select("_id name image, followStatus: isFollowing ? "follow" : "not follow",")   
        .skip(skip)
        .limit(limit)
        .lean(); */

    const followersRaw = await User.find(followersQuery)
      .select("_id name image email")
      .skip(skip)
      .limit(limit)
      .lean();

    // Add followStatus manually (although this is redundant in this context)
    const followers = followersRaw.map((follower) => ({
      ...follower,
      followStatus: isFollowing ? "follow" : "not follow", // Since they are all followers, status is "follow"
    }));

    res.json({
      page,
      totalPages: Math.ceil(totalFollowers / limit),
      totalFollowers,
      followers,
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* getUsersReels */

export const getUsersReels = async (req, res) => {
  // console.log('..log...' + JSON.stringify(req.query))
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;
    const loginUserId = req.query.email; //this is login userid

    const reels = await Reel.find({ username: loginUserId })
      .sort({ xtime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("..log..." + JSON.stringify(reels));

    if (reels.length === 0) {
      return res.status(201).json({ message: "No reels found" });
    }
    // console.log('...reels log....' + JSON.stringify(reels))
    // Fetch user info for each reel
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ email: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === loginUserId
          );
        }

        return {
          _id: reel._id,
          videoUrl: reel.videoUrl,
          videoTitle: reel.videoTitle,
          username: reel.username,
          xtime: reel.xtime,
          commentsdetails: reel.comments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          // Add user info (null-safe access)
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
            }
            : null,
        };
      })
    );

    const totalReels = await Reel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
      reels: processedReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getReelFeed = async (req, res) => {
  console.log('userid..........getReel...', req.query.userid)
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
   // const loginUserId = "67fe91a8210ef168a54521ca"; //this is login userid
    const loginUserId = req.query.userid; //this is login userid
    

    const reels = await Reel.find({
      posttype: "Reel",
    })
      .sort({ xtime: -1 }) // descending order by createdAt
      .skip(skip)
      .limit(limit)
      .lean();

    if (reels.length === 0) {
      return res.status(201).json({ message: "No reels found" });
    }
    // console.log('...reels log....' + JSON.stringify(reels))
    // Fetch user info for each reel
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ _id: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === loginUserId
          );
        }

        return {
          _id: reel._id,
          videoUrl: reel.videoUrl,
          videoTitle: reel.videoTitle,
          posttype: reel.posttype,
          sound: reel.sound,
          username: reel.username,
          xtime: reel.xtime,
          commentsdetails: reel.comments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          // Add user info (null-safe access)
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
            }
            : null,
        };
      })
    );

    const totalReels = await Reel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
      reels: processedReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getSearchReels = async (req, res) => {
  console.log('userid..........getReel...', req.query.userid)
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
   // const loginUserId = "67fe91a8210ef168a54521ca"; //this is login userid
    const loginUserId = req.query.userid; //this is login userid
    const title = req.query.search; //this is login userid
    

    const reels = await Reel.find({
      posttype: "Reel",
       videoTitle: { $regex: title, $options: "i" }
    })
      .sort({ xtime: -1 }) // descending order by createdAt
      .skip(skip)
      .limit(limit)
      .lean();

    if (reels.length === 0) {
      return res.status(201).json({ message: "No reels found" });
    }
    // console.log('...reels log....' + JSON.stringify(reels))
    // Fetch user info for each reel
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ _id: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === loginUserId
          );
        }

        return {
          _id: reel._id,
          videoUrl: reel.videoUrl,
          videoTitle: reel.videoTitle,
          posttype: reel.posttype,
          sound: reel.sound,
          username: reel.username,
          xtime: reel.xtime,
          commentsdetails: reel.comments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          // Add user info (null-safe access)
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
            }
            : null,
        };
      })
    );

    const totalReels = await Reel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
      reels: processedReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;
    const loginUserId = req.query.username; //this is login userid

    const reels = await Reel.find({
      posttype: "Reel",
    })
      .sort({ xtime: -1 }) // descending order by createdAt
      .skip(skip)
      .limit(limit)
      .lean();

    if (reels.length === 0) {
      return res.status(201).json({ message: "No reels found" });
    }
    // console.log('...reels log....' + JSON.stringify(reels))
    // Fetch user info for each reel
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ email: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === loginUserId
          );
        }
        //add this is for comments

        // Add enriched comments with user info
        const enrichedComments = await Promise.all(
          (reel.comments || []).map(async (comment) => {
            const commentUser = await User.findOne({
              email: comment.username,
            }).lean();
            return {
              ...comment,
              user: commentUser
                ? {
                  name: commentUser.name,
                  email: commentUser.email,
                  image: commentUser.image,
                }
                : null,
            };
          })
        );
        ///end comments data

        return {
          _id: reel._id,
          videoUrl: reel.videoUrl,
          videoTitle: reel.videoTitle,
          videosound: reel.videosound,
          textoverlays: reel.textoverlays,
          emojioverlays: reel.emojioverlays,
          posttype: reel.posttype,
          sound: reel.sound,
          username: reel.username,
          xtime: reel.xtime,
          //  commentsdetails: reel.comments, //enrichedComments
          commentsdetails: enrichedComments, //enrichedComments
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          // Add user info (null-safe access)
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
            }
            : null,
        };
      })
    );

    const totalReels = await Reel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
      reels: processedReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getReels_off = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;
    const reels = await Reel.find().skip(skip).limit(limit).lean();

    if (reels.length === 0) {
      return res.status(201).json({ message: "No reels found" });
    }
    const processedReels = reels.map((reel) => ({
      _id: reel._id,
      videoUrl: reel.videoUrl,
      videoTitle: reel.videoTitle,
      username: reel.username,
      xtime: reel.xtime,
      commentsdetails: reel.comments,
      likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
      dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
      //   comments: reel.comments.reduce((sum, item) => sum + item.count, 0),
      comments: reel.comments?.length ?? 0,
      favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
      shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
      stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
    }));
    const totalReels = await Reel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
      reels: processedReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const Addfollow = async (req, res) => {
  const { userId, followId } = req.body;

  if (!userId || !followId) {
    return res.status(400).json({ message: "User ID and Follow ID required." });
  }

  try {
    // Respect privacy + blocking: a private account gets a pending request
    // instead of an instant follow. Same rules as /apis/privacy/follow.
    const target = await User.findById(followId)
      .select("privacy privacySettings followers followRequests blockedUsers")
      .lean();

    if (!target) {
      return res.status(404).json({ message: "User not found." });
    }

    const rel = await relationship(userId, target);
    if (rel === "blocked") {
      return res.status(403).json({ message: "This profile is not available." });
    }
    if (rel === "follower") {
      return res.json({ message: "Already following!", status: "following" });
    }
    if (rel === "requested") {
      return res.json({ message: "Request already pending.", status: "requested" });
    }

    if (needsFollowApproval(target)) {
      await User.findByIdAndUpdate(followId, { $addToSet: { followRequests: userId } });
      await User.findByIdAndUpdate(userId, { $addToSet: { sentFollowRequests: followId } });
      return res.json({ message: "Follow request sent!", status: "requested" });
    }

    // Add followId to userId's following list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { following: followId },
    });

    // Add userId to followId's followers list
    await User.findByIdAndUpdate(followId, {
      $addToSet: { followers: userId },
    });

    await notify({ recipient: followId, actor: userId, type: "follow" });

    res.json({ message: "Followed successfully!", status: "following" });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const Unfollow = async (req, res) => {
  const { userId, followId } = req.body;

  if (!userId || !followId) {
    return res.status(400).json({ message: "User ID and Follow ID required." });
  }

  try {
    await User.findByIdAndUpdate(userId, { $pull: { following: followId } });
    await User.findByIdAndUpdate(followId, { $pull: { followers: userId } });

    res.json({ message: "Unfollowed successfully!" });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const userFollowlist = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId).populate(
      "followers following",
      "name email"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ followers: user.followers, following: user.following });
  } catch (error) {
    console.error("Error fetching follow list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateReelpost = async (req, res) => {
  console.log('....req body...', JSON.stringify(req.body))

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
    emojioverlays, isimagefile
  } = req.body;


  if (isimagefile === "Image") {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      // Ensure directory exists
      const uploadDir = "uploads/reels";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      // Generate filename
      const filename = `reel-${Date.now()}.jpeg`;
      const filepath = path.join(uploadDir, filename);
      // 🔥 Sharp image processing
      await sharp(req.file.buffer)
        .resize(1080, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);
      const imageUrl = `/uploads/reels/${filename}`;

      /*
        A story is a post that stops existing after a day.

        This route never set `expiresAt`, so stories written through it relied
        entirely on storyController's age-based fallback. That fallback works,
        but it is a compatibility shim for rows written before the field
        existed — new ones should carry their own expiry so the story feed can
        filter on it in the query rather than after loading everything.
      */
      const STORY_TTL_MS = 24 * 60 * 60 * 1000;
      const isStory = String(posttype || "").toLowerCase() === "story";
      const expiresAt = isStory ? new Date(Date.now() + STORY_TTL_MS) : undefined;

      const newReel = new Reel({
        ...(expiresAt ? { expiresAt } : {}),
        videoUrl: imageUrl, videoTitle,username,sound,posttype,location,posttypechild,ispost,
        videosound,tagpeople: JSON.parse(tagpeople || "[]"),
        sharegroup: JSON.parse(sharegroup || "[]"),textoverlays: JSON.parse(textoverlays || "[]"),emojioverlays: JSON.parse(emojioverlays || "[]"),
      });

      const savedReel = await newReel.save();

      return res.status(201).json({
        message: "Image uploaded & optimized successfully",
        url: imageUrl,
        data: savedReel,
      });
    } catch (error) {
      console.error("Sharp Upload Error:", error);
      return res.status(500).json({
        message: "Image upload failed",
        error: error.message,
      });
    }
    //end Image
  }
  else
  {
    //video file upload

    //end video file
  }
};

// backend/controllers/video.js
export async function generateUploadUrl(req, res) {
  try {
    const upload = await mux.video.uploads.create({
      // In production, replace '*' with your actual app package name or domain
      cors_origin: '*', 
      new_asset_settings: {
        playback_policy: ['public'], // Note: 'playback_policy' (singular) in some SDK versions
        video_quality: "basic"
      },
    });

    // B. Create document in MongoDB
    // Note: Assuming your Model is imported as 'Video'
    const video = await Video.create({
      userId: '99999',
      prompt: prompt,
      uploadId: upload.id,
      status: 'processing',
      createdAt: new Date(),
    });
    // We return 'uploadUrl' to match your frontend destructuring
    res.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      video
    });
    console.log({
      uploadUrl: upload.url,
      uploadId: upload.id,
    })
   // saveData(upload.id)
  } catch (error) {
    console.error('Mux Error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}


//

/* 

{
  uploadUrl: 'https://direct-uploads.oci-us-ashburn-1-vop1.production.mux.com/upload/c007zLFWsLfRjAiG8iP18QlATWv009U1Ti7eoh02orzBNE?token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5MTg4MjMwOTIyNzA1NjMwMTMiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJkdSIsImV4cCI6MTc2OTg0OTA2OSwic3ViIjoiYzAwN3pMRldzTGZSakFpRzhpUDE4UWxBVFd2MDA5VTFUaTdlb2gwMm9yekJORSJ9.YC7e98f-f7eyIDBzBKYsmZQjmLyFhwJTrZ5g-LkN52xG8DDFP7aCu8fm5RqmPcuTzYv_TRIGqvDG8vRJKLcAc-8I4EM0ff5k3sE4BDrS32c2OzTyLM4TEUVY2fK5GV6VTE_FT4HeZfHwWg_84GY_bwPkNFJajYQ3Ey6JAHWNFg7cNWoe-rLEDMH8Chjo19Yb6UADpmzgcwurb-6T4qSYhX1jd6LSV5ncOROqWuloO9VHFXAT3VNaFHpMk6gLDjWtsdj_11AEm_0Bo95hnip7mYGGcM0a-r7IRG7i3UH2Xk4zQGGnnPx-RanHpxiL-sbl1r-ddD4UFqqDwEIKrFB2uA',
  uploadId: 'c007zLFWsLfRjAiG8iP18QlATWv009U1Ti7eoh02orzBNE'
}
*/


export async function handleMuxWebhook(req, res) {
  const webhookSecret = process.env.MUX_WEBHOOK;
  try {
    // 1. Verify Signature (Always use raw body for verification)
    mux.webhooks.verifySignature(JSON.stringify(req.body), req.headers, webhookSecret);
  } catch (error) {
    console.error('Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  const { type, data } = req.body;

  // STEP A: Link Upload ID to Asset ID
  // This happens as soon as the file starts processing
  if (type === 'video.upload.asset_created') {
    await Video.findOneAndUpdate(
      { uploadId: data.id }, // Look for the uploadId you saved earlier
      { 
        muxAssetId: data.asset_id, 
        status: 'processing' 
      }
    );
    console.log(`Linked Asset ${data.asset_id} to Upload ${data.id}`);
  }

  // STEP B: Update status to Ready
  // This happens when the video is actually playable
  if (type === 'video.asset.ready') {
    await Video.findOneAndUpdate(
      { muxAssetId: data.id }, 
      { 
        status: 'ready',
        playbackId: data.playback_ids[0].id,
        duration: data.duration,
      }
    );
    console.log(`Video Asset ${data.id} is now READY`);
  }

  // STEP C: Handle Errors
  if (type === 'video.asset.errored') {
    await Video.findOneAndUpdate(
      { muxAssetId: data.id },
      { status: 'failed', error: 'Mux processing failed' }
    );
  }

  res.json({ received: true });
}

export const sharePostdata___ = async (req, res) => {
   const { postId, userId, text, videoTitle } = req.body;

  if (!postId || !userId) {
    return res.status(400).json({
      success: false,
      message: "postId and userId are required",
    });
  }

  try {
    const post = await Reel.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    /* 1️⃣ Save shared post with text */
    post.sharepost.push({
      user: userId,
      text: text || "",
      originalPost: postId,
    });

    /* 2️⃣ Update share count (analytics) */
    const existingShare = post.shares.find(
      (s) => s.user.toString() === userId.toString()
    );

    if (existingShare) {
      existingShare.count += 1;
    } else {
      post.shares.push({
        user: userId,
        count: 1,
      });
    }

    await post.save();

    return res.json({
      success: true,
      message: "Post shared successfully",
      data: post.sharepost[post.sharepost.length - 1],
    });
  } catch (error) {
    console.error("Share Post Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export const sharePostdata = async (req, res) => {
 try {
    const {
      userId,
      videoUrl,
      videoTitle,
      posttype,
      shareText,
      originalPostId,username
    } = req.body;

    if (!userId || !posttype) {
      return res.status(400).json({
        success: false,
        message: "userId and posttype are required",
      });
    }

    const newPostData = {
      username: username,
      posttype,
      videoTitle: videoTitle || "",
      videoUrl: videoUrl
    };

    /* 🔁 SHARED POST */
  //  if (posttype === "share") {
      if (!originalPostId) {
        return res.status(400).json({
          success: false,
          message: "originalPostId is required for share post",
        });
      }

      newPostData.sharepost = [
        {
          user: userId,
          text: shareText || "",
          originalPost: originalPostId,
        },
      ];
   // }

    const newPost = new Reel(newPostData);
    await newPost.save();

    return res.json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    console.error("Add post error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/* import fs from "fs";
import path from "path";
import Reel from "../models/Reel.js";
 */

export const updateNewReelsimageaudio = async (req, res) => {

  try {
    const {
      videoUrl,
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople = [],
      location,
      sharegroup = [],
      posttypechild,
      ispost,
      videosound,
      textoverlays = [],
      emojioverlays = [],
      isimagefile
    } = req.body;
    console.log('videoUrl.........', videoUrl)
    if (!videoUrl || !videoTitle || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newReel = await Reel.create({
      videoUrl, // temporary MP4 URL
      videoTitle,
      username,
      sound,
      posttype,
      location,
      posttypechild,
      ispost,
      videosound,
      isimagefile,
      tagpeople,
      sharegroup,
      textoverlays,
      emojioverlays,
    });
    console.log({
      message: "Reel uploaded, processing video",
      data: newReel,
    })
    // 🔥 Run in background (DO NOT await)
    convertHLSfilesigment({
     localFilePath: newReel.videoUrl,
      reelId: newReel._id // its going 
    }).catch(err => console.error('Background HLS error:', err));

    return res.status(201).json({
      message: "Reel uploaded, processing video",
      data: newReel,
    });

  } catch (error) {
    console.error("Upload reel error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const convertHLSfilesigment = async ({ localFilePath, reelId }) => {
  console.log('...file location', localFilePath) //localFilePath why its comming undefined
  try {
    const timestamp = Date.now();
    const hlsFolderName = `hls-${timestamp}`;
    const hlsBaseDir = path.join(__dirname, '../uploads/hls');
    fs.mkdirSync(hlsBaseDir, { recursive: true });

    const hlsOutputDir = path.join(hlsBaseDir, hlsFolderName);
    fs.mkdirSync(hlsOutputDir, { recursive: true });

    // Input is the local uploaded file
    const localInputPath = localFilePath;

    if (!fs.existsSync(localFilePath)) {
  throw new Error("Input file not found: " + localFilePath);
}

    // Step 2: Convert to HLS
    const resolutions = [
      { name: "1080p", width: 1920, height: 1080, bitrate: 5000 },
      { name: "720p", width: 1280, height: 720, bitrate: 2800 },
      { name: "480p", width: 854, height: 480, bitrate: 1400 },
    ];

    const ffmpegCommand = ffmpeg(localInputPath);

    resolutions.forEach(({ name, width, height, bitrate }) => {
      ffmpegCommand
        .output(path.join(hlsOutputDir, `${name}.m3u8`))
        .addOption([
          `-vf scale=${width}:${height}`,
          `-b:v ${bitrate}k`,
          "-hls_time 10",
          "-hls_list_size 0",
          "-hls_flags independent_segments",
          `-hls_segment_filename ${path.join(hlsOutputDir, `${name}_%03d.ts`)}`,
        ]);
    });

    await new Promise((resolve, reject) => {
      ffmpegCommand.on("end", resolve).on("error", reject).run();
    });

    // Master playlist
    fs.writeFileSync(
      path.join(hlsOutputDir, "master.m3u8"),
`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8`
    );

    // Update Reel with HLS URL
    const masterUrl = `/uploads/hls/${hlsFolderName}/master.m3u8`;
    await Reel.findByIdAndUpdate(
      reelId,
      { videoUrl: masterUrl, videosound: true },
      { new: true }
    );

 //   console.log("HLS conversion complete:", masterUrl);
  } catch (err) {
    console.error("HLS Conversion Error:", err);
    await Reel.findByIdAndUpdate(reelId, { processingError: true });
  }
};

