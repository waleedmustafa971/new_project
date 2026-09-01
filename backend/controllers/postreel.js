import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import Reel, { REACTIONS } from "../models/Reels.js";
import { NOT_DELETED } from "../helpers/feed.js";
import { canViewPost } from "../helpers/safety.js";
import mongoose from "mongoose";

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
import { canView, hiddenUserIds, relationship } from "../helpers/privacy.js";
import multer from "multer";
import AWS from 'aws-sdk';
import sharp from 'sharp';

//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();


// AWS S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,  //AKIAU6VTTOMEQBYUYF6T
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


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


export const updatePost_vieo_off = async (req, res) => {
  // Set up the multer upload middleware for multiple files
  var multiUpload = upload.array('file'); // 'files' is the key name in the form data

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
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
    const { videoTitle, username, sound, posttype, tagpeople, location, sharegroup,
      posttypechild, ispost, xbackgroundcolor, xfontstyle, xfontsize, xtextalign } = req.body;
    const newReel = new Reel({
      videoUrl: uploadedFiles,
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople,
      location,
      sharegroup, posttypechild, ispost,
      xbackgroundcolor,
      xfontstyle,
      xfontsize, xtextalign
    });
    const savedReel = await newReel.save();
    return res.status(201).json({
      message: 'File uploaded successfully',
      data: savedReel
    });
    //////////////////////////
  });

};

export const updatePost_aws = async (req, res) => {
  const multiUpload = upload.array('file');
  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    try {
      const uploadedFiles = [];

      // Optimize, convert to .webp, upload to S3
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const timestamp = Date.now();
        const fileName = `optimized_${timestamp}_${i}.webp`;
        const optimizedPath = path.join('uploads', fileName);

        // Optimize image using sharp
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(optimizedPath);

        // Remove original unoptimized file
        fs.unlinkSync(file.path);

        // Upload optimized image to S3
        const fileContent = fs.readFileSync(optimizedPath);
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: fileContent,
          ContentType: 'image/webp',
          ACL: 'public-read',
        };

        const command = new PutObjectCommand(params);
        await s3.send(command);

        // Delete optimized file after upload
        fs.unlinkSync(optimizedPath);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        uploadedFiles.push(fileUrl);
      }

      // Create Reel
      const {
        videoTitle, username, sound, posttype, tagpeople,
        location, sharegroup, posttypechild, ispost,
        xbackgroundcolor, xfontstyle, xfontsize, xtextalign,
      } = req.body;

      const newReel = new Reel({
        videoUrl: uploadedFiles,
        videoTitle,
        username,
        sound,
        posttype,
        tagpeople,
        location,
        sharegroup,
        posttypechild,
        ispost,
        xbackgroundcolor,
        xfontstyle,
        xfontsize,
        xtextalign,
      });

      const savedReel = await newReel.save();

      return res.status(201).json({
        message: 'File uploaded and optimized successfully',
        data: savedReel,
      });
    } catch (uploadError) {
      console.error('Upload Error:', uploadError);
      return res.status(500).json({
        message: 'Error during image optimization or upload',
        error: uploadError.message,
      });
    }
  });
};

export const updatePost = async (req, res) => {
  console.log('...post image .... ', req.body)
  // Use multer to handle multiple files
  const multiUpload = upload.array('file');

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    try {
      const uploadedFiles = [];

      // Make sure local storage folder exists
      const storageFolder = path.join(process.cwd(), 'uploads/postimage');
      if (!fs.existsSync(storageFolder)) {
        fs.mkdirSync(storageFolder, { recursive: true });
      }

      // Loop through uploaded files
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const timestamp = Date.now();
        const fileName = `optimized_${timestamp}_${i}.webp`;
        const optimizedPath = path.join(storageFolder, fileName);

        // Optimize image using sharp
        await sharp(file.path)
          .resize(1024, 768, { fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(optimizedPath);

        // Remove original unoptimized file
        fs.unlinkSync(file.path);

        // Store relative path in DB (or you can use absolute path)
        uploadedFiles.push(`/uploads/postimage/${fileName}`);
      }

      // Get post data from request body
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
        xbackgroundcolor,
        xfontstyle,
        xfontsize,
        xtextalign,
      } = req.body;

      // Create Reel in database
      const newReel = new Reel({
        videoUrl: uploadedFiles, // store local paths
        videoTitle,
        username,
        sound,
        posttype,
        tagpeople,
        location,
        sharegroup,
        posttypechild,
        ispost,
        xbackgroundcolor,
        xfontstyle,
        xfontsize,
        xtextalign,
      });

      const savedReel = await newReel.save();

      return res.status(201).json({
        message: 'File uploaded and optimized locally successfully',
        data: savedReel,
      });
    } catch (uploadError) {
      console.error('Upload Error:', uploadError);
      return res.status(500).json({
        message: 'Error during image optimization or saving',
        error: uploadError.message,
      });
    }
  });
};

export const getRecentstory = async (req, res) => {
  //console.log('...query' + JSON.stringify(req.query))
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const loginUserId = req.query.username;
    const posttype = req.query.posttype;
    const reelid = req.query.reelid;

    let reels = [];

    if (reelid && reelid !== "null" && reelid !== "undefined") {
      // Get the specific reel by _id
      const currentReel = await Reel.findOne({ _id: reelid, posttype }).lean();

      if (!currentReel) {
        return res.status(404).json({ message: "Reel not found" });
      }

      // Get the next reel by xtime (i.e., older one)
      const nextReel = await Reel.findOne({
        posttype,
        xtime: { $lt: currentReel.xtime },
      })
        .sort({ xtime: -1 })
        .lean();

      reels = [currentReel];
      if (nextReel) reels.push(nextReel);
    } else {
      // Default pagination logic
      reels = await Reel.find({ posttype, ...NOT_DELETED })
        .sort({ xtime: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    if (reels.length === 0) {
      return res.status(201).json({ message: "No story found" });
    }

    const currentuser = await User.findOne({ email: loginUserId })
      .select('name email image _id')
      .lean();

    // Process reels
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ email: reel.username }).lean();

        let isFollowing = false;
        if (user?.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === loginUserId
          );
        }

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

        return {
          _id: reel._id,
          videoUrl: reel.videoUrl,
          videoTitle: reel.videoTitle,
          posttype: reel.posttype,
          sound: reel.sound,
          videosound: reel.videosound,
          username: reel.username,
          xtime: reel.xtime,
          commentsdetails: enrichedComments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
              // The feed never sent this, so a verified account looked
              // identical to any other everywhere a post appears.
              verifiedBadge: !!user.verifiedBadge,
              accountType: user.accountType,
            }
            : null,
          currentuser: currentuser,
        };
      })
    );

    const totalReels = await Reel.countDocuments({ posttype });

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


/*
  The reaction summary a Facebook-style action bar needs.

  The feed has always sent `likes` as a single number, which is all a thumb
  needs -- but the reaction set (like / love / haha / wow / sad / angry) has
  existed on the model and behind /apis/engagement since the Engagement build,
  and a card cannot draw the right lit-up face, or the overlapping cluster of
  the top three, from a total alone.

  Added alongside `likes`, never in place of it: every existing caller reads
  that number and none of them know about this field.
*/
export const reactionsOf = (likes = [], viewerId) => {
  const counts = Object.fromEntries(REACTIONS.map((r) => [r, 0]));
  let myReaction = null;
  for (const l of likes) {
    const type = REACTIONS.includes(l?.type) ? l.type : "like";
    counts[type] += 1;
    // `username` is a bare id here; it arrives populated only on the
    // engagement list endpoint.
    if (viewerId && String(l?.username?._id || l?.username) === String(viewerId)) {
      myReaction = type;
    }
  }
  return { total: likes.length, counts, myReaction };
};

/* ---- wall helpers ---- */

const WALL_TYPES = new Set(["posts", "reels", "media", "all"]);

/*
  A post carries media in one of two places: `media[]`, written by the newer
  composer, and `videoUrl`, which older rows use and which is a bare string on
  some of them and an array on others. Anything asking "does this have a photo
  or a video" has to accept all three shapes or half the wall goes missing.
*/
const HAS_MEDIA = {
  $or: [
    { "media.0": { $exists: true } },
    { "videoUrl.0": { $exists: true } },
    { videoUrl: { $type: "string", $ne: "" } },
  ],
};

const wallFilter = (type) => {
  if (type === "reels") return { posttype: "Reel" };
  if (type === "all") return { posttype: { $in: ["Post", "Reel"] } };
  if (type === "media") return { posttype: { $in: ["Post", "Reel"] }, ...HAS_MEDIA };
  return { posttype: "Post" };
};

// likes / shares / favorites are rows carrying a count, not one row per tap.
const sumCounts = (rows) =>
  (rows || []).reduce((sum, row) => sum + (Number(row?.count) || 0), 0);

/*
  Comment authors, one lookup per distinct person.

  `comments[].username` is an ObjectId ref. The timeline resolves it with
  `User.findOne({ email: comment.username })`, which never matches an id, so
  every comment it sends carries `user: null` and renders nameless. Older rows
  really do hold an email there, so both are tried.
*/
const enrichComments = async (comments) => {
  const rows = comments || [];
  if (!rows.length) return [];

  const keys = [...new Set(rows.map((c) => String(c.username)).filter(Boolean))];
  const ids = keys.filter((k) => isId(k));
  const emails = keys.filter((k) => !isId(k));

  const found = await User.find({
    $or: [
      ...(ids.length ? [{ _id: { $in: ids } }] : []),
      ...(emails.length ? [{ email: { $in: emails } }] : []),
    ],
  }).select("name email image").lean();

  const byKey = new Map();
  for (const u of found) {
    byKey.set(String(u._id), u);
    if (u.email) byKey.set(String(u.email), u);
  }

  return rows.map((c) => {
    const u = byKey.get(String(c.username));
    return {
      ...c,
      user: u ? { name: u.name, email: u.email, image: u.image } : null,
    };
  });
};

/*
  Someone's wall: everything they have published, newest first.

  There was no endpoint for this at all. yourContent is hardcoded to
  posttype "Reel", the gallery tab reads uploaded images, and the timeline is
  everyone's posts mixed together — so there was nowhere in the product that
  answered "show me what this person has posted", including for yourself.

  `type` chooses what the wall is showing, and defaults to "posts" so the
  existing grid keeps behaving exactly as it did:

    posts   written posts and shares          (posttype "Post")
    reels   recorded reels                    (posttype "Reel")
    media   anything carrying a photo or video, of either type
    all     one combined stream, the way a Facebook wall reads

  Each item comes back in the same shape the timeline sends — userInfo,
  counted likes, enriched comments — so a wall can render the very same post
  card the feed does instead of a second, thinner version of it. The slim
  fields the grid already reads (media, isShare, audience) are still there.

  Visibility is decided the same way the feed decides it, because a wall is just
  a feed filtered to one author and it must not become a way around privacy: a
  private account's wall is visible to its followers and nobody else, blocked
  people see nothing, and per-post audiences still apply. Viewing your own wall
  skips all of it — you can always see your own posts, including "only me" ones.
*/
export const userWall = async (req, res) => {
  try {
    const authorId = req.query.userid || req.query.userId;
    const viewerId = isId(req.query.viewerId) ? String(req.query.viewerId) : null;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const type = WALL_TYPES.has(String(req.query.type || "").toLowerCase())
      ? String(req.query.type).toLowerCase()
      : "posts";

    if (!isId(authorId)) {
      return res.status(400).json({ message: "A valid userid is required" });
    }

    const author = await User.findById(authorId)
      .select("name email image bio verifiedBadge accountType followers following closeFriends blockedUsers privacy privacySettings followRequests gender nationality")
      .lean();
    if (!author) return res.status(404).json({ message: "User not found" });

    const isSelf = viewerId && String(viewerId) === String(authorId);

    if (!isSelf) {
      const rel = await relationship(viewerId, author);
      if (rel === "blocked") {
        return res.status(403).json({ message: "This profile is not available" });
      }
      if (!(await canView(viewerId, author, "posts", rel))) {
        /*
          A private account is not a missing one. Saying so — with the follower
          counts still visible — is what lets someone decide to send a request,
          which is the whole point of a private profile rather than a dead end.
        */
        return res.status(200).json({
          success: true,
          locked: true,
          reason: "private",
          message: "This account is private",
          author: {
            _id: author._id,
            name: author.name,
            image: author.image,
            verifiedBadge: !!author.verifiedBadge,
            followersCount: (author.followers || []).length,
            followingCount: (author.following || []).length,
          },
          type,
          posts: [],
          counts: { posts: 0, reels: 0, media: 0 },
          total: 0,
          hasMore: false,
        });
      }
    }

    // Posts, shares and reels all live in the same collection, told apart by
    // posttype. wallFilter turns the requested tab into the matching query.
    const base = { username: authorId, ...NOT_DELETED };
    const candidates = await Reel.find({ ...base, ...wallFilter(type) })
      .populate({
        path: "sharepost.originalPost",
        populate: { path: "username", select: "name email image bio verifiedBadge" },
      })
      .sort({ xtime: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 2)   // room to drop what this viewer may not see
      .lean();

    const visible = [];
    for (const post of candidates) {
      if (isSelf) { visible.push(post); continue; }
      const verdict = await canViewPost(viewerId, post, { author });
      if (verdict.allowed) visible.push(post);
    }

    const authorInfo = {
      userid: author._id,
      name: author.name,
      email: author.email,
      image: author.image,
      bio: author.bio,
      gender: author.gender,
      nationality: author.nationality,
      verifiedBadge: !!author.verifiedBadge,
      accountType: author.accountType,
    };

    // The viewer already follows the author, or is the author. Resolved once
    // for the whole wall rather than per post — every item shares one author.
    const followStatus =
      viewerId && (author.followers || []).some((f) => String(f) === String(viewerId))
        ? "follow"
        : "not follow";

    const posts = await Promise.all(
      visible.slice(0, limit).map(async (p) => ({
        _id: p._id,
        videoTitle: p.videoTitle,
        videoUrl: p.videoUrl,
        media: p.media || [],
        posttype: p.posttype,
        posttypechild: p.posttypechild,
        thumbnail: p.thumbnail,
        sound: p.sound,
        username: p.username,
        xbackgroundcolor: p.xbackgroundcolor,
        xfontstyle: p.xfontstyle,
        xfontsize: p.xfontsize,
        xtextalign: p.xtextalign,
        isShare: !!(p.sharepost && p.sharepost.length),
        sharepost: p.sharepost || [],
        /*
          Counts, not the raw arrays. The timeline sends counts and the post
          card renders them straight into the like/comment/share row, so a wall
          handing back arrays drew "[object Object]" where a number belongs.
          Nothing reads the arrays here — the grid only ever wanted totals.
        */
        likes: sumCounts(p.likes),
        reactions: reactionsOf(p.likes, viewerId),
        dislikes: sumCounts(p.dislikes),
        comments: p.comments?.length ?? 0,
        favorites: sumCounts(p.favorites),
        shares: sumCounts(p.shares),
        stars: sumCounts(p.stars),
        commentsdetails: await enrichComments(p.comments),
        liked: !!viewerId && (p.likes || []).some((l) => String(l.username) === String(viewerId)),
        isOwner: !!isSelf,
        audience: p.audience || "everyone",
        xtime: p.xtime,
        followStatus,
        userInfo: authorInfo,
      }))
    );

    const [postCount, reelCount, mediaCount] = await Promise.all([
      Reel.countDocuments({ ...base, ...wallFilter("posts") }),
      Reel.countDocuments({ ...base, ...wallFilter("reels") }),
      Reel.countDocuments({ ...base, ...wallFilter("media") }),
    ]);
    const total =
      type === "reels" ? reelCount
        : type === "media" ? mediaCount
          : type === "all" ? postCount + reelCount
            : postCount;

    return res.status(200).json({
      success: true,
      locked: false,
      author: {
        _id: author._id,
        name: author.name,
        image: author.image,
        bio: author.bio,
        verifiedBadge: !!author.verifiedBadge,
        accountType: author.accountType,
        followersCount: (author.followers || []).length,
        followingCount: (author.following || []).length,
      },
      type,
      page,
      limit,
      total,
      counts: { posts: postCount, reels: reelCount, media: mediaCount },
      hasMore: (page - 1) * limit + posts.length < total,
      posts,
    });
  } catch (error) {
    console.error("userWall:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const yourContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 10;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    const userid = req.query.userid;

    const yoursFilter = { posttype: "Reel", username: userid, ...NOT_DELETED };

    const reels = await Reel.find(yoursFilter)
      .populate({
        path: "sharepost.originalPost",
        populate: {
          path: "username",
          select: "name email image bio",
        },
      })
      .sort({ xtime: -1 }) // descending order by createdAt
      .skip(skip)
      .limit(limit)
      .lean();

    if (reels.length === 0) {
      return res.status(201).json({ message: "No posts found" });
    }
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ _id: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === userid
          );
        }
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
          posttype: reel.posttype,
          sound: reel.sound,
          username: reel.username,
          xtime: reel.xtime,
          xbackgroundcolor: reel.xbackgroundcolor,
          xfontstyle: reel.xfontstyle,
          xfontsize: reel.xfontsize,
          xtextalign: reel.xtextalign,
          sharepost: reel.sharepost, // i want here is object  "originalPost": "697572f5c17d7d75ed7998b6", this post full object i want to get
          commentsdetails: enrichedComments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          followStatus: isFollowing ? "follow" : "not follow",
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
              // The feed never sent this, so a verified account looked
              // identical to any other everywhere a post appears.
              verifiedBadge: !!user.verifiedBadge,
              accountType: user.accountType,
            }
            : null,
        };
      })
    );

    // Counted over the same filter the page was read with; this was a bare
    // count of every document in the collection.
    const totalReels = await Reel.countDocuments(yoursFilter);

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

}


export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 10;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    const loginUserId = req.query.username;
    const userid = req.query.userid;

    /*
      The feed used to be `Reel.find({ posttype: "Post" })` — every post from
      every account, newest first. No privacy, no blocking, no relationship of
      any kind. A private account's posts were served to strangers, a blocked
      person's posts kept arriving, and hiding a post did nothing to the feed it
      was hidden from.

      Three things happen here instead:

        1. Authors the viewer can't see are removed in the query — people either
           side of a block, and anyone the viewer restricted.
        2. What survives is checked twice per post: canViewPost for the post's
           own audience, moderation state and age gate, and canView(..., "posts")
           for the author's account-level privacy, which is what makes a private
           account private. The post-level check alone lets a private account's
           "everyone" post through, which is exactly the leak that was reported.
        3. What remains is ordered by relationship before recency, so the people
           the viewer actually follows lead the feed.

      It over-fetches and then filters, because filtering after a .limit() would
      hand back a short page and look like the end of the feed.
    */
    const viewerId = isId(userid) ? String(userid) : null;

    const excludedAuthors = viewerId ? await hiddenUserIds(viewerId) : [];
    const viewer = viewerId
      ? await User.findById(viewerId)
          .select("following hiddenPosts dateofbirth blockedUsers")
          .lean()
      : null;
    const hiddenPostIds = (viewer?.hiddenPosts || []).map(String);
    const followingIds = new Set((viewer?.following || []).map(String));

    const query = { posttype: "Post", ...NOT_DELETED };
    if (excludedAuthors.length) query.username = { $nin: excludedAuthors };
    if (hiddenPostIds.length) query._id = { $nin: hiddenPostIds };

    const candidates = await Reel.find(query)
      .populate({
        path: "sharepost.originalPost",
        populate: {
          path: "username",
          select: "name email image bio",
        },
      })
      .sort({ xtime: -1 })
      .skip(skip)
      .limit(Math.max(Number(limit) || 10, 10) * 4)
      .lean();

    // One read per distinct author rather than per post.
    const authorIds = [...new Set(candidates.map((r) => String(r.username)).filter(Boolean))];
    const authorDocs = await User.find({ _id: { $in: authorIds } })
      .select("followers closeFriends blockedUsers privacy privacySettings followRequests")
      .lean();
    const authors = new Map(authorDocs.map((a) => [String(a._id), a]));

    const visible = [];
    for (const reel of candidates) {
      const author = authors.get(String(reel.username));
      if (!author) continue;

      const postCheck = await canViewPost(viewerId, reel, { author, viewer });
      if (!postCheck.allowed) continue;

      const rel = await relationship(viewerId, author);
      if (!(await canView(viewerId, author, "posts", rel))) continue;

      visible.push({ reel, rel });
    }

    /*
      Ranking. Deliberately simple and explainable rather than a black box:
      someone you follow outranks a stranger, and within each group the newest
      post wins. Engagement is the tie-break, so a post that people actually
      responded to surfaces above one that nobody touched.
    */
    visible.sort((a, b) => {
      const score = (x) => {
        const followed = followingIds.has(String(x.reel.username)) ? 2 : 0;
        const known = x.rel === "follower" ? 1 : 0;
        return followed + known;
      };
      const byRank = score(b) - score(a);
      if (byRank) return byRank;
      const byTime = new Date(b.reel.xtime) - new Date(a.reel.xtime);
      if (byTime) return byTime;
      const engagement = (x) =>
        (x.reel.likes?.length || 0) + (x.reel.comments?.length || 0) * 2;
      return engagement(b) - engagement(a);
    });

    const reels = visible.slice(0, Number(limit) || 10).map((v) => v.reel);

    if (reels.length === 0) {
      return res.status(201).json({ message: "No posts found" });
    }
    const processedReels = await Promise.all(
      reels.map(async (reel) => {
        const user = await User.findOne({ _id: reel.username }).lean();

        let isFollowing = false;
        if (user && user.followers) {
          isFollowing = user.followers.some(
            (followerId) => followerId.toString() === userid
          );
        }
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
          posttype: reel.posttype,
          sound: reel.sound,
          username: reel.username,
          xtime: reel.xtime,
          xbackgroundcolor: reel.xbackgroundcolor,
          xfontstyle: reel.xfontstyle,
          xfontsize: reel.xfontsize,
          xtextalign: reel.xtextalign,
          sharepost: reel.sharepost, // i want here is object  "originalPost": "697572f5c17d7d75ed7998b6", this post full object i want to get
          commentsdetails: enrichedComments,
          likes: reel.likes.reduce((sum, item) => sum + item.count, 0),
          dislikes: reel.dislikes.reduce((sum, item) => sum + item.count, 0),
          comments: reel.comments?.length ?? 0,
          favorites: reel.favorites.reduce((sum, item) => sum + item.count, 0),
          shares: reel.shares.reduce((sum, item) => sum + item.count, 0),
          stars: reel.stars.reduce((sum, item) => sum + item.count, 0),
          /*
            The six-way reaction summary the feed card draws: which face is lit
            for this viewer, and the counts behind the overlapping cluster.
            Additive -- `likes` above is untouched and is still the plain
            number every existing caller reads.
          */
          reactions: reactionsOf(reel.likes, viewerId),
          followStatus: isFollowing ? "follow" : "not follow",
          userInfo: user
            ? {
              userid: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
              bio: user.bio,
              gender: user.gender,
              nationality: user.nationality,
              // The feed never sent this, so a verified account looked
              // identical to any other everywhere a post appears.
              verifiedBadge: !!user.verifiedBadge,
              accountType: user.accountType,
            }
            : null,
        };
      })
    );

    const totalReels = await Reel.countDocuments({
      posttype: "Post",
      ...NOT_DELETED,
    });

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

export const updateShortpost = async (req, res) => {
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
        sharegroup, posttypechild, ispost,
        videosound, textoverlays, emojioverlays
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








