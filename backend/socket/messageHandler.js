
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import multer from "multer";
import dotenv from "dotenv";
import crypto from "crypto"

import { MessageModel, ConversationModel } from "../models/ConversationModel.js";
import { GroupChat } from '../models/Groupchat.js'
import { saveBase64Audio } from "./uploadVoice.js";
import { applyDisappearing } from "../controllers/chatController.js";
import { canMessage } from "../helpers/messagePermission.js";

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


const handleSendMessage = async (io, socket = null, data, callback) => {
  try {
    const {
      clientMessageId, text, imageUrl, videoUrl,
      audioUrl, sender, receiver, groupId, type, 
      messagetype, replyTo, forwardedFrom, isForwarded,
      // Messaging module: typed files, stickers and view-once media travel the
      // socket path too, not only the REST one.
      attachments, sticker, viewOnce
    } = data;
     console.log('..sendMessage..new.cccc', JSON.stringify(data))
    // ===============================
    // GROUP MESSAGE
    // ===============================
    if (type === "group") {
      if(!groupId)
      {
        console.log('gorup id not found')
        return
      }
      let convo = await ConversationModel.findOne({
        type: "group",
        group: groupId,
      });
      if (!convo) {
        convo = new ConversationModel({
          type: "group",
          group: groupId,
          sender,
          receiver,
        });
       const saveMsg = await convo.save();
        console.log('group saveMsg', saveMsg)
      }

      const msg = new MessageModel({
        clientMessageId,
        text,
        imageUrl: imageUrl || [],
        videoUrl,
        audioUrl,
        msgByUserId: sender,
        messagetype,
        replyTo: data.replyTo,
        forwardedFrom: data.forwardedFrom,
        isForwarded: data.isForwarded,
        attachments: Array.isArray(attachments) ? attachments : [],
        sticker: sticker || undefined,
        viewOnce: !!viewOnce
      });

      const saved = await msg.save();
      convo.messages.push(saved._id);
      convo.updatedAt = new Date();
      convo.lastMessageAt = new Date();
      await convo.save();

      // Stamp the conversation's disappearing TTL onto the new message.
      const expiresAt = await applyDisappearing(convo._id, saved._id);
      if (expiresAt) saved.expiresAt = expiresAt;

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages")
        .populate("group", "groupName groupimage members");
       const payload = {
        conversationId: convo._id,
        messages: saved 
      };

      const group = await GroupChat.findById(groupId);

      if (group) {
        group.members.forEach((uid) => {
          io.to(uid.toString()).emit("receiveMessage", payload); //payload fullConvo
        });
      }
        console.log({
          success: true,
          mongoId: saved._id,
          clientMessageId
        }) 
      // ✅ ACK to sender
      if (callback) {
        callback({
          success: true,
          mongoId: saved._id,
          clientMessageId
        });
      }

    }

    // ===============================
    // PRIVATE MESSAGE
    // ===============================
    else {
      /*
        Ask before writing anything.

        Both the socket path and POST /apis/send-message land here, so this is
        the one place a direct message can be stopped — and until now neither
        checked. privacy.messages was settable in the app and enforced nowhere,
        and a blocked account could still be messaged.
      */
      const permission = await canMessage(sender, receiver);
      if (!permission.allowed) {
        if (callback) {
          callback({ success: false, error: permission.reason, blocked: true });
        }
        return;
      }

      let convo = await ConversationModel.findOne({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      });

      if (!convo) {
        convo = new ConversationModel({
          sender,
          receiver,
          type: "private",
        });
        await convo.save();
      }

      const msg = new MessageModel({
        clientMessageId,
        text,
        imageUrl: imageUrl || [],
        videoUrl,
        audioUrl: audioUrl,
        messagetype,
        msgByUserId: sender,  //replyTo,forwardedFrom,isForwarded
        replyTo: data.replyTo,
        forwardedFrom: data.forwardedFrom,
        isForwarded: data.isForwarded,
        attachments: Array.isArray(attachments) ? attachments : [],
        sticker: sticker || undefined,
        viewOnce: !!viewOnce
      });

      const saved = await msg.save();
      convo.messages.push(saved._id);
      convo.updatedAt = new Date();
      convo.lastMessageAt = new Date();
      await convo.save();

      const expiresAt = await applyDisappearing(convo._id, saved._id);
      if (expiresAt) saved.expiresAt = expiresAt;

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages");
      const payload = {
        conversationId: convo._id,
        messages: saved 
      };
   //  console.log('payload....here... test.....',payload);
      [sender, receiver].forEach((uid) => {
        if (uid.toString() !== sender) {
            io.to(uid.toString()).emit("receiveMessage", payload);
        }
      });
     /*  console.log({
          success: true,
          mongoId: saved._id,
          clientMessageId
        }) */
      // ✅ ACK to sender
      if (callback) {
        callback({
          success: true,
          mongoId: saved._id,
          clientMessageId
        });
      }
    }
  } catch (error) {
    console.error("sendMessage error:", error);
    if (callback) {
      callback({
        success: false,
        error: "Message save failed"
      });
    }

  }
};

const handleSendMessage_oofffffff = async (io, socket = null, data, callback) => {
  console.log("..sendMessage..new.cccc", JSON.stringify(data));

  try {
    const {
      clientMessageId,
      text,
      imageUrl,
      videoUrl,
      audioUrl,
      sender,
      receiver,
      groupId,
      type,
      messagetype,
      replyTo,
      forwardedFrom,
      isForwarded
    } = data;

    // ===============================
    // GROUP MESSAGE
    // ===============================
    if (type === "group") {

      let convo = await ConversationModel.findOne({
        type: "group",
        group: groupId,
      });

      if (!convo) {
        convo = new ConversationModel({
          type: "group",
          group: groupId,
          sender,
          receiver,
        });
        await convo.save();
      }

      // ✅ UPSERT message (prevents duplicates)
      const saved = await MessageModel.findOneAndUpdate(
        { clientMessageId },
        {
          clientMessageId,
          text,
          imageUrl: imageUrl || [],
          videoUrl,
          audioUrl,
          messagetype,
          msgByUserId: sender,
          replyTo,
          forwardedFrom,
          isForwarded
        },
        { upsert: true, new: true }
      );

      // avoid pushing duplicate message
      if (!convo.messages.includes(saved._id)) {
        convo.messages.push(saved._id);
        convo.updatedAt = new Date();
        await convo.save();
      }

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages")
        .populate("group", "groupName groupimage members");

      const group = await GroupChat.findById(groupId);

      if (group) {
        group.members.forEach((uid) => {
          io.to(uid.toString()).emit("newMessages", fullConvo);
        });
      }

      // ✅ ACK to sender
      if (callback) {
        callback({
          success: true,
          mongoId: saved._id,
          clientMessageId
        });
      }

    }

    // ===============================
    // PRIVATE MESSAGE
    // ===============================
    else {

      let convo = await ConversationModel.findOne({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      });

      if (!convo) {
        convo = new ConversationModel({
          sender,
          receiver,
          type: "private",
        });
        await convo.save();
      }

      // ✅ UPSERT message (prevents duplicates)
      const saved = await MessageModel.findOneAndUpdate(
        { clientMessageId },
        {
          clientMessageId,
          text,
          imageUrl: imageUrl || [],
          videoUrl,
          audioUrl,
          messagetype,
          msgByUserId: sender,
          replyTo,
          forwardedFrom,
          isForwarded
        },
        { upsert: true, new: true }
      );

      if (!convo.messages.includes(saved._id)) {
        convo.messages.push(saved._id);
        convo.updatedAt = new Date();
        await convo.save();
      }

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages");

      [sender, receiver].forEach((uid) => {

        if (uid.toString() !== data.sender) { // sender does not receive its own message
          io.to(uid).emit("newMessages", fullConvo);
          console.log('response data ', fullConvo)
          // io.to(uid.toString()).emit("newMessages", fullConvo);
        }
      });

      // ✅ ACK to sender
      if (callback) {
        callback({
          success: true,
          mongoId: saved._id,
          clientMessageId
        });
      }

    }

  } catch (error) {

    console.error("sendMessage error:", error);

    if (callback) {
      callback({
        success: false,
        error: "Message save failed"
      });
    }

  }
};


//module.exports = handleSendMessage;
export default handleSendMessage;