import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import multer from "multer";
import dotenv from "dotenv";
// Express controller example:
import { GroupChat } from '../models/Groupchat.js';
import { MessageModel,ConversationModel } from "../models/ConversationModel.js";
import User from "../models/users.js";
import crypto from "crypto"
dotenv.config();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName =
      Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });



export const voiceUpload = async (req, res) => {
  // Use the multer middleware defined earlier
  const singleUpload = upload.single('file');
  singleUpload(req, res, async function (err) {
    // 1. Handle Multer Errors (e.g., file too large)
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    // 2. Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`;
      return res.json({
        message: 'File uploaded successfully to local storage',
        url: fileUrl,
        filename: req.file.filename,
        path: req.file.path // The relative path on the server
      });

    } catch (error) {
      console.error('Local Upload Error:', error);
      return res.status(500).json({
        message: 'Internal server error during upload',
        error: error.message,
      });
    }
  });
};

export const destopimageUpload_singleimage = async (req, res) => {
  const singleUpload = upload.single('file');
  singleUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const fileUrl = `/uploads/chat/${req.file.filename}`;
      return res.json({
        message: 'File uploaded successfully to local storage',
        url: fileUrl,
        filename: req.file.filename,
        path: req.file.path // The relative path on the server
      });

    } catch (error) {
      console.error('Local Upload Error:', error);
      return res.status(500).json({
        message: 'Internal server error during upload',
        error: error.message,
      });
    }
  });
};

export const mobileimageUpload = async (req, res) => {
  console.log('mobileimageUpload:', req.files);

  const multiUpload = upload.array('files', 10);

  multiUpload(req, res, async function (err) {
    if (err) {
      console.log('Multer Error:', err);
      return res.status(400).json({
        message: 'File upload failed',
        error: err.message
      });
    }

    console.log('Received files:', req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      const uploadResults = await Promise.all(
        req.files.map(async (file) => {
          const fileName = `optimized-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
          const outputPath = path.join('uploads/chat', fileName);

          // 🔥 FIX HERE
          await sharp(file.path)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

          return {
            url: `/uploads/chat/${fileName}`,
            filename: fileName
          };
        })
      );

      return res.json({
        message: 'Success',
        data: uploadResults
      });

    } catch (error) {
      console.error('Sharp Error:', error);
      return res.status(500).json({ message: 'Optimization failed' });
    }
  });
};


export const destopimageUpload = async (req, res) => {
  console.log('mobileimageUpload:', req.files);
  const multiUpload = upload.array('files', 10);
  multiUpload(req, res, async function (err) {
    if (err) {
      console.log('Multer Error:', err);
      return res.status(400).json({
        message: 'File upload failed',
        error: err.message
      });
    }

    console.log('Received files:', req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      const uploadResults = await Promise.all(
        req.files.map(async (file) => {
          const fileName = `optimized-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
          const outputPath = path.join('uploads/chat', fileName);

          // 🔥 FIX HERE
          await sharp(file.path)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

          return {
            url: `/uploads/chat/${fileName}`,
            filename: fileName
          };
        })
      );

      return res.json({
        message: 'Success',
        data: uploadResults
      });

    } catch (error) {
      console.error('Sharp Error:', error);
      return res.status(500).json({ message: 'Optimization failed' });
    }
  });

/*   // 1. Ensure this key 'files' matches exactly what frontend appends
  const multiUpload = upload.array('files', 10);

  multiUpload(req, res, async function (err) {
    // 2. Log any Multer specific errors
    if (err) {
      console.log('Multer Error:', err);
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    // 3. Now you can log the files
    console.log('Received files:', req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      const uploadResults = await Promise.all(
        req.files.map(async (file) => {
          const fileName = `optimized-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
          const outputPath = path.join('uploads/chat', fileName);
          // Ensure this directory exists!
          
          await sharp(file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

          return {
            url: `/uploads/chat/${fileName}`,
            filename: fileName
          };
        })
      );

      return res.json({
        message: 'Success',
        data: uploadResults 
      });

    } catch (error) {
      console.error('Sharp Error:', error);
      return res.status(500).json({ message: 'Optimization failed' });
    }
  });
 */
};

//multi image upload
export const imageUpload_working_for_single = async (req, res) => {
  // Use the multer middleware defined earlier
  const singleUpload = upload.single('file');
  singleUpload(req, res, async function (err) {
    // 1. Handle Multer Errors (e.g., file too large)
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    // 2. Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return res.json({
        message: 'File uploaded successfully to local storage',
        url: fileUrl,
        filename: req.file.filename,
        path: req.file.path // The relative path on the server
      });

    } catch (error) {
      console.error('Local Upload Error:', error);
      return res.status(500).json({
        message: 'Internal server error during upload',
        error: error.message,
      });
    }
  });
};

export const imageUpload = async (req, res) => {
  // Use .array() instead of .single(), matching the key 'files' from frontend
  const multiUpload = upload.array('files', 10);

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'Upload failed', error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
      // Map through all uploaded files to create an array of URLs
      const fileUrls = req.files.map(file => {
        return `/uploads/chat/${file.filename}`;
      });
      console.log({
        message: 'Files uploaded successfully',
        urls: fileUrls, // Return the array
      });
      return res.json({
        message: 'Files uploaded successfully',
        urls: fileUrls, // Return the array
      });

    } catch (error) {
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });
};


export const createGroupChat= async(req, res) => 
{
 // console.log('backend create gorup chat submit')
    try {
        const { groupName, isDisappearing,grouppermission_enable, 
          editgroupsetting, sendmessagepermission, 
          groupPermission, members, admins,
        disappearinggroup, createdBy } = req.body;
        // Validate members and admins first if necessary
        const group = await GroupChat.create({ 
            groupName, 
            isDisappearing, 
            grouppermission_enable,
            editgroupsetting,
            sendmessagepermission,
            groupPermission, 
            members, 
            admins,
            disappearinggroup, createdBy 
        });
        res.json({ message: "Group chat created successfully", group });
    } catch (error) {
        res.status(500).json({ message:'Server Error', error });
    }
}

export const getGroups = async (req, res) => {
  try {
    const userId = req.query.userId; // logged-in user
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalGroups = await GroupChat.countDocuments({ createdBy: userId });

    const groups = await GroupChat.find({ createdBy: userId })
      .populate('members', 'username userimage _id')
      .skip(skip)
      .limit(limit)
      .select('groupName members _id');

    const groupsData = groups.map(group => ({
      _id: group._id,
      groupName: group.groupName,
      membersCount: group.members.length,
      members: group.members.map(member => ({
        _id: member._id,
        userinfo: {
          username: member.username,
          userimage: member.userimage
        }
      }))
    }));

    res.json({
      page,
      totalPages: Math.ceil(totalGroups / limit),
      totalGroups,
      groups: groupsData
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


export const sendGroupmessage = async(req, res) => 
{   
   try {
    const { text, imageUrl, videoUrl, audioUrl, msgByUserId } = req.body;
    const { groupId } = req.params;
    const newMessage = await MessageModel.create({
      text,
      imageUrl,
      videoUrl,
      audioUrl,
      msgByUserId,
    });

    await GroupChat.findByIdAndUpdate(groupId, {
      $push: { messages: newMessage._id }
    });

    res.status(200).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }

}

export const getGroupMessagedata = async(req, res) => {
 try {
    const { groupId } = req.params;
    const group = await GroupChat.findById(groupId)
      .populate({
        path: 'message',
        populate: { path: 'msgByUserId', select: 'name image' }
      });

    res.status(200).json({ success: true, message: group.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/*
  These two routes are mounted without auth middleware, so req.user is never
  populated — the blocker id has to come from the request itself. The route
  param is :userid (lowercase d), which is the user being blocked.

  Prefer /apis/safety/block, which also tears down the follow relationship.
*/
export const blockUsers = async(req, res) => {
   try {
    const currentUserId = req.user?._id || req.user?.userId || req.body?.userId;
    const userToBlock = req.params.userid || req.params.userId;

    if (!currentUserId || !userToBlock) {
      return res.status(400).json({ error: "userId (blocker) and :userid (target) are required" });
    }
    if (String(currentUserId) === String(userToBlock)) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userToBlock },
      $pull: {
        followers: userToBlock, following: userToBlock,
        followRequests: userToBlock, sentFollowRequests: userToBlock,
        closeFriends: userToBlock,
      },
    });
    await User.findByIdAndUpdate(userToBlock, {
      $pull: {
        followers: currentUserId, following: currentUserId,
        followRequests: currentUserId, sentFollowRequests: currentUserId,
        closeFriends: currentUserId,
      },
    });

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /unblock/:userid
export const unblockUsers = async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.userId || req.body?.userId;
    const userToUnblock = req.params.userid || req.params.userId;

    if (!currentUserId || !userToUnblock) {
      return res.status(400).json({ error: "userId (blocker) and :userid (target) are required" });
    }

    await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { blockedUsers: userToUnblock } }
    );

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};







