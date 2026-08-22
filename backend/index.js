import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authLimiter, adminAuthLimiter, apiLimiter } from "./middleware/rateLimit.js";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import path from "path";
import { setIO } from "./socket/socket.js";
dotenv.config();

const app = express();

/*
  Security headers.

  CSP is deliberately off: the admin panel builds markup with inline onerror
  handlers, and a default policy blocks those, so turning it on here would
  silently break the panel rather than protect it. Enabling it properly means
  removing those handlers from public/admin/app.js first.

  Cross-origin resource policy is relaxed for the same practical reason —
  /uploads has to be loadable by the app and by the admin panel, which are not
  always the same origin as the API.
*/
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Create a router
app.use(express.json({ type: ['application/json', 'application/vnd.api+json'] }));

app.use(express.urlencoded({ extended: true, limit: '50mb' })); // ✅ Handles form-urlencoded data
app.use(cookieParser());

const server = createServer(app);
//const io = new Server(server, { cors: { origin: "*" } });

const io = new Server(server, {
  cors: {
    origin: [
      "https://dokandarapps.com",
      "https://www.dokandarapps.com",
      "http://localhost:3000"
    ],
    credentials: true
  }
});
// Expose io so routes (e.g. admin panel moderation) can emit to rooms
app.set("io", io);
// And register it with the socket module, so controllers reaching for getIO()
// (messaging, calls, encryption) talk to this same instance rather than throwing.
setIO(io);

// initSocket(server); here is for live stream
// initSocket(server);

// ✅ Correct Middleware Order
app.use(cors({
  origin: ["https://max-core-property-website.vercel.app",
    "https://max-core-property-website-f3oo9i0og-cry-trs-projects.vercel.app",
    "http://localhost:5173", "http://localhost:3000",
    "http://localhost:3001", "http://localhost:3002",
  "http://localhost:5174"],
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

/*
  The unused multer instance that used to sit here has been removed. It built
  filenames as Date.now() + file.originalname, which multer joins onto the
  destination verbatim — a name containing ../ escaped uploads/. Nothing
  referenced it, so it was a loaded gun with no trigger attached. The real
  uploaders are middleware/upload.js and middleware/multerConfig.js.
*/

// Get the equivalent of __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/profilepicture", express.static(path.join(__dirname, "profilepicture")));

// Admin Panel UI (Social Media module) -> http://localhost:PORT/admin
app.use("/admin", express.static(path.join(__dirname, "public", "admin")));

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
import { MessageModel, ConversationModel } from "./models/ConversationModel.js";
import { GroupChat } from './models/Groupchat.js'
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
import notificationRoutes from "./routes/notificationRoutes.js"
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
import productChatRoute from './routes/productchat_route.js'
import handleSendMessage from './socket/messageHandler.js';
import { notifyOfflineMessage } from './helpers/messageNotify.js';


/* gift transaction */
import GiftModal from "./models/GiftModal.js";
import LiveStream from "./models/LiveStream.js";
import GiftTransaction from "./models/GiftTransaction.js";


/* Food */
import FoodCategoryRoute from "./routes/food/FoodCategoryRoute.js" 
import ImageRoute from "./routes/food/ImageRoute.js" 
app.use("/api/food", FoodCategoryRoute);
app.use("/api/imagelibrary", ImageRoute);
import videoprocessing_route from "./routes/videoprocessing_route.js"
import socialgroup_route from "./routes/socialmediagroupRoute.js"

import DeliveryRouter from "./routes/delivery/DeliveryRouter.js"
app.use("/api/deliveryboy", DeliveryRouter);

app.use("/api/videoprocessing", videoprocessing_route);
/* end Food */

/* Admin Panel API (backs the UI at /admin) */
import adminPanelRoute from "./routes/adminPanelRoute.js";
import adminUsersRoute from "./routes/adminUsersRoute.js";
/*
  A ceiling on API traffic per IP. High enough that no real client or test run
  reaches it, low enough that enumerating the API is not free.
*/
app.use("/apis", apiLimiter);
app.use("/api", apiLimiter);

app.use("/api/adminpanel/login", adminAuthLimiter);
app.use("/api/adminpanel", adminPanelRoute);
// Extended user management (audit, bulk, export, safe delete). Mounted on its
// own path so the panel's existing /api/adminpanel/users routes keep working.
app.use("/api/adminusers", adminUsersRoute);

/* Social Media module: privacy settings + safety (block & report) */
import privacyRoute from "./routes/privacyRoute.js";
import safetyRoute from "./routes/safetyRoute.js";
app.use("/apis/privacy", privacyRoute);
app.use("/apis/safety", safetyRoute);

/* Social Media module: feed, For You, trending, stories, hashtags, check-ins */
import feedRoute from "./routes/feedRoute.js";
import engagementRoute from "./routes/engagementRoute.js";
import postingRoute from "./routes/postingRoute.js";
import liveRoute from "./routes/liveRoute.js";
import monetisationRoute from "./routes/monetisationRoute.js";
import creatorRoute from "./routes/creatorRoute.js";
import settingsRoute from "./routes/settingsRoute.js";
import editorRoute from "./routes/editorRoute.js";
import storageRoute from "./routes/storageRoute.js";
import storyRoute from "./routes/storyRoute.js";
import messagingRoute from "./routes/messagingRoute.js";
import groupsRoute from "./routes/groupsRoute.js";
import discoveryRoute from "./routes/discoveryRoute.js";
import profileRoute from "./routes/profileRoute.js";
app.use("/apis/feed", feedRoute);
app.use("/apis/engagement", engagementRoute);
app.use("/apis/posting", postingRoute);
// Shares the /apis/live prefix with livestream_router below, which keeps the
// Agora token and gift-admin endpoints. Registered first, so any path added
// there that collides with one here would be shadowed — keep them disjoint.
app.use("/apis/live", liveRoute);

/* Monetisation — coins, virtual items, subscriptions, creator earnings. */
app.use("/apis/monetisation", monetisationRoute);

/* Pages / Creator / Business — analytics, scheduling, boosts and ads. */
app.use("/apis/creator", creatorRoute);

/* Stories — stickers, highlights, swipe-up links and mentions. */
app.use("/apis/stories", storyRoute);

/* Advanced / Optional Features.
   Appearance and language (dark mode, Arabic/English), the video editor's
   trim-and-text decision list, and one answer to where uploaded files live. */
app.use("/apis/settings", settingsRoute);
app.use("/apis/editor", editorRoute);
app.use("/apis/storage", storageRoute);

/*
  Publish scheduled posts as they come due.

  A plain interval rather than a cron dependency, because the feed already
  excludes a scheduled post until its date passes — so this running late means
  a post appears in the feed slightly before its status flips, never the other
  way round. The endpoint POST /apis/creator/scheduled/publish-due does the same
  work on demand for a real scheduler, or for a test.
*/
import { runDuePublish } from "./controllers/creatorController.js";
const SCHEDULE_TICK_MS = 60 * 1000;
setInterval(() => {
  runDuePublish()
    .then((r) => { if (r.published) console.log(`🗓  published ${r.published} scheduled post(s)`); })
    .catch((err) => console.error("[schedule]", err.message));
}, SCHEDULE_TICK_MS).unref();
app.use("/apis/messaging", messagingRoute);
// Groups & Community. Runs alongside the older /api/socialgroup CRUD below,
// which keeps working against the same collection.
app.use("/apis/groups", groupsRoute);
// Discovery & Search. The narrower /apis/feed search, hashtag, nearby and
// recommendation endpoints stay exactly as they are.
app.use("/apis/discovery", discoveryRoute);
// User Account & Profile. /apis/auth/editprofile and /apis/reel/Addfollow stay.
app.use("/apis/profile", profileRoute);

app.use("/api/socialgroup", socialgroup_route);
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
/*
  Two-Factor Authentication. Mounted before authRoute so /apis/auth/2fa/* is
  matched here rather than falling through to the broader auth router.
*/
import twoFactorRoute from "./routes/twoFactorRoute.js";
app.use("/apis/auth/2fa", authLimiter);
app.use("/apis/auth/2fa", twoFactorRoute);

app.use("/apis/auth", authLimiter);
app.use("/apis/auth", authRoute); 
app.use("/apis/categories", categoryRoutes); //list
//app.use("/apis/jobcategories", JobcategoryRoutes); //list
app.use("/apis/countries", countryRoutes);
app.use("/apis/reel", reelRoutes);
app.use("/apis/promo", promoRoutes)
app.use("/apis/job", jobRoutes)
app.use("/apis/notification", notificationRoutes)
app.use("/apis/propertyvideo", propertyvideoRoutes)

app.use("/apis/chat", chatRoutes);
app.use("/apis/musics", musicRoutes);
app.use("/apis/postreel", postRoute); //lasttenpost
app.use("/apis/groupdata", groupRoute); //lasttenpost
app.use("/apis/voice", voiceRoute); //messenger voice send
app.use("/apis/gallery", Gallery)
app.use("/apis/package", packageRoutes)
app.use("/apis/dashboard", dashboardRoutes)
app.use("/apis/agent", agentRoutes)
app.use("/apis/ivs", ivsRoute); //lasttenpost
app.use("/apis/video", videoRoute); //lasttenpost
app.use("/apis/live", createStream);
app.use("/apis/property", propertData);
app.use("/apis/motors", motorsData);
app.use("/apis/verification", verificationRoutes) //verificationRoutes
app.use("/apis/support", supportRoutes) //verificationRoutes supportRoutes

app.use("/apis/productchat", productChatRoute)

app.use("/apis/yuvideo", youtubeVideo)

app.post("/apis/send-message", async (req, res) => {
  const data = req.body;
   try {
    const data = req.body;
    // socket = null because no socket
    //change anything its already called so many where in socket
    /*
      handleSendMessage refuses through its callback, which this route did not
      pass — so a message the privacy rules reject would have been reported to
      the caller as a success and then silently dropped. The callback turns
      that into a 403 the app can act on.
    */
    let refusal = null;
    await handleSendMessage(io, null, data, (ack) => {
      if (ack && ack.success === false) refusal = ack;
    });
    if (refusal) {
      return res.status(403).json({ success: false, message: refusal.error });
    }

    // Notify a recipient who is not connected; a connected one already has it.
    await notifyOfflineMessage(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

/*
  Messages this person has deleted for themselves stay deleted.

  A per-user delete writes the caller's id into `message.deletedFor`, and
  chatController's own history reader already honours it. This endpoint — the
  one the chat screen actually loads from — did not, so "delete for me" lasted
  exactly until the next time the thread was opened and the message came
  straight back.

  Written as a populate `match` rather than a filter afterwards so the rows
  never leave Mongo. `$ne` on an array field means "no element equals this",
  which is the test wanted, and it matches documents with no `deletedFor` at
  all — every message written before the field existed.
*/
const visibleTo = (me) => ({
  path: "messages",
  match: me ? { deletedFor: { $ne: me } } : {},
  options: { sort: { createdAt: 1 } },
});

//getConversion
app.post("/apis/getChatdetails", async (req, res) => {
  const { me, partner, convoId, type } = req.body;
  console.log(`getMessages... type: ${type}, me: ${me}, partner: ${partner}, convoId: ${convoId}`);
  try {
    if (type === "private") {
      const convo = await ConversationModel.findOne({
        type: "private",
        $or: [
          { sender: me, receiver: partner },
          { sender: partner, receiver: me },
        ],
      }).populate(visibleTo(me));

      /*
        `convo.messages` was read without a guard on the group branch, so a
        group with no conversation row yet threw a TypeError and answered
        nothing at all — no body, no status. The client saw a hanging request.
      */
      return res.json({ messages: convo?.messages || [] });

    } else if (type === "group") {
      const convo = await ConversationModel.findOne({
        type: "group",
        group: convoId, // convoId is the group ID (or conversation ID for group)
      }).populate(visibleTo(me));

      return res.json({ messages: convo?.messages || [] });
    }

    return res.json({ messages: [] });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ messages: [] });
  }
});

//not receive in mobile device
app.post("/apis/mobile-not-get-message", async (req, res) => {
  const { me, partner, convoId, type } = req.body;
  console.log(
    `getMessages... type: ${type}, me: ${me}, partner: ${partner}, convoId: ${convoId}`
  );
  try {
    if (type === "private") {
      const convo = await ConversationModel.findOne({
        type: "private",
        $or: [
          { sender: me, receiver: partner },
          { sender: partner, receiver: me },
        ],
      }).populate({
        path: "messages",
        match: { deliveredTo: { $nin: [me] } }, // ✅ hide if me exists
        options: { sort: { createdAt: 1 } },
      });

      return res.json({ messages: convo?.messages || [] });

    } else if (type === "group") {
      const convo = await ConversationModel.findOne({
        type: "group",
        group: convoId,
      }).populate({
        path: "messages",
        match: { deliveredTo: { $nin: [me] } }, // ✅ hide if me exists
        options: { sort: { createdAt: 1 } },
      });

      return res.json({ messages: convo?.messages || [] });
    }

    return res.json({ messages: [] });

  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ messages: [] });
  }

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


/*
  Online users.

  The set itself now lives in helpers/presence.js so message notifications can
  ask whether a recipient is actually connected. This file still owns adding and
  removing them, which is the only place that knows.
*/
import { markOnline, markOffline, onlineList } from "./helpers/presence.js";
io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  const user = await User.findById(userId).select("-password");
  /* 
  From Front End need call this 
export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  query: { userId },
  autoConnect: false, // connect manually when ready
});  
  */
  if (!userId) {
    console.log("❌ No userId found, disconnecting");
    socket.disconnect();
    return;
  }

  console.log("✅ Socket connected:", socket.id, "User:", userId);

  // console.log('...userid......' + userId)
  socket.join(userId);
  /* Live Room */

  //Create Live Room (Host)
  socket.on("create-live-room", ({ channelName, hoster }) => {
    socket.join(channelName);
    io.to(channelName).emit("live-room-created", {
      channelName,
      hoster,
      cohosters: [],
      audience: [],
    });

    console.log("host Live room created:", channelName);
  });

  //Join Live Room (Audience / Co-Host)
  socket.on("join-live-room", async ({ channelName, user, role }) => {
    socket.join(channelName);

    io.to(channelName).emit("user-joined", {
      user,
      role, // host | cohost | audience
    });

    // Store channel on socket (important for disconnect)
    socket.channelName = channelName;
    socket.userId = user?._id;

    // Increase viewers count
    const stream = await LiveStream.findOneAndUpdate(
      { channelName, status: "live" },
      { $inc: { viewers_count: 1 } },
      { new: true }
    );

    if (!stream) return;

    // Notify everyone
    io.to(channelName).emit("viewer-count-updated", {
      viewers: stream.viewers_count,
    });

    // Broadcast to all users in the room that a new user joined
    /*   socket.to(channelName).emit("new-message", {
       system: true,
       text: `${user.name} joined the room`,
       timestamp: new Date(),
     });  */
    console.log("👤 Joined:", user?.name, "Viewers:", stream.viewers_count);
    //console.log(`Audience ${user.name} joined ${channelName} as ${role}`);
  });

  //Send Live Chat Message (ALL USERS)
  socket.on("send-live-message", ({ channelName, message }) => {
    const payload = {
      ...message,
      createdAt: new Date(),
    };

    io.to(channelName).emit("live-message", payload);
  });

  //Request to Become Co-Host from Audience screen
  socket.on("request-cohost", ({ channelName, user }) => {
    io.to(channelName).emit("cohost-request", user);
    console.log('-request -cohost ', channelName, JSON.stringify(user))
  });
  //Host Accepts Co-Host from hoster screen
  socket.on("accept-cohost", ({ channelName, user }) => {
    io.to(channelName).emit("cohost-approved", user);
    console.log('-accept -cohost ', channelName, JSON.stringify(user))
  });

  socket.on("send-gift", async ({ channelName, senderId, giftId }) => {
    console.log('....send gift....', channelName, '...senderId...' + senderId + '...giftid... ' + giftId)
    try {
      const sender = await User.findById(senderId);
      const liveStream = await LiveStream.findOne({ channelName, status: "live" });
      const gift = await GiftModal.findById(giftId);

      if (!sender || !gift || !liveStream) {
        console.log('Invalid gift request')
        socket.emit("gift-error", { message: "Invalid gift request" });
        return;
      }
      console.log('git coins.... ', gift.coinCost)
      const giftCoins = Number(gift.coinCost); // ✅ force number

      if (isNaN(giftCoins)) {
        console.log('Invalid gift coin value')

        socket.emit("gift-error", { message: "Invalid gift coin value" });
        return;
      }

      /*
        Debit conditionally rather than read-modify-write: matching on
        `coins: { $gte: cost }` and decrementing in the same operation means two
        gifts fired at once cannot both pass the check and overdraw the wallet.
        A zero match means they could not afford it and nothing has moved.
      */
      const debit = await User.updateOne(
        { _id: sender._id, coins: { $gte: giftCoins } },
        { $inc: { coins: -giftCoins } }
      );
      if (debit.matchedCount === 0) {
        console.log('Not enough coins');
        socket.emit("gift-error", { message: "Not enough coins" });
        return;
      }

      await User.updateOne({ _id: liveStream.hoster }, { $inc: { coins: giftCoins } });
      // Keep the stream's running total in step with the REST gift path.
      await LiveStream.updateOne(
        { _id: liveStream._id },
        { $inc: { gift_coins: giftCoins, coins: giftCoins } }
      );

      const host = await User.findById(liveStream.hoster);
      sender.coins -= giftCoins;

      const logdata = {
        sender: sender._id,
        receiver: host._id,
        gift: gift._id,
        channelName,
        coins: giftCoins
      };
      console.log('-----log data-----', logdata)
      // Save transaction
      const tx = await GiftTransaction.create({
        sender: sender._id,
        receiver: host._id,
        gift: gift._id,
        channelName,
        coins: giftCoins,
      });

      console.log("✅ GiftTransaction saved:", tx._id);

      // Notify room
      io.to(channelName).emit("gift-received", {
        gift,
        sender: { _id: sender._id, name: sender.name },
        totalCoins: host.coins,
      });

      // Notify individuals
      socket.emit("coins-updated", { coins: sender.coins });
      io.to(channelName).emit("host-coins-updated", { coins: host.coins });

    } catch (err) {
      console.error("Gift Error:", err);
      socket.emit("gift-error", { message: "Gift failed" });
    }
  });

  //End Live Room (Host Only)
  socket.on("end-live-room", ({ channelName }) => {
    io.to(channelName).emit("live-ended");
  });
  /* End Live room */


  markOnline(userId, socket.id);
  io.emit("onlineUsers", onlineList());
  console.log('online user' + onlineList())

  /*
    Answer "who is online right now?" on demand.

    The roster was broadcast on connect and on disconnect and at no other time,
    so a screen only ever learned it by being mounted at the exact moment
    somebody else's connection changed. Open a chat while both people are
    already connected and nothing arrives — the header renders its default and
    says "Offline" about someone sitting in the app. The client asks on mount
    and on every reconnect; this replies to that socket alone.
  */
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", onlineList());
  });


/*   socket.on("getConversations", async (uid) => {
    console.log('....getConversations...here.....', uid)
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
      //  console.log('....data....', JSON.stringify(all))
      socket.emit("conversations", all);
    } catch (err) {
      console.error("Error in getConversations:", err);
      socket.emit("conversations", []);
    }
  }); */
socket.on("getGroupConversations", async (uid) => {
  console.log("....getConversations...here.....", uid);
  if(!uid)
  {
    console.log('UID NOt Found');
    return
  }
  try {
    // --- GROUP (FIXED) ---
    const groupIds = await GroupChat
      .find({ members: uid })
      .distinct("_id");

    const groupConvos = await ConversationModel.find({
      type: "group",
      group: { $in: groupIds },
    })
      .populate({
        path: "group",
        select: "groupName groupimage members",
      })
      .populate("messages");

    const groupResults = groupConvos.map((c) => {
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

    const all = [...groupResults].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    console.log("socket group conversations:", all);
    socket.emit("conversations", all);
  } catch (err) {
    console.error("Error in getConversations:", err);
    socket.emit("conversations", []);
  }
});


socket.on("getConversations", async (uid) => {
  console.log("....getConversations...here.....", uid);
  if(!uid)
  {
    console.log('UID NOt Found');
    return
  }
  try {
    // --- PRIVATE ---
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

    // --- GROUP (FIXED) ---
    const groupIds = await GroupChat
      .find({ members: new mongoose.Types.ObjectId(uid) })
      .distinct("_id");

    const groupConvos = await ConversationModel.find({
      type: "group",
      group: { $in: groupIds },
    })
      .populate({
        path: "group",
        select: "groupName groupimage members",
      })
      .populate("messages");

    const groupResults = groupConvos.map((c) => {
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
   // console.log("socket conversations:", all);
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
        }).populate(visibleTo(me));   // per-user deletes stay deleted here too

        messages = convo?.messages || [];

      } else if (type === "group") {
        const convo = await ConversationModel.findOne({
          type: "group",
          group: convoId, // convoId is the group ID (or conversation ID for group)
        }).populate(visibleTo(me));

        messages = convo?.messages || [];
      }

      socket.emit("messages", messages);
    } catch (err) {
      console.error("getMessages error:", err);
      socket.emit("messages", []); // fallback on error
    }
  });

 
 
 socket.on("sendMessage", async (data, callback) => {
  await handleSendMessage(io, socket, data, callback);
  // Notify a recipient who is not connected; a connected one already has it.
  await notifyOfflineMessage(data);
}); 

  //this is working for tracking offline and online
  socket.on("messageDelivered", async ({ messageId, userId }) => {
    await MessageModel.updateOne(
      { _id: messageId },
      {
        $addToSet: { deliveredTo: userId }
      }
    );
    const msg = await MessageModel.findById(messageId);
   // console.log('...message Delivered', msg)
    // Notify sender
    io.to(msg.msgByUserId.toString()).emit("messageDeliveredUpdate", {
      messageId,
      userId,
    });
  });


  socket.on("seenMessages", async ({ me, partner }) => {
    console.log("message seen");
    const convo = await ConversationModel.findOne({
      $or: [
        { sender: me, receiver: partner },
        { sender: partner, receiver: me },
      ],
    });

    if (!convo) return;

    const unseenMsgs = await MessageModel.find({
      _id: { $in: convo.messages },
      msgByUserId: partner,   // only partner's messages
      seenBy: { $ne: me },    // not already seen by me
    });

    const ids = unseenMsgs.map(m => m._id);

    if (ids.length === 0) return; // avoid empty update

    await MessageModel.updateMany(
      { _id: { $in: ids } },
      {
        $set: { seen: true },
        $addToSet: { seenBy: me }
      }
    );

    // Notify both users
    [me, partner].forEach(uid => {
      io.to(uid.toString()).emit("messagesSeen", {
        messageIds: ids,
        partner,
      });
    });
  });



  /*
    Typing indicators.

    `to` is a person's id in a one-to-one chat and a group's id in a group one,
    and only people have a room of their own — everyone joins `socket.join(userId)`
    on connect, nobody joins a group id. Relaying blind to `io.to(to)` therefore
    worked for direct messages and silently went nowhere for groups. A group is
    fanned out to its members' personal rooms, which is how messageHandler
    already delivers group messages.

    `from` comes off the handshake, not the payload: it is the one identity this
    socket has actually proved, and taking it from the body would let any client
    put "typing…" under somebody else's name.

    The sender is skipped so a group does not show you your own indicator.
  */
  const relayTyping = async (event, to) => {
    if (!to || !userId) return;

    const group = await GroupChat.findById(to).select("members").lean().catch(() => null);

    if (group) {
      (group.members || []).forEach((member) => {
        const room = String(member);
        if (room !== String(userId)) io.to(room).emit(event, { from: userId, groupId: String(to) });
      });
      return;
    }

    io.to(String(to)).emit(event, { from: userId });
  };

  socket.on("typing", ({ to }) => { relayTyping("typing", to); });
  socket.on("stopTyping", ({ to }) => { relayTyping("stopTyping", to); });

  socket.on("disconnect", async () => {
    // Per-socket, so closing a live stream's socket does not report someone
    // offline while their chat socket is still open. See helpers/presence.js.
    markOffline(userId, socket.id);
    io.emit("onlineUsers", onlineList());

    //update live stream when discount its will update also db
    const channelName = socket.channelName;
    if (!channelName) return;
    const stream = await LiveStream.findOneAndUpdate(
      { channelName, status: "live" },
      { $inc: { viewers_count: -1 } },
      { new: true }
    );
    if (!stream) return;
    io.to(channelName).emit("viewer-count-updated", {
      viewers: Math.max(stream.viewers_count, 0),
    });
    console.log("👋 Left channel:", channelName);
    //end
  });

});

/* ------------------------------------------------------------------ */
/* Error handling — must be last, after every route is mounted.         */
/* ------------------------------------------------------------------ */

/*
  404 for an API path that matched no route. Without it these fall through to
  Express's HTML "Cannot POST /apis/typo" page, which a JSON client cannot read.
*/
app.use("/apis", (req, res) => {
  res.status(404).json({ success: false, message: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

/*
  Anything a route throws lands here.

  Without this, Express falls back to its own handler, which serves the stack
  trace to the client whenever NODE_ENV is not "production" — and NODE_ENV has
  never been set on this server. So every unhandled throw was publishing file
  paths and internals to whoever triggered it.

  Multer failures are translated rather than passed through, because "file too
  large" and "unsupported type" are things the person uploading can act on,
  and a 500 tells them nothing.
*/
// eslint-disable-next-line no-unused-vars -- Express needs all four parameters
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "That file is too large (100MB maximum)" });
  }
  if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ success: false, message: "Too many files in one upload" });
  }
  if (typeof err?.message === "string" && err.message.startsWith("Unsupported file type")) {
    return res.status(415).json({ success: false, message: err.message });
  }

  const status = err?.status || err?.statusCode || 500;

  // The full error goes to the log, where it is useful; the client gets a
  // description and nothing about how the server is built.
  console.error("[unhandled]", req.method, req.originalUrl, err);

  res.status(status).json({
    success: false,
    message: status === 500 && isProduction ? "Something went wrong" : (err?.message || "Something went wrong"),
  });
});

// Do NOT use `app.listen()` in a serverless environment
//local pc only port dont use for vercel
//const PORT = process.env.PORT || 3000; //online server
const PORT = process.env.PORT || 5000; // local server

server.listen(PORT, () => {
  console.log("🚀 Server + Socket running on port " + PORT);
});

//npm install ngrok
//const ngrok = require('ngrok');

export default app;
