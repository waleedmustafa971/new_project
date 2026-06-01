import Reel from "../models/Reels.js";
import User from "../models/users.js";
import multer from "multer";
import path from "path";
import { uploadMultiple } from "../middleware/multerConfig.js"; // Import multer setup

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
    reel.likes = reel.likes.filter((like) => like.username !== username);
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

    const liked = reel.likes.some((like) => like.username === username);

    res.json({ liked });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
};


export const addLike = async (req, res) => {
  try {
    const { username, id } = req.body;
    const reel = await Reel.findById(id);

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    // ✅ Check if user has already liked
    const existingLike = reel.likes.find((like) => like.username === username);
    if (existingLike) {
      return res
        .status(400)
        .json({ error: "User has already liked this reel" });
    }

    // ✅ Add new like (only once per user)
    reel.likes.push({ username });

    await reel.save();

    // ✅ Calculate total likes count
    const totalLikes = reel.likes.length;

    res.json({ message: "Like added!", totalLikes, likes: reel.likes });
  } catch (error) {
    console.error("Server Error:", error);
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
    const existingFav = reel.favorites.find((fav) => fav.username === username);
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

    const user = await User.findOne({ email: username }); // Get user from DB
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
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const loginUserId = "67fe91a8210ef168a54521ca"; //this is login userid

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
    // Add followId to userId's following list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { following: followId },
    });

    // Add userId to followId's followers list
    await User.findByIdAndUpdate(followId, {
      $addToSet: { followers: userId },
    });

    res.json({ message: "Followed successfully!" });
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
