import AWS from 'aws-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import multer from "multer";
import dotenv from "dotenv";
// Express controller example:
import { GroupChat } from '../models/Groupchat.js';
import { MessageModel,ConversationModel } from "../models/ConversationModel.js";

import User from "../models/users.js";

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
//const upload = multer({ storage: multer.memoryStorage() });

export const voiceUpload = async (req, res) => {
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









