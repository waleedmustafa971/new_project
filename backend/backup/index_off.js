import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import path from "path";
dotenv.config();

const app = express();
// Create a router


//app.use(express.json());
app.use(express.json({ type: ['application/json', 'application/vnd.api+json'] }));
//application/vnd.api+json this basically for payment getway

app.use(express.urlencoded({ extended: true, limit: '50mb' })); // ✅ Handles form-urlencoded data
app.use(cookieParser());

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ✅ Correct Middleware Order
app.use(cors({
  origin: ["https://max-core-property-website.vercel.app","https://max-core-property-website-f3oo9i0og-cry-trs-projects.vercel.app","http://localhost:5173", "http://localhost:3000","http://localhost:3001","http://localhost:3002"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
}));

// ❌ Remove redundant bodyParser (Express already handles this)
// app.use(bodyParser.json()); 
// app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Set Headers Middleware (CORS Credentials Fix)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});

// Multer File Upload Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
  //  cb(null, "../client/public/upload");
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  }
});
const upload = multer({ storage });

// Get the equivalent of __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/profilepicture", express.static(path.join(__dirname, "profilepicture")));

const MONGO_URI = process.env.MONGO_URI;
   mongoose
  .connect(MONGO_URI, {
   // useNewUrlParser: true,
   // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,  // Add a timeout (5s)
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));
 


app.get("/", (req, res) => {
  res.send("API is running..from node.");
});

app.get("/home", (req, res) => {
  res.send("API is running..home.");
});

app.get("/send", (req, res) => {
  res.send("API is running...send...");
});

// Import Routes
import authRoute from "./routes/auth.js";
import categoryRoutes from "./routes/category.js";
import countryRoutes from "./routes/countryRoutes.js"

import reelRoutes from "./routes/reelRoutes.js"
import chatRoutes from "./routes/chatroutes.js"
import musicRoutes from "./routes/music_route.js"
import postRoute from "./routes/postRoute.js"
import ivsRoute from "./routes/ivsRoute.js"
import groupRoute from "./routes/group_route.js"
import videoRoute from './routes/video_route.js'
import voiceRoute from "./routes/messenger_route.js"
import Gallery from './routes/gallery_route.js'
import adminRoutes from './routes/adminRoutes.js'
import getConversation from "./helpers/getConversation.js";
import getUserDetails from "./helpers/getUserDetails.js";
import User from './models/users.js'
import { MessageModel,ConversationModel } from "./models/ConversationModel.js";
import {GroupChat} from './models/Groupchat.js'
import createStream from './routes/livestream_router.js'
import propertData from './routes/property_route.js'
import motorsData from './routes/motors_route.js'
import youtubeVideo from './routes/videoyoutube_router.js'
import packageRoutes from "./routes/packageRoutes.js"
import promoRoutes from "./routes/promoRoutes.js"
import verificationRoutes from "./routes/verification_route.js"
import supportRoutes from "./routes/support_router.js"
import dashboardRoutes from "./routes/userdashboard_router.js"
import jobRoutes from './routes/job_route.js'
import agentRoutes from "./routes/agentRoute.js"
import propertyvideoRoutes from './routes/property_video.js'
//import JobcategoryRoutes from './router/JobcategoryRoutes.js'

/* ecommerce */
import ecomcategoryRoute from "./routes/categoryecomRoute.js";
import vendorRoute from "./routes/vendorRoutes.js"
import productRoute from "./routes/productRoutes.js"
import sliderRoutes from "./routes/sliderRoutes.js"
import cartRoute from "./routes/cartRoute.js"
import brandRoute from "./routes/brandRoute.js"
import orderRoute from "./routes/orderRoute.js"
import testinvoiceRoute from "./routes/testinvoiceRoute.js"

app.use("/api/ecomcategory", ecomcategoryRoute); 
app.use("/api/vendor", vendorRoute); 
app.use("/api/brand", brandRoute); 
app.use("/api/product", productRoute); 
app.use("/api/admins", adminRoutes); 
app.use("/api/slider", sliderRoutes); 
app.use("/api/cart", cartRoute); 
app.use("/api/order", orderRoute); 
app.use("/api/test", testinvoiceRoute)

/* end ecommerce */

app.use("/apis/auth", authRoute); //https://vybe-api.vercel.app/apis/auth/test this URL working
app.use("/apis/admins", adminRoutes); 
app.use("/apis/categories", categoryRoutes); //list
//app.use("/apis/jobcategories", JobcategoryRoutes); //list
app.use("/apis/countries", countryRoutes);
app.use("/apis/reel", reelRoutes);
app.use("/apis/promo",promoRoutes)
app.use("/apis/job",jobRoutes)
app.use("/apis/propertyvideo",propertyvideoRoutes)

app.use("/apis/chat", chatRoutes); 
app.use("/apis/musics", musicRoutes); 
app.use("/apis/postreel", postRoute); //lasttenpost
app.use("/apis/groupdata", groupRoute); //lasttenpost
app.use("/apis/voice", voiceRoute); //messenger voice send
app.use("/apis/gallery", Gallery)
app.use("/apis/package", packageRoutes) 
app.use("/apis/dashboard",dashboardRoutes)
app.use("/apis/agent",agentRoutes)
app.use("/apis/ivs", ivsRoute); //lasttenpost
app.use("/apis/video", videoRoute); //lasttenpost
app.use("/apis/live", createStream); 
app.use("/apis/property", propertData); 
app.use("/apis/motors", motorsData); 
app.use("/apis/verification",verificationRoutes) //verificationRoutes
app.use("/apis/support",supportRoutes) //verificationRoutes supportRoutes

app.use("/apis/yuvideo",youtubeVideo)

app.post("/apis/send-message", async (req, res) => {
  const data = req.body;
 
  //console.log('...json data...', data);

try {
    const { text, imageUrl, videoUrl, audioUrl, sender, receiver, groupId, type } = data;
    if(type == "group")
    {
      let convo;
    //group start
      // Find the group conversation
      convo = await ConversationModel.findOne({
        type: "group",
        group: data.groupId,
      });
      if (!convo) {
        convo = new ConversationModel({
          type: "group",
          group: data.groupId,
          sender: data.sender,
          receiver: data.receiver,
        });
        await convo.save();
      }

    const msg = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      audioUrl: data.audioUrl,
      msgByUserId: data.sender,
    });

      const saved = await msg.save();
      convo.messages.push(saved._id);   
//      convo.messages.push(savedMsg._id);
      convo.updatedAt = new Date();
      await convo.save();

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages")
        .populate("group", "groupName groupimage members");

      // Emit to all group members
      const group = await GroupChat.findById(data.groupId);
      if (group) {
        group.members.forEach((uid) => {
          io.to(uid.toString()).emit("newMessages", fullConvo?.messages);
        });

        group.members.forEach(async (uid) => {
          const privateConvos = await ConversationModel.find({
            type: "private",
            $or: [{ sender: uid }, { receiver: uid }],
          })
            .populate("sender", "name image")
            .populate("receiver", "name image")
            .populate("messages");

          const groupConvos = await ConversationModel.find({
            type: "group",
          })
            .populate("messages")
            .populate({
              path: "group",
              match: { members: uid },
              select: "groupName groupimage",
            });

          const result = [];

          privateConvos.forEach((c) => {
            const partner =
              c.sender._id.toString() === uid ? c.receiver : c.sender;
            const lastMsg =
              c.messages && c.messages.length > 0
                ? c.messages[c.messages.length - 1]
                : null;

            result.push({
              _id: c._id,
              type: "private",
              partner,
              lastMsg,
            });
          });

          groupConvos.forEach((c) => {
            if (c.group) {
              const lastMsg =
                c.messages && c.messages.length > 0
                  ? c.messages[c.messages.length - 1]
                  : null;

              result.push({
                _id: c._id,
                type: "group",
                group: c.group,
                lastMsg,
              });
            }
          });

          result.sort((a, b) => {
            const timeA = a.lastMsg?.createdAt || 0;
            const timeB = b.lastMsg?.createdAt || 0;
            return new Date(timeB) - new Date(timeA);
          });

          io.to(uid.toString()).emit("conversations", result);
        });
      }
    //end group  
    }
    else
    {
      //private
      let convo = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    });

    if (!convo) {
      convo = new ConversationModel({
        sender: data.sender,
        receiver: data.receiver,
        type : "private"
      });
      await convo.save();
    }

    const msg = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      audioUrl: data.audioUrl,
      msgByUserId: data.sender,
    });

    const saved = await msg.save();
    convo.messages.push(saved._id);
    convo.updatedAt = new Date();
    await convo.save();

    const fullConvo = await ConversationModel.findById(convo._id).populate("messages");

    [data.sender, data.receiver].forEach((uid) => {
      io.to(uid).emit("newMessages", fullConvo?.messages);
    });

    [data.sender, data.receiver].forEach(async (uid) => {
      const convos = await ConversationModel.find({
        $or: [{ sender: uid }, { receiver: uid }],
      })
        .populate("sender", "name image")
        .populate("receiver", "name image")
        .sort({ updatedAt: -1 });

      io.to(uid).emit("conversations", convos);
    });

      //end private
    }
    
    } catch (err) {
    console.error("sendMessage error:", err);
  }

});

app.get("/apis/get-message", async (req, res) => {
  const uid = req.body.uid;

  try {
    const convos = await ConversationModel.find({
      $or: [{ sender: uid }, { receiver: uid }],
    })
      .populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      })
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .sort({ updatedAt: -1 });

    const seenPartners = new Set();
    const uniqueConversations = [];

    for (const convo of convos) {
      const partner =
        convo.sender._id.toString() === uid
          ? convo.receiver
          : convo.sender;

      if (seenPartners.has(partner._id.toString())) continue;

      seenPartners.add(partner._id.toString());

      const messages = convo.messages || [];
      const lastMsg = messages[messages.length - 1];

      uniqueConversations.push({
        _id: convo._id,
        partner,
        lastMsg,
      });
    }

    res.json(uniqueConversations);
  } catch (err) {
    console.error("Error in getConversations:", err);
    res.status(500).json([]);
  }
});

app.post("/apis/getChatdetails", async (req, res) => {
  const { me, partner, convoId, type } = req.body;
  console.log(`getMessages... type: ${type}, me: ${me}, partner: ${partner}, convoId: ${convoId}`);
  try {
    let messages = [];

    if (type === "private") {
      const convo = await ConversationModel.findOne({
        type: "private",
        $or: [
          { sender: me, receiver: partner },
          { sender: partner, receiver: me },
        ],
      }).populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      });

      messages = convo?.messages || [];
       return res.json({ messages: convo.messages });

    } else if (type === "group") {
      const convo = await ConversationModel.findOne({
        type: "group",
        group: convoId, // convoId is the group ID (or conversation ID for group)
      }).populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      });

      messages = convo?.messages || [];
      return res.json({ messages: convo.messages });
    }

   // socket.emit("messages", messages);
  } catch (err) {
    console.error("getMessages error:", err);
    //socket.emit("messages", []); // fallback on error
  }

 /*  try {
    const { me, partner } = req.body;

    if (!me || !partner) {
      return res.status(400).json({ error: "Missing 'me' or 'partner' in request body." });
    }

    console.log(`Fetching messages between ${me} and ${partner}`);

    const convo = await ConversationModel.findOne({
      $or: [
        { sender: me, receiver: partner },
        { sender: partner, receiver: me },
      ],
    }).populate("messages"); // Make sure 'messages' is properly referenced in your schema

    if (!convo) {
      return res.status(404).json({ messages: [] });
    }

    console.log("Found messages:", convo.messages?.length);
    return res.json({ messages: convo.messages });
  } catch (error) {
    console.error("Error fetching chat details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } */
});


app.get("/apis/conversations/:userId", async (req, res) => {
   const uid = req.params.userId;   
  try {
    // Private
    const privateConvos = await ConversationModel.find({
      type: "private",
      $or: [{ sender: uid }, { receiver: uid }],
    })
      .populate("messages")
      .populate("sender", "name image")
      .populate("receiver", "name image");
      
    const privateResults = privateConvos.map((c) => {
      const lastMsg = c.messages[c.messages.length - 1];
      const partner = c.sender._id.toString() === uid ? c.receiver : c.sender;
      return {
        _id: c._id,
        type: "private",
        partner,
        lastMsg,
        updatedAt: c.updatedAt,
      };
    });

  // Group
 console.log('uid', uid) //Connected 67f772ab25b7e3f3b5f04783

   // Step 1: Find group IDs the user belongs to
  const groupIds = await GroupChat
    .find({ members: new mongoose.Types.ObjectId(uid) })
    .distinct('_id');
 console.log('groupIds...', groupIds) //Connected 67f772ab25b7e3f3b5f04783

  // Step 2: Fetch conversations that reference those groups
  const groupConvos = await ConversationModel.find({ 
      type: "group", 
      group: { $in: groupIds }
    })
    .populate({
      path: "group",
      select: "groupName groupimage members",
    })
    .populate("messages");
  console.log('....', groupConvos)
  // Step 3: Format group conversations
  const groupResults = groupConvos
    .filter((c) => c.group) // Ensure populated group exists
    .map((c) => {
      const lastMsg = c.messages[c.messages.length - 1];
      return {
        _id: c._id,
        type: "group",
        group: {
          _id: c.group._id,
          groupName: c.group.groupName,
          groupimage: c.group.groupimage,
        },
        lastMsg,
        updatedAt: c.updatedAt,
      };
    });

  // You would need to define privateResults elsewhere before this
    const all = [...privateResults, ...groupResults].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    return res.json({ messages: all });
  } catch (err) {
    console.error("Error in getConversations:", err);
    res.status(500).json({ message: "Failed to get conversations" });
  }
});

// Online users
const onlineUsers = new Set();
io.on("connection", async (socket) => 
{
  const userId = socket.handshake.query.userId;
  const user = await User.findById(userId).select("-password");
  if (!user) return;
  console.log('...userid......' + userId)
  socket.join(userId);
  onlineUsers.add(userId);
  io.emit("onlineUsers", Array.from(onlineUsers));
  console.log('online user' + Array.from(onlineUsers))


  socket.on("getConversations", async (uid) => {
    try {
      // --- 1. Get PRIVATE CHATS ---
        const privateConvos = await ConversationModel.find({
        type: "private",
        $or: [{ sender: uid }, { receiver: uid }],
      })
        .populate("messages")
        .populate("sender", "name image")
        .populate("receiver", "name image");

      const privateResults = privateConvos.map((c) => {
        const lastMsg = c.messages[c.messages.length - 1];
        const partner = c.sender._id.toString() === uid ? c.receiver : c.sender;

        return {
          _id: c._id,
          type: "private",
          partner,
          lastMsg,
          updatedAt: c.updatedAt,
        };
      });

      // Group
      const groupConvos = await ConversationModel.find({ type: "group" })
        .populate({
          path: "group",
          match: { members: uid },
          select: "groupName groupimage members",
        })
        .populate("messages");

      const groupResults = groupConvos
        .filter((c) => c.group)
        .map((c) => {
          const lastMsg = c.messages[c.messages.length - 1];
          return {
            _id: c._id,
            type: "group",
            group: {
              _id: c.group._id,
              groupName: c.group.groupName,
              groupimage: c.group.groupimage,
            },
            lastMsg,
            updatedAt: c.updatedAt,
          };
        });

      const all = [...privateResults, ...groupResults].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      socket.emit("conversations", all);
    } catch (err) {
      console.error("Error in getConversations:", err);
      socket.emit("conversations", []);
    }
  });


  socket.on("getMessages", async ({ me, partner, type, convoId }) => {
  console.log(`getMessages... type: ${type}, me: ${me}, partner: ${partner}, convoId: ${convoId}`);
  try {
    let messages = [];

    if (type === "private") {
      const convo = await ConversationModel.findOne({
        type: "private",
        $or: [
          { sender: me, receiver: partner },
          { sender: partner, receiver: me },
        ],
      }).populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      });

      messages = convo?.messages || [];

    } else if (type === "group") {
      const convo = await ConversationModel.findOne({
        type: "group",
        group: convoId, // convoId is the group ID (or conversation ID for group)
      }).populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      });

      messages = convo?.messages || [];
    }

    socket.emit("messages", messages);
  } catch (err) {
    console.error("getMessages error:", err);
    socket.emit("messages", []); // fallback on error
  }
  });


  socket.on("sendMessage", async (data) => {
  try {
    const { text, imageUrl, videoUrl, audioUrl, sender, receiver, groupId, type } = data;
    if(type == "group")
    {
      let convo;
    //group start
      // Find the group conversation
      convo = await ConversationModel.findOne({
        type: "group",
        group: data.groupId,
      });
      if (!convo) {
        convo = new ConversationModel({
          type: "group",
          group: data.groupId,
          sender: data.sender,
          receiver: data.receiver,
        });
        await convo.save();
      }

    const msg = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      audioUrl: data.audioUrl,
      msgByUserId: data.sender,
    });

      const saved = await msg.save();
      convo.messages.push(saved._id);   
//      convo.messages.push(savedMsg._id);
      convo.updatedAt = new Date();
      await convo.save();

      const fullConvo = await ConversationModel.findById(convo._id)
        .populate("messages")
        .populate("group", "groupName groupimage members");

      // Emit to all group members
      const group = await GroupChat.findById(data.groupId);
      if (group) {
        group.members.forEach((uid) => {
          io.to(uid.toString()).emit("newMessages", fullConvo?.messages);
        });

        group.members.forEach(async (uid) => {
          const privateConvos = await ConversationModel.find({
            type: "private",
            $or: [{ sender: uid }, { receiver: uid }],
          })
            .populate("sender", "name image")
            .populate("receiver", "name image")
            .populate("messages");

          const groupConvos = await ConversationModel.find({
            type: "group",
          })
            .populate("messages")
            .populate({
              path: "group",
              match: { members: uid },
              select: "groupName groupimage",
            });

          const result = [];

          privateConvos.forEach((c) => {
            const partner =
              c.sender._id.toString() === uid ? c.receiver : c.sender;
            const lastMsg =
              c.messages && c.messages.length > 0
                ? c.messages[c.messages.length - 1]
                : null;

            result.push({
              _id: c._id,
              type: "private",
              partner,
              lastMsg,
            });
          });

          groupConvos.forEach((c) => {
            if (c.group) {
              const lastMsg =
                c.messages && c.messages.length > 0
                  ? c.messages[c.messages.length - 1]
                  : null;

              result.push({
                _id: c._id,
                type: "group",
                group: c.group,
                lastMsg,
              });
            }
          });

          result.sort((a, b) => {
            const timeA = a.lastMsg?.createdAt || 0;
            const timeB = b.lastMsg?.createdAt || 0;
            return new Date(timeB) - new Date(timeA);
          });

          io.to(uid.toString()).emit("conversations", result);
        });
      }
    //end group  
    }
    else
    {
      //private
      let convo = await ConversationModel.findOne({
      $or: [
        { sender: data.sender, receiver: data.receiver },
        { sender: data.receiver, receiver: data.sender },
      ],
    });

    if (!convo) {
      convo = new ConversationModel({
        sender: data.sender,
        receiver: data.receiver,
        type : "private"
      });
      await convo.save();
    }

    const msg = new MessageModel({
      text: data.text,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      audioUrl: data.audioUrl,
      msgByUserId: data.sender,
    });

    const saved = await msg.save();
    convo.messages.push(saved._id);
    convo.updatedAt = new Date();
    await convo.save();

    const fullConvo = await ConversationModel.findById(convo._id).populate("messages");

    [data.sender, data.receiver].forEach((uid) => {
      io.to(uid).emit("newMessages", fullConvo?.messages);
    });

    [data.sender, data.receiver].forEach(async (uid) => {
      const convos = await ConversationModel.find({
        $or: [{ sender: uid }, { receiver: uid }],
      })
        .populate("sender", "name image")
        .populate("receiver", "name image")
        .sort({ updatedAt: -1 });

      io.to(uid).emit("conversations", convos);
    });

      //end private
    }
    
    } catch (err) {
    console.error("sendMessage error:", err);
  }
  });


  socket.on("seenMessages", async ({ me, partner }) => {
    const convo = await ConversationModel.findOne({
      $or: [
        { sender: me, receiver: partner },
        { sender: partner, receiver: me },
      ],
    });

    if (!convo) return;

    await MessageModel.updateMany(
      { _id: { $in: convo.messages }, msgByUserId: partner },
      { seen: true }
    );

    const msgs = await MessageModel.find({ _id: { $in: convo.messages } });

    [me, partner].forEach((uid) => {
      io.to(uid).emit("newMessages", msgs);
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("onlineUsers", Array.from(onlineUsers));
  });
});

// Do NOT use `app.listen()` in a serverless environment
//local pc only port dont use for vercel
var PORT = 3000;
app.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});   


server.listen(5000, () => console.log("🚀 Server running for socket port 5000"));

export default app;
