
//import Message from "../models/Message.js";
import User from "../models/users.js";
import multer from "multer";
import path from "path";
import { uploadMultiple } from "../middleware/multerConfig.js"; // Import multer setup
import mongoose from 'mongoose';

export const messages = async (req, res) => {
    const { sender, receiver } = req.query;
    const messages = await Message.find({ 
      $or: [{ sender, receiver }, { sender: receiver, receiver: sender }] 
    }).sort("createdAt");
    res.json(messages);
}; 
//addmessages
export const addmessages = async (req, res) => {
    try {
        const { sender, receiver, message, image, video, audio } = req.body;
        // Validate input fields (optional)
        if (!sender || !receiver) {
          return res.status(400).json({ error: "Sender and receiver are required." });
        }
        // Create a new message instance
        const newMessage = new Message({
          sender,
          receiver,
          message,
          image,   // Image URL (optional)
          video,   // Video URL (optional)
          audio,   // Audio URL (optional)
        });
    
        // Save the message to the database
        await newMessage.save();
    
        // Respond with the saved message
        res.status(201).json(newMessage);
      } catch (error) {
        console.error("Error inserting message:", error);
        res.status(500).json({ error: "Server error" });
      }
}

export const chatList = async (req,res) => {
  const userId = req.query.userId;
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // Step 1: Get all distinct chat partner IDs
    const messageUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $project: {
          user: {
            $cond: [
              { $eq: ['$sender', new mongoose.Types.ObjectId(userId)] },
              '$receiver',
              '$sender'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$user'
        }
      }
    ]);

    let chatUserIds = messageUsers.map(item => item._id);

    // Step 2: Optional search by name
    if (search.trim()) {
      const matchedUsers = await User.find({
        _id: { $in: chatUserIds },
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      chatUserIds = matchedUsers.map(user => user._id);
    }

    const paginatedIds = chatUserIds.slice(skip, skip + limit);

    // Step 3: Get last message per chat partner
    const lastMessages = await Promise.all(paginatedIds.map(async (chatUserId) => {
      const lastMessage = await Message.findOne({
        $or: [
          { sender: userId, receiver: chatUserId },
          { sender: chatUserId, receiver: userId }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(1);

      const user = await User.findById(chatUserId).select('-password');

      return {
        user,
        lastMessage
      };
    }));

    res.json({
      chatUsers: lastMessages,
      currentPage: page,
      total: chatUserIds.length,
      totalPages: Math.ceil(chatUserIds.length / limit),
      hasMore: (skip + limit) < chatUserIds.length
    });

  } catch (err) {
    console.error('Error fetching chatlist:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}


