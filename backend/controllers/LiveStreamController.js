import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import pkg from 'agora-access-token';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const { RtcTokenBuilder, RtcRole } = pkg;
import LiveStream from "../models/LiveStream.js";
import GiftModal from "../models/GiftModal.js";
import DepositStream from '../models/DepositBalanceModal.js';
import Transaction from '../models/Transaction.js';
import CoinPurchase from '../models/CoinPurchase.js';
import { getIO } from "../socket/socket.js";
// livestream.controller.js
// Put these in your .env file!
const APP_ID = "141ea750fc7847129f58316d5c4f6b79";
const APP_CERTIFICATE = "05b116941e164bdd8dbdd99cd01b3deb";
import { notifyHostCohostRequest } from "../helpers/liveStreamSocket.js";
import Stripe from 'stripe';
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
import { upload } from "../middleware/imageHelper.js"; // multer setup
import PropertyAds from "../models/PropertyAds.js";





export const createLiveStream = async (req, res) => {
  try {
    const {
      hostId,
      streamUrl,
      thumbnail,
      title,
      location,
      coins,
      channelName,
    } = req.body;

    /* -------------------- 1. END EXISTING STREAM (IF ANY) -------------------- */
    const existingActiveStream = await LiveStream.findOne({
      hoster: hostId,
      status: "live",
    });

    if (existingActiveStream) {
      await LiveStream.updateOne(
        { _id: existingActiveStream._id },
        {
          $set: {
            status: "ended",
            endedAt: new Date(),
          },
        }
      );
    }

    /* -------------------- 2. GENERATE AGORA TOKEN -------------------- */
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs =
      currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    /* -------------------- 3. CREATE NEW LIVE STREAM -------------------- */
    const newStream = new LiveStream({
      hoster: hostId,
      channelName,
      stream_url: streamUrl || "",
      thumbnail:
        thumbnail || "https://example.com/default-thumbnail.jpg",
      title: title || "Live Stream",
      location: location || "Unknown",
      coins: Number(coins) || 0,
      status: "live",
      enteredby: new Date(),
    });

    await newStream.save();

    /* -------------------- 4. RESPONSE -------------------- */
    return res.status(201).json({
      success: true,
      message: existingActiveStream
        ? "Previous live stream ended. New stream started."
        : "Live stream created successfully",
      data: newStream,
      token,
    });
  } catch (error) {
    console.error("Create Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const createLiveStream_off = async (req, res) => {
  try {
    const { hostId, streamUrl, thumbnail, title, location, coins, channelName } = req.body;
    // --- VALIDATION START ---
    // Check if this host already has an active live stream
    const existingActiveStream = await LiveStream.findOne({
      hoster: hostId,
      status: 'live'
    });

    if (existingActiveStream) {

      return res.status(400).json({
        success: false,
        message: 'You already have an active live stream. Please end your current stream before starting a new one.',
        existingStreamId: existingActiveStream._id
      });
    }
    // --- VALIDATION END ---   
    // 1. Generate the token for the Host
    const uid = 0; // 0 allows Agora to manage the UID
    const role = RtcRole.PUBLISHER; // Host is a publisher
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    const newStream = new LiveStream({
      hoster: hostId,
      channelName: channelName,
      stream_url: streamUrl || '',
      thumbnail: thumbnail || 'https://example.com/default-thumbnail.jpg',
      title: title || 'Live Stream',
      location: location || 'Unknown',
      coins: Number(coins) || 0,
      status: 'live',
      enteredby: new Date(),
    });

    await newStream.save();

    // Return both the stream data AND the token
    return res.status(201).json({
      success: true,
      message: 'Live stream created successfully',
      data: newStream,
      token: token // Host uses this to join
    });
  } catch (error) {
    console.error('Create Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLiveStream = async (req, res) => {
  try {
    const { hostId, channelName, status } = req.body;

    if (!hostId) {
      return res.status(400).json({ success: false, message: "hostId is required" });
    }
    // Find the stream by hostId
    const stream = await LiveStream.findOne({ hoster: hostId, channelName: channelName, status: 'live' });
    if (!stream) {
      return res.status(404).json({ success: false, message: "No live stream found for this host" });
    }
    // Update only channelName and status
    if (channelName) stream.channelName = channelName;
    if (status) {
      stream.status = status;
      if (status === "ended") {
        stream.endedAt = new Date();
      }
    }

    await stream.save();

    return res.status(200).json({
      success: true,
      message: "Live stream updated successfully",
      data: stream,
    });
  } catch (error) {
    console.error("LiveStream update error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};



export const requestCohost = async (req, res) => {
  /* 
{  
"streamId": "6952777dfc7e0555139e05b1",
"hosterId": "694af87aa5c0c87279aef89a",
"userId": "69515ced7a9375ac2e5d4e40"
}    
  */
  // streamId -id
  const { streamId, userId, hosterId, channelName } = req.body;
  const stream = await LiveStream.findById(streamId);
  if (!stream) {
    return res.status(404).json({ success: false, message: "Stream not found" });
  }
  // Prevent duplicate request
  const alreadyRequested = stream.cohoster.some(
    c => c.user.toString() === userId
  );
  if (alreadyRequested) {
    return res.status(400).json({ success: false, message: "Request already sent" });
  }
  stream.cohoster.push({
    user: userId,
    status: "requested"
  });
  await stream.save();
  // console.log('...stream....', JSON.stringify(stream))
  /* 
   cohoster: [
    {
      user: new ObjectId('69513f047a9375ac2e5c61ee'),
      micOn: true,
      videoOn: true,
      status: 'requested',
      _id: new ObjectId('695430f3c171664585dd1fe0')
    }
  ],
  */
  //hostId, stream, fromUserId
  //notifyHostCohostRequest(hosterId, streamId, userId, channelName);
  // console.log('...hoster.....', stream);
  // 🔔 Notify host (Socket / Firebase / OneSignal)
  //notifyHost(stream.hoster, "New co-host request"); // here add Socket notification to frontend

  res.json({ success: true, message: "Co-host request sent" });
};



export const getStream = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    // Ensure the User model is registered (Safety check for Populate)
    // If your User model is named 'User' in its file, use that string.
    const query = {
      status: 'live',
      ...(search && { title: { $regex: search, $options: 'i' } })
    };

    const liveStreams = await LiveStream.find(query)
      .populate({
        path: 'hoster',
        select: 'name firstname lastname image' // Fields from User model
      }) // why users match userid name, firstname lastname image not comming
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ enteredby: -1 });

    // Filter out any streams where hoster might be null (deleted users)
    const activeStreams = liveStreams.filter(stream => stream.hoster);

    if (activeStreams.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No live stream found"
      });
    }

    const total = await LiveStream.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: activeStreams,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// NEW: Add this to your routes so Audience can get a token for a specific channel
export const getAudienceToken = async (req, res) => {
  try {
    const { channelName } = req.query;
    if (!channelName) return res.status(400).json({ message: "Channel name required" });

    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      0,
      RtcRole.SUBSCRIBER, // Audience is a subscriber
      privilegeExpiredTs
    );
    const query = {
      channelName: channelName
    };
    const liveStreams = await LiveStream.find(query);

    res.json({ success: true, token, hosterinfo: liveStreams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addGift = async (req, res) => {
  try {
    const { groupname, name, coinCost } = req.body;

    // 1️⃣ Validation
    if (!name) {
      return res.status(400).json({ message: "Gift name is required" });
    }

    // 2️⃣ Duplicate check
    const existingGift = await GiftModal.findOne({ name });
    if (existingGift) {
      return res.status(409).json({ message: "Gift name already exists" });
    }

    // 3️⃣ Check if image uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // 4️⃣ Optimize image
    const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const webpFile = `gift_${Date.now()}_${baseName}.webp`;
    const outputPath = path.join("uploads/gifts", webpFile);

    await sharp(req.file.path)
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Delete original file
    fs.unlinkSync(req.file.path);

    // 5️⃣ Create gift
    const gift = await GiftModal.create({
      groupname,
      name,
      coinCost,
      icon: `/uploads/gifts/${webpFile}`, // use optimized path
    });

    console.log("✅ IMAGE RECEIVED:", webpFile);

    // 6️⃣ Return response
    return res.status(201).json({
      success: true,
      message: "Gift added successfully",
      data: gift,
    });
  } catch (error) {
    console.error("Add gift error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const updateGift = async (req, res) => {
  try {
  //  console.log("BODY:", req.body);
  //  console.log("FILE:", req.file);
    const { id } = req.params;
    const { groupname, name, coinCost } = req.body;
    if (!req.file) 
    {
      return res.status(400).json({ message: "Image file is required" });
    }
    if (!name) {
      return res.status(400).json({ message: "Gift name is required" });
    }
    const gift = await GiftModal.findById(id);
    if (!gift) {
      return res.status(404).json({ message: "Gift not found" });
    }
    console.log("BEFORE UPDATE ICON:", gift.icon);
    gift.groupname = groupname ?? gift.groupname;
    gift.name = name;
    gift.coinCost = coinCost ?? gift.coinCost;
    if (req.file) 
    {
      console.log("✅ IMAGE RECEIVED:", req.file.filename);
      const baseName = path.basename(
        req.file.originalname,
        path.extname(req.file.originalname)
      );
      const webpFile = `gift_${Date.now()}_${baseName}.webp`;
      const outputPath = path.join("uploads/gifts", webpFile);
      await sharp(req.file.path)
        .resize(400, 400, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(outputPath);
      fs.unlinkSync(req.file.path);
      gift.icon = `/uploads/gifts/${webpFile}`;
      console.log("UPDATED ICON PATH:", gift.icon);
    } else {
      console.log("❌ NO IMAGE RECEIVED");
    }
    await gift.save();
    const updatedGift = await GiftModal.findById(id);
    console.log("AFTER SAVE ICON:", updatedGift.icon);
    return res.json({
      message: "Gift updated successfully",
      data: updatedGift,
    });

  } catch (error) {
    console.error("Update gift error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


export const getGifts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = {
      ...(search && { groupname: { $regex: search, $options: 'i' } })
    };

    const liveStreams = await GiftModal.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ enteredby: -1 });

    const total = await GiftModal.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: liveStreams,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const AddDepost = async (req, res) => {
  try {
    const { priceAED, coins, status, currency } = req.body;

    const deposit = new DepositStream({
      priceAED,
      coins,
      status,currency
    });

    await deposit.save();

    res.status(201).json({
      success: true,
      message: 'Deposit item added successfully',
      data: deposit,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const updateDepost = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedDeposit = await DepositStream.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedDeposit) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Deposit item updated',
      data: updatedDeposit,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export const listDepost = async (req, res) => {
  const { userid } = req.query; // ✅ FIX

  try {
    const deposits = await DepositStream.find({ status: 'active' })
      .sort({ priceAED: 1 });

    const userdata = await User.findById(userid); // cleaner

    res.json({
      success: true,
      count: deposits.length,
      data: deposits,
      userdata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/*
  Start a coin purchase.

  It used to take `amount` straight from the request body and open a Stripe
  intent for whatever the client asked for, with no record of who was buying or
  what they were buying. That made the credit step unverifiable: nothing tied an
  intent to a user or a package, so the only thing left to trust was the client.

  Now the price comes from the package, and the intent carries `userId` and
  `packageId` in its metadata. walletAdd reads that metadata back out of Stripe,
  which is what makes crediting safe.
*/
export const createPayment = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Sign in to buy coins' });

    const { packageId } = req.body || {};
    if (!packageId) {
      return res.status(400).json({
        message: 'A packageId is required. Call GET /apis/monetisation/packages for the list.',
      });
    }

    const pack = await DepositStream.findById(packageId).lean();
    if (!pack || pack.status !== 'active') {
      return res.status(404).json({ message: 'That coin package is not available' });
    }

    // Stripe charges in the smallest currency unit.
    const amount = Math.round(Number(pack.priceAED) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({ message: 'That package has no valid price' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: (pack.currency || 'usd').toLowerCase(),
      payment_method_types: ['card'],
      metadata: { userId: String(userId), packageId: String(pack._id) },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: (pack.currency || 'usd').toLowerCase(),
      coins: pack.coins,
    });
  } catch (err) {
    console.error('createPayment:', err);
    if (err?.type === 'StripeInvalidRequestError') {
      return res.status(422).json({ message: `That package cannot be charged: ${err.message}` });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/*
  Credit the coins for a purchase Stripe agrees actually happened.

  What this used to do: read `userId`, `amount` and `paymentStatus` from the
  request body, look up a package whose price matched the claimed amount, and
  add its coins to whichever account the body named. Every one of those inputs
  came from the caller, so any signed-in user could mint coins — for themselves
  or for somebody else — by posting a number. It survived only because
  `depositscoins` was empty and the package lookup always missed; the moment a
  package existed it was live.

  It now verifies the same four things confirmPurchase does, and for the same
  reasons:
    - the intent really succeeded, per Stripe rather than per the client
    - it belongs to the caller, per the metadata Stripe holds
    - the amount paid matches the package being claimed
    - it has not already been credited

  The last is enforced by the unique index on CoinPurchase.paymentIntentId
  rather than a lookup, because two confirmations racing would both pass a
  lookup. Sharing that collection with confirmPurchase is deliberate: it means
  the two routes cannot be played against each other to credit one payment
  twice.

  The legacy Transaction row is still written, because the admin panel's
  transactions list reads it.
*/
export const walletAdd = async (req, res) => {
  try {
    // The caller, from their token. Never from the body — that was the hole.
    const userId = req.user?.userId || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Sign in to buy coins' });

    const { paymentIntentId, paymentType } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'A paymentIntentId is required. Pay first with POST /apis/live/createPayment.',
      });
    }

    let intent;
    try {
      intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
    } catch {
      return res.status(404).json({ message: 'That payment could not be found' });
    }

    if (intent.status !== 'succeeded') {
      return res.status(402).json({ message: `That payment has not completed (status: ${intent.status})` });
    }
    if (String(intent.metadata?.userId || '') !== String(userId)) {
      return res.status(403).json({ message: 'That payment belongs to someone else' });
    }

    const pack = await DepositStream.findById(intent.metadata?.packageId).lean();
    if (!pack) {
      return res.status(404).json({ message: 'The package for that payment no longer exists' });
    }

    const expected = Math.round(Number(pack.priceAED) * 100);
    if (Number(intent.amount_received) !== expected) {
      return res.status(422).json({ message: 'The amount paid does not match that package' });
    }

    try {
      await CoinPurchase.create({
        user: userId,
        package: pack._id,
        paymentIntentId: intent.id,
        coins: pack.coins,
        amount: intent.amount_received,
        currency: intent.currency,
      });
    } catch (err) {
      // Duplicate key: this intent has already been credited.
      if (err?.code === 11000) {
        const me = await User.findById(userId).select('coins').lean();
        return res.status(409).json({
          message: 'That payment has already been credited',
          newCoinBalance: me?.coins || 0,
        });
      }
      throw err;
    }

    const transaction = await Transaction.create({
      userId,
      paymentType: paymentType || 'card',
      currency: (intent.currency || 'usd').toUpperCase(),
      amount: intent.amount_received / 100,
      coins: pack.coins,
      paymentStatus: 'approved',
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: pack.coins } },
      { new: true, select: 'coins' }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(201).json({
      message: 'Transaction saved and wallet updated',
      transaction,
      newCoinBalance: user.coins,
    });
  } catch (err) {
    console.error('Error saving transaction:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


export const paymentBuysell = async (req, res) => {

  /* 
  {
  id: '6964e81cebae6d0c6aa5a24e',
  userId: '694af87aa5c0c87279aef89a',
  paymentType: 'googlepay',
  currency: 'USD',
  amount: 116550,
  paymentStatus: 'approved'
}
  */
  try {
    const {
      paymentType,
      currency,
      amount,
      paymentStatus,
      id,          // Property ad ID (your custom id field)
      packageid,   // Package ID
    } = req.body;

    /*
      The buyer is the caller, taken from their token. It used to come from the
      request body, which let one signed-in account file a payment against
      another. Note that this route still trusts the client for the amount and
      the payment status, so an ad can be activated without a verified payment —
      it needs the same paymentIntentId treatment walletAdd now has.
    */
    const userId = req.user?.userId || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Sign in to pay' });

    // 1️⃣ Validation
    if (!paymentType || !currency || !amount || !id || !packageid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 2️⃣ Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3️⃣ Convert amount (cents → main currency)
    const realAmount = amount / 100;

    // 4️⃣ Find Property Ad
    const property = await PropertyAds.findOne({ _id: id });
    if (!property) {
      return res.status(404).json({ message: 'Property ad not found' });
    }

    // 5️⃣ Create payment object (matches paymentSchema)
    const paymentData = {
      userid: userId,
      packageid: packageid,
      details: {
        paymentType,
        currency,
        amount: realAmount,
        paymentStatus,
      },
      timestamp: new Date(),
    };

    // 6️⃣ Push into payment array
    property.payment.push(paymentData);

    // Optional: activate ad after payment
    property.status = 'active';

    // 7️⃣ Save
    await property.save();

    return res.status(201).json({
      message: 'Payment saved successfully',
      payment: paymentData,
    });

  } catch (err) {
    console.error('Error saving payment:', err);
    return res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
};






