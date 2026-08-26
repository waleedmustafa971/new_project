import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import User from "../models/users.js"; // import model user
import Otptbl from "../models/OtpModal.js"; 
import Music from '../models/Music.js';
import Reels from '../models/Reels.js';
import { NOT_DELETED } from '../helpers/feed.js';
import multer from "multer";
import AWS from 'aws-sdk';
import crypto from 'crypto';
//import { uploadSingle } from "../middleware/multerConfig.js"; // Import multer setup
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from "dotenv";
import { upload } from "../middleware/imageHelper.js"; // multer setup
import { statusOf } from "../helpers/accountStatus.js";
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

/*
  Every session in this file is minted through issueSession(), which is where
  the two-factor gate lives. Signing a token pair directly bypasses it — see
  helpers/session.js for why that mattered across ten separate functions.
*/
import { issueSession, twoFactorPending, refreshPredatesTwoFactor } from "../helpers/session.js";


console.log('Bucket Name:', process.env.S3_BUCKET_NAME);

const uploadDir = path.join("uploads", "profile");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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


export const Googlecheck = async (req, res) => {
  // console.log("......json....", req.body);
  // console.log("JWT_SECRET:", process.env.SECRET_KEY);
  try {
    const { email, securitycode } = req.body;
    console.log("......json..email..", email);

    /*  if (!email) {
       return res.status(400).json({ message: "email is required" });
     }
  */
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Invalid info" });
    }

    // Signing in with Google is not a second factor — it hands an existing
    // account a full session, so it passes the same gate /login does.
    const session = await issueSession(user, {
      payload: { userId: user._id, email: user.email },
      expiresIn: "1h", req, method: "google",
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const { token, refreshToken } = session;

    /*  const token = jwt.sign(
       { userId: user._id, email: user.email },
       process.env.JWT_SECRET,
       { expiresIn: "1h" }
     );
 
     const refreshToken = jwt.sign(
       { userId: user._id, email: user.email },
       process.env.JWT_REFRESH_SECRET,
       { expiresIn: "7d" }
     ); */

    return res.status(200).json({
      message: "User verified successfully",
      token,
      refreshToken,
      usersdata: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const Googlesignin = async (req, res) => {
  console.log('body...Googlesignin....' + JSON.stringify(req.body))
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(201).json({ message: "name, email is required" });
    }
    const password = "!@HGs6723232";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists

    const existingUseremail = await User.findOne({ email: email });
    if (existingUseremail) {
      console.log({ message: "email is already used" });

      // Google sign-in returns an existing account straight into a session,
      // so it needs the same moderation check the password path does.
      const standing = await statusOf(existingUseremail);
      if (!standing.allowed) {
        return res.status(standing.code).json({
          message: standing.reason,
          accountStatus: standing.status,
          suspendedUntil: standing.suspendedUntil,
        });
      }

      const session = await issueSession(existingUseremail, {
        payload: { userId: existingUseremail._id, email: existingUseremail.email },
        expiresIn: "1h", req, method: "google",
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
      const { token, refreshToken } = session;
      console.log({ message: "email already exits", token, refreshToken, usersdata: existingUseremail })
      return res
        .status(201)
        .json({ message: "User registered successfully", token, refreshToken, usersdata: existingUseremail });

      //  return res.status(201).json({ message: "email is already used" });

    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      emailverify: 'Verify',
      regtype: 'email',
      regby: "google"
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // A just-created account cannot have 2FA on, so the gate is a no-op here —
    // routed through it anyway so no session in this file skips the check.
    const session = await issueSession(user, {
      payload: { userId: newUser._id, email: newUser.mobileno },
      expiresIn: "1h",
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const { token, refreshToken } = session;
    console.log({ message: "User registered successfully", token, refreshToken, usersdata: user })
    return res
      .status(201)
      .json({ message: "User registered successfully", token, refreshToken, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }

}


export const reg = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  // 1️⃣ Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already in use" });
  }

  // 2️⃣ Create new user and save to database
  const newUser = new User({ name, email, password });
  await newUser.save();

  return res
    .status(201)
    .json({ message: "User registered successfully", user: newUser });
  /*   
  res.status(200).json({
      message: "Form-data received successfully!",
      data: { name, email, password }
  });
 */
};

export const registerMobile_off = async (req, res) => {

  try {
    const { name, email, password, mobileno, otpcode, type } = req.body;
    console.log('body....' + JSON.stringify(req.body))
    if (!mobileno || !password || !otpcode) {
      return res.status(201).json({ message: "All fields are required" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: mobileno });
    if (existingUser) {
      await reEntryotp(mobileno, otpcode); // ✅ CORRECT WAY
      const session = await issueSession(existingUser, {
        payload: { userId: existingUser._id, email: mobileno },
        expiresIn: "1h", refresh: false,
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
      return res.status(201).json({ message: "mobile no is already used", token: session.token, usersdata: existingUser });
    }
    const newUser = new Otptbl({
      name,
      email,
      password: hashedPassword,
      mobileno: mobileno,
      regtype: type,
      otpcode: otpcode,
      mobileverify: 'Not Verify',
      type: type
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    const session = await issueSession(user, {
      payload: { userId: newUser._id, email: newUser.mobileno },
      expiresIn: "1h", refresh: false,
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const token = session.token;
    return res
      .status(201)
      .json({ message: "User registered successfully", token, usersdata: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const registerMobile = async (req, res) => {
  try {
    const { name, email, password, mobileno, otpcode, type, modulewiselogin,  
      fcmtoken,
          location } = req.body;

    console.log("body...." + JSON.stringify(req.body));

    if (!mobileno || !password || !otpcode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 🔍 Check existing user
    const existingUser = await User.findOne({ mobileno });

    if (existingUser) {
      // 🔁 resend OTP
      await reEntryotp(mobileno, otpcode);

      /*
        `refresh: false` is deliberate here, unlike the registration paths.

        This runs before the OTP has been checked, so the number is unproven and
        the account is unverified. The access token is short and the caller is
        expected to come back through /verify_mobile, which mints the real pair.
        Adding a refresh token would stretch a pre-verification session to seven
        days -- the exact thing the OTP step exists to prevent. Leave it.
      */
      const session = await issueSession(existingUser, {
        payload: { userId: existingUser._id, mobileno },
        expiresIn: "1h", refresh: false,
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
      const token = session.token;

      return res.status(200).json({
        message: "Mobile already exists, OTP resent",
        token,
        usersdata: existingUser,
      });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ SAVE USER (FIXED HERE)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobileno,
      type,
      mobileverify: "Not Verify",
      modulewiselogin: modulewiselogin,
      fcm_token: fcmtoken,
      location: location
    });
    await newUser.save();
    // 📩 Save OTP
    await reEntryotp(mobileno, otpcode);
    // Pre-verification session, same as the resend branch above: short-lived
    // and deliberately not refreshable until /verify_mobile has seen the code.
    const session = await issueSession(newUser, {
      payload: { userId: newUser._id, mobileno },
      expiresIn: "1h", refresh: false,
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const token = session.token;

    return res.status(200).json({
      message: "User registered successfully, OTP sent",
      token,
      usersdata: newUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const reEntryotp = async (mobileno, otpcode) => {
  if (!mobileno || !otpcode) {
    throw new Error("mobileno and otpcode are required");
  }

  // 🧹 delete old OTP (important)
  await Otptbl.deleteMany({ mobileno });

  const otpData = new Otptbl({
    mobileno,
    otp: otpcode,
    status: "Not Verify",
    datetime: new Date(),
  });

  await otpData.save();

  return true;
};

export const verifyMobile = async (req, res) => {
  try {
    const { mobileno, otpcode } = req.body;
    if (!mobileno || !otpcode) {
      return res.status(400).json({
        message: "mobileno and otpcode are required",
      });
    }
    const otpRecord = await Otptbl.findOne({
      mobileno,
      otp: otpcode,
    });
    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }
    const user = await User.findOne({ mobileno });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    user.mobileverify = "Verify";
    await user.save();
    // 🧹 remove OTP
    await Otptbl.deleteMany({ mobileno });
    /*
      Confirming a mobile number is not the second factor either: this returns a
      session for an account that may already exist, so it goes through the gate.
    */
    const session = await issueSession(user, {
      payload: { userId: user._id, email: user.email },
      expiresIn: "10m", //1h 1h 1d
      req, method: "mobile",
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const { token, refreshToken } = session;
    // You can store refresh token in DB for extra security (optional)
    return res.status(200).json({
      message: "Mobile verified successfully",
      token,
      refreshToken,
      usersdata: user,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const registerMobileModule = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { email, password, mobileno, otpcode, type, modulename } = req.body;
    if (!mobileno || !password) {
      return res.status(201).json({ message: "All fields are required" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: mobileno });
    if (existingUser) {
      /*  const token = jwt.sign(
         { userId: existingUser._id, email: mobileno },
         SECRET_KEY,
         { expiresIn: "1h" }
       ); */
      return res.status(201).json({ message: "mobile no is already used", token: null, usersdata: null });
    }
    const newUser = new User({
      name: 'x',
      email,
      password: hashedPassword,
      mobileno: mobileno,
      regtype: type,
      otpcode: otpcode,
      mobileverify: 'Not Verify',
      type: type,
      modulename: JSON.stringify(modulename)
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // 3️⃣ Generate JWT Token
    /*  const token = jwt.sign(
       { userId: newUser._id, email: newUser.mobileno },
       SECRET_KEY,
       { expiresIn: "1h" }
     ); */
    return res
      .status(201)
      .json({ message: "User registered successfully", token: null, usersdata: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const verifyMobile_off = async (req, res) => {
  console.log("Received body OTP:", req.body);
  try {
    const { mobileno, otpcode } = req.body;
    // ✅ Validation
    if (!mobileno || !otpcode) {
      return res.status(400).json({
        message: "mobileno and otpcode are required",
      });
    }
    // ✅ Find user
    const existingUser = await User.findOne({ mobileno });
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    console.log('...existingUser....', existingUser)
    // ❗ Check OTP separately (better logic)
    if (String(existingUser.otpcode) !== String(otpcode)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }
    // ✅ Update user (verify + clear OTP)
    existingUser.mobileverify = "Verify";
    existingUser.otpcode = null; // 🔥 important (prevent reuse)
    await existingUser.save();

    // ✅ Generate token
    const session = await issueSession(existingUser, {
      payload: { userId: existingUser._id, email: existingUser.mobileno },
      expiresIn: "1h", refresh: false,
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const token = session.token;

    console.log("User verified:", existingUser);

    return res.status(200).json({
      message: "Mobile number verified",
      token,
      usersdata: existingUser,
    });

  } catch (error) {
    console.error("Error in verifyMobile:", error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};



export const updateDateofbirth = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { mobileno, dateofbirth, password, name } = req.body;
    if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
    } 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: mobileno });
    if (existingUser) {
      console.log('...mobileno...' + existingUser)
      // Update the user to mark mobile as verified
      const updatedUser = await User.findOneAndUpdate(
        { mobileno },
        { $set: { dateofbirth: dateofbirth, password: hashedPassword, name: name } },
        { new: true }
      );

      /*
        Finish signing them in.

        This step completes registration, and it returned only `usersdata` — no
        token. The app stored the user and navigated on, leaving every account
        created this way permanently half-signed-in: screens saw a user so
        nothing prompted a login, while every authenticated request answered
        401. Device-token registration was one of the casualties, which is why
        those accounts could never receive a push.

        Routed through issueSession like every other session in this file, so
        the two-factor gate is not skipped here either.
      */
      const session = await issueSession(updatedUser, {
        payload: { userId: updatedUser._id, email: updatedUser.email },
        expiresIn: "1h",
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);

      console.log("User verified:", updatedUser);
      return res.status(201).json({
        message: "birthdate updated",
        token: session.token,
        refreshToken: session.refreshToken,
        usersdata: updatedUser,
      });
    }
    else {
      return res
        .status(201)
        .json({ message: "mobile no not found", usersdata: null });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateDateofbirthbyemail = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { email, dateofbirth, password, name } = req.body;
    /*   if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
      } */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      console.log('...email...' + existingUser)
      // Update the user to mark mobile as verified
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { dateofbirth: dateofbirth, password: hashedPassword, name: name } },
        { new: true }
      );

      /*
        Finish signing them in.

        This step completes registration, and it returned only `usersdata` — no
        token. The app stored the user and navigated on, leaving every account
        created this way permanently half-signed-in: screens saw a user so
        nothing prompted a login, while every authenticated request answered
        401. Device-token registration was one of the casualties, which is why
        those accounts could never receive a push.

        Routed through issueSession like every other session in this file, so
        the two-factor gate is not skipped here either.
      */
      const session = await issueSession(updatedUser, {
        payload: { userId: updatedUser._id, email: updatedUser.email },
        expiresIn: "1h",
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);

      console.log("User verified:", updatedUser);
      return res.status(201).json({
        message: "birthdate updated",
        token: session.token,
        refreshToken: session.refreshToken,
        usersdata: updatedUser,
      });
    }
    else {
      const generateReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        mobileno: 'null',
        regtype: 'Email',
        otpcode: '',
        emailverify: 'Not Verify',
        type: 'Email',
        referralCode: generateReferralCode
      });
      await newUser.save();

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(201).json({ message: "Invalid info" });
      }
      /*
        A refresh token, not just an access token.

        This branch creates the account, so the session it hands back is the
        only one the new user has. Minted with `refresh: false` it was an access
        token alone, good for one hour — and the app's 401 handler logs you out
        outright when there is no refresh token to spend, so every account
        registered here was signed out an hour later, mid-session, with no way
        back but the login screen. `email` was reading `mobileno`, which is the
        string "null" on this path.
      */
      const session = await issueSession(user, {
        payload: { userId: newUser._id, email: newUser.email },
        expiresIn: "1h",
      });
      if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
      const token = session.token;
      return res
        .status(201)
        .json({
          message: "User registered successfully",
          token,
          refreshToken: session.refreshToken,
          usersdata: user,
        });

    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const updateInterest = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { id, interest } = req.body;
    /*   if (!mobileno || !dateofbirth || !password || !name) {
        return res.status(400).json({
          message: "All fields are required"
        });
      } */

    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ _id: id });
    if (existingUser) {
      const updatedUser = await User.findOneAndUpdate(
        { _id : id },
        { $set: { interest: interest } },
        { new: true }
      );
      return res
        .status(201)
        .json({ message: "interested updated" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};



/*
  Create an account from name, email and password.

  This threw `ReferenceError: type is not defined` on every single call: the
  branch below tested `type`, which was never destructured from the body. Past
  that it would have thrown again -- `newUser` was declared with `const` inside
  each branch, so the `newUser._id` the session was signed with did not exist in
  the scope that read it. Nothing reached the response; the endpoint answered
  500 to everybody, and always had.

  The registration the app actually uses is updateDateofbirthbyemail, which is
  why this went unnoticed. Repaired rather than deleted because two routes point
  here and the shape is the one a web or admin client would expect.

  `dateofbirth` is accepted and stored. It is not required: helpers/safety.js
  reads the date at view time and ageFrom(undefined) is null, so meetsAgeGate
  refuses -- an account created without a birthdate fails every age-restricted
  check rather than slipping past one. Taking it here is what lets a caller
  create a fully usable account in a single step.
*/
export const register = async (req, res) => {
  console.log('body....' + JSON.stringify(req.body))
  try {
    const { name, email, password, mobileno, otpcode, dateofbirth } = req.body;
    // The clients disagree on the field name: `type` here, `regtype` in the
    // app's sign-up payload. Accept either, and compare without case.
    const regKind = String(req.body.type || req.body.regtype || "").toLowerCase();

    if (!name || !email || !password) {
      return res.status(201).json({ message: "All fields are required" });
    }
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(201).json({ message: "Email already in use" });
    }

    // Create new user and save to database
    const isMobile = regKind === "mobile";
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobileno: mobileno,
      dateofbirth: dateofbirth || undefined,
      regtype: isMobile ? 'Mobile' : 'Email',
      // A mobile sign-up owes an OTP before the number counts as verified. An
      // email one has no code to send, and '0000' is the placeholder the rest
      // of this file already uses for that.
      otpcode: isMobile ? otpcode : '0000',
      ...(isMobile ? { mobileverify: 'Not Verify' } : {}),
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    // Same as updateDateofbirthbyemail above: this is where the account is
    // created, so it owes a refresh token as well as an access token. Signed
    // from `user`, the document actually read back, rather than from a
    // `newUser` that used to be out of scope by this point.
    const session = await issueSession(user, {
      payload: { userId: user._id, email: user.email },
      expiresIn: "1h",
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const token = session.token;
    return res
      .status(201)
      .json({
        message: "User registered successfully",
        token,
        refreshToken: session.refreshToken,
        usersdata: user,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(201).json({ message: "Email Address is required" });
    }
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(201).json({ message: "Email already in use" });
    }
    else {
      return res.status(201).json({ message: "Email Not Found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const checkMobile = async (req, res) => {
  console.log('body....', req.body)
  try {
    const { mobileno } = req.body;
    if (!mobileno) {
      return res.status(201).json({ message: "mobileno is required" });
    }
    // 1️⃣ Check if mobileno already exists
    const existingUser = await User.findOne({ mobileno });
    if (existingUser) {
      return res.status(201).json({ message: "mobileno already in use", userinfo: existingUser });
    }
    else {
      return res.status(201).json({ message: "mobileno not found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const welcome = (req, res) => {
  return res.json("You are not authorized");
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // A banned or suspended account must not get a session. Checked after the
    // password so the response never reveals which accounts are moderated.
    const standing = await statusOf(user);
    if (!standing.allowed) {
      return res.status(standing.code).json({
        message: standing.reason,
        accountStatus: standing.status,
        suspendedUntil: standing.suspendedUntil,
      });
    }

    /*
      Password checked and the account is in good standing — but that is only
      the first factor. If this account has 2FA on, issueSession returns a
      challenge instead of tokens and the caller must present a code.
    */
    const session = await issueSession(user, {
      payload: { userId: user._id, email: user.email },
      expiresIn: "10m", //1h 1h 1d
      // `req` turns on the sign-in record and the new-device alert.
      req, method: "password",
    });
    if (session.twoFactorRequired) {
      return twoFactorPending(res, session.challengeToken);
    }
    const { token, refreshToken } = session;

    // You can store refresh token in DB for extra security (optional)

    return res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      usersdata: user
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  console.log('...Refresh token.....' + refreshToken)
  console.log('.....JWT_SECRET....' + SECRET_KEY)
  console.log('.....JWT_REFRESH_SECRET....' + process.env.JWT_REFRESH_SECRET)

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    // Verify with the REFRESH secret
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // An account banned mid-session keeps its access token until it expires;
    // refusing the refresh is what actually ends the session.
    const standing = await statusOf(decoded.userId);
    if (!standing.allowed) {
      return res.status(standing.code).json({
        message: standing.reason,
        accountStatus: standing.status,
        suspendedUntil: standing.suspendedUntil,
      });
    }

    /*
      A refresh token issued before 2FA was switched on must not keep minting
      sessions. It lives for seven days, so without this check, turning 2FA on
      protects nothing for a week — the attacker holding an older refresh token
      simply keeps refreshing past the factor.
    */
    const holder = await User.findById(decoded.userId).select("twoFactor.enabled twoFactor.enabledAt").lean();
    if (refreshPredatesTwoFactor(decoded, holder)) {
      return res.status(401).json({
        message: "Two-factor authentication was enabled after this session started. Please sign in again.",
        reauthenticate: true,
      });
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, mfa: decoded.mfa === true },
      SECRET_KEY,
      { expiresIn: "15m" }
    );

    res.json({ token: newAccessToken });

  } catch (err) {
    console.error("Refresh token error:", err.message);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const verifyToken = (req, res, next) => {
  res.status(200).json({
    valid: true,
    user: req.user
  });
};

// API to Handle Image Upload
export const editProfile = async (req, res) => {
  //  if (err) return res.status(500).json({ error: err.message });
  try {
    const { name, email, bio, id, mobileno } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      { _id: id },
      { name, email, bio, mobileno },
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// API to Handle Image Upload
export const updateProfileImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const { email } = req.body;
      const imageUrl = `/profilepicture/${req.file.filename}`;

      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { image: imageUrl } },
        { new: true }
      );

      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });

      res.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

export const updatePassword = async (req, res) => {
  const { password, email } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  if (!password || !email) {
    return res.status(400).json({
      message: "Password, email are required.",
    });
  }
  console.log('....json.....' + JSON.stringify(req.body))
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email }, // Find user by mobile number
      {
        $set: { password: hashedPassword }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const relstateProfile = async (req, res) => {
  const { firstname, lastname, dateofbirth, gender, email } = req.body;
  console.log('....json.....' + JSON.stringify(req.body))

  // Validation
  if (!firstname || !lastname || !dateofbirth || !gender || !email) {
    return res.status(400).json({
      message: "firstname, lastname, dateofbirth, gender, and email are required.",
    });
  }
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email }, // Find user by mobile number
      {
        $set: { firstname, dateofbirth, lastname, gender }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const updateByMobile = async (req, res) => {
  const { name, dateofbirth, email, password, mobileno, bio } = req.body;

  if (!mobileno || !email || !password) {
    return res
      .status(400)
      .json({ message: "Mobile No, email, and password are required." });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { mobileno }, // Find user by mobile number
      {
        $set: { name, dateofbirth, email, password, bio }, // Update fields
      },
      { new: true } // Return updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfileid = async (req, res) => {
  const { userid } = req.query; // Get email from request query params
  console.log('.....userid.....', userid)
  if (!userid) {
    return res.status(400).json({ message: "userid is required." });
  }

  try {
    // Find user by email and populate followers & following
    const user = await User.findOne({ _id: userid })
      .populate("followers", "name email") // Fetch followers data
      .populate("following", "name email"); // Fetch following data

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Count followers & following
    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    // Send response
    res.json({
      message: "User profile fetched successfully",
      user: {
        _id: user._id,
        image: user.image,
        name: user.name,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobileno: user.mobileno,
        status: user.status,
        dateofbirth: user.dateofbirth,
        bio: user.bio,
        nationality: user.nationality,
        gender: user.gender,
        type: user.type,
        image: user.image,
        onlinestatus: user.onlinestatus,
        enteredby: user.enteredby,
        updateby: user.updateby,
        xtime: user.xtime,
        gallery: user.gallery,
        address: user.address,
        followersCount,
        followingCount,
        coins: user.coins,
        // Social Media module: blue tick + privacy state
        verifiedBadge: !!user.verifiedBadge,
        accountType: user.accountType || "personal",
        privacy: user.privacy || "public",
        pendingFollowRequests: (user.followRequests || []).length,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }

}

export const getProfile = async (req, res) => {
  // const { email } = req.query; // Get email from request query params
  const { id } = req.query; // Get email from request query params
  console.log('.....id.....', id)
  if (!id) {
    return res.status(400).json({ message: "id is required." });
  }

  try {
    // Find user by email and populate followers & following
    const user = await User.findOne({ _id: id })
      .populate("followers", "name email") // Fetch followers data
      .populate("following", "name email"); // Fetch following data

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Count followers & following
    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    /*
      How many reels this profile actually has.

      The profile screen printed a hardcoded 0 here, because nothing ever sent
      it a number -- an account with reels and an account with none read the
      same. Counted with the delete filter, so removing a reel moves it.
    */
    const reelsCount = await Reels.countDocuments({
      username: user._id, posttype: "Reel", ...NOT_DELETED,
    });

    // Send response
    res.json({
      message: "User profile fetched successfully",
      user: {
        _id: user._id,
        image: user.image,
        name: user.name,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobileno: user.mobileno,
        status: user.status,
        dateofbirth: user.dateofbirth,
        bio: user.bio,
        nationality: user.nationality,
        gender: user.gender,
        type: user.type,
        image: user.image,
        onlinestatus: user.onlinestatus,
        enteredby: user.enteredby,
        updateby: user.updateby,
        xtime: user.xtime,
        gallery: user.gallery,
        address: user.address,
        followersCount,
        followingCount,
        reelsCount,
        coins: user.coins,
        // Social Media module: blue tick + privacy state
        verifiedBadge: !!user.verifiedBadge,
        accountType: user.accountType || "personal",
        privacy: user.privacy || "public",
        pendingFollowRequests: (user.followRequests || []).length,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSuggestions = async (req, res) => {

  console.log("pars" + req.query);
  try {
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || "";
    const userId = req.query.userId;

    // Get the current user
    const user = await User.findById(userId).populate("following", "_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //console.log('..d....' + user)

    //return;
    // Extract following IDs
    const followingIds = user.following.map((f) => f._id.toString());

    // Construct filter criteria
    let filter = {
      _id: { $ne: userId, $nin: followingIds }, // Exclude self & already followed users
      followers: { $in: user.followers }, // Has mutual friends
    };

    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Find users who match the criteria with pagination
    const suggestedFriends = await User.find(filter)
      .select("name email image followers") // Only return relevant data
      .skip(skip)
      .limit(limit);

    res.status(200).json({ suggestions: suggestedFriends, page, limit });
  } catch (error) {
    console.error("Error fetching friend suggestions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getuser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const userid = req.query.userid || "";

    let filter = {};

    // If userid exists and is a valid ObjectId, fetch by _id
    if (userid) {
      filter._id = userid;
    } else if (searchQuery) {
      // If no userid, search by name or email
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(filter);

    return res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });

  } catch (error) {
    console.log("GET USER ERROR:", error);
    res.status(500).json({ message: "Error fetching user profile", error });
  }
};

export const notInfriends = async (req, res) => {
  try {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    // Step 1: Get current user's following list
    const currentUser = await User.findById(userId).select('following');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendIds = currentUser.following.map(id => id.toString());
    friendIds.push(userId); // Exclude self too

    // Step 2: Build query filter
    const filter = {
      _id: { $nin: friendIds },
      name: { $regex: searchQuery, $options: 'i' } // Case-insensitive name search
    };

    // Step 3: Fetch users with pagination
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);

    // Step 4: Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile", error: error.message });
  }

  /* try {
    const userId = req.query.userId; // Default page = 1
    const page = parseInt(req.query.page) || 1; // Default page = 1
    const limit = parseInt(req.query.limit) || 10; // Default limit = 10
    const skip = (page - 1) * limit; // Calculate how many documents to skip
    const searchQuery = req.query.search || ""; // Get search query

     // Step 1: Get current user's following list
     const currentUser = await User.findById(userId).select('following');

     if (!currentUser) {
       return res.status(404).json({ message: 'User not found' });
     }
     const friendIds = currentUser.following.map(id => id.toString());
     friendIds.push(userId); // exclude self too
     // Step 2: Get non-friend users with pagination
     const users = await User.find({ _id: { $nin: friendIds } })
       .select('-password')
       .skip(skip)
       .limit(limit);
 
     // Step 3: Optionally get total count for frontend
     const total = await User.countDocuments({ _id: { $nin: friendIds } });
 
     res.status(200).json({
       users,
       total,
       currentPage: page,
       totalPages: Math.ceil(total / limit),
     });
 
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  } */
}

export const findPeople = async (req, res) => {
  try {
    //    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";


    // Step 2: Build query filter
    const filter = {
      name: { $regex: searchQuery, $options: 'i' } // Case-insensitive name search
    };

    // Step 3: Fetch users with pagination
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);

    // Step 4: Get total count
    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile", error: error.message });
  }
}

export const updateAds = async (req, res) => {
  try {
    const { userId, address } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const formattedAddress = {
      location: address.location,
      houseNumber: address.houseNumber,
      name: address.name,
      mobile: address.mobile,
      instructions: address.instructions,
      latitude: address.latitude,
      longitude: address.longitude,
      modulename: address.modulename
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { address: formattedAddress } }, // ✅ add to array
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
export const deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.body;

    if (!userId || !addressId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Address ID are required"
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { address: { _id: addressId } }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
  }
};
export const logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      secure: true,
      sameSite: "none",
    })
    .status(200)
    .json("User has been logged out.");
};


export const updateProfileImageaws_working = async (req, res) => {
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

      const email = req.body.email;
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { image: fileUrl } },
        { new: true }
      );

      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });


      return res.json({
        message: 'File uploaded successfully',
        url: fileUrl,
        userdata: updatedUser
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

export const updateProfileImageaws = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    /*
      Name the file for what it contains.

      The extension was copied from whatever was uploaded while sharp writes
      WebP below, so the server produced .jpg and .png files holding WebP bytes.
      Most clients sniff the content and cope, but anything that trusts the
      extension — a CDN setting Content-Type, an image tool, a browser
      download — gets it wrong.
    */
    const optimizedFileName = `optimized-${Date.now()}.webp`;
    const optimizedPath = path.join(uploadDir, optimizedFileName);

    // 🔥 Optimize with Sharp
    await sharp(req.file.buffer) // use buffer from memoryStorage
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    // ✅ Save only path in DB
    const imagePath = `uploads/profile/${optimizedFileName}`;

    const user = await User.findOneAndUpdate(
      { email },
      { image: imagePath },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      message: "Profile image updated",
      image: imagePath,
      userdata: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Image upload failed",
      error: err.message,
    });
  }
};

export const webSignup = async (req, res) => {
  // console.log('body....' + JSON.stringify(req.body))

  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(201).json({ message: "All fields are required" });
    }
    const name = firstName + ' ' + lastName;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 1️⃣ Check if email already exists
    const existingUser = await User.findOne({ mobileno: phone });
    if (existingUser) {
      return res.status(201).json({ message: "mobile no is already used" });
    }
    const existingUseremail = await User.findOne({ email: email });
    if (existingUseremail) {
      return res.status(201).json({ message: "email is already used" });
    }

    const newUser = new User({
      name, firstname: firstName, lastname: lastName,
      email,
      password: hashedPassword,
      mobileno: phone,
      regtype: 'email'
    });
    await newUser.save();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(201).json({ message: "Invalid info" });
    }
    /*
      Another account-creation point that handed out an access token and nothing
      to renew it with, so the session died an hour in with no way back. Same
      fix as register and updateDateofbirthbyemail. `email` was reading
      `mobileno` here too.
    */
    const session = await issueSession(user, {
      payload: { userId: user._id, email: user.email },
      expiresIn: "1h",
    });
    if (session.twoFactorRequired) return twoFactorPending(res, session.challengeToken);
    const token = session.token;
    return res
      .status(201)
      .json({
        message: "User registered successfully",
        token,
        refreshToken: session.refreshToken,
        usersdata: user,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const updateProfileMultiImageaws = async (req, res) => {
  // Set up the multer upload middleware for multiple files
  var multiUpload = upload.array('file'); // 'files' is the key name in the form data

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
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

    // Return the uploaded file URLs
    return res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    });
  });
};

export const updateReelpost = async (req, res) => {
  console.log('....', req.body)
  const singleUpload = upload.single("file");

  singleUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "File upload failed",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // ✅ Local file URL
      const fileUrl = `/uploads/reels/${req.file.filename}`;

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
        emojioverlays,
      } = req.body;

      const newReel = new Reel({
        videoUrl: fileUrl,
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
        emojioverlays,
      });

      const savedReel = await newReel.save();

      return res.status(201).json({
        message: "File uploaded successfully (local)",
        url: fileUrl,
        data: savedReel,
      });
    } catch (error) {
      console.error("Upload Error:", error);
      return res.status(500).json({
        message: "Upload failed",
        error: error.message,
      });
    }
  });
};


export const updateReelpost_aws = async (req, res) => {
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
        sharegroup, posttypechild, ispost, videosound,
        textoverlays, emojioverlays
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

export const updatePost = async (req, res) => {
  // Set up the multer upload middleware for multiple files
  var multiUpload = upload.array('file'); // 'files' is the key name in the form data

  multiUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
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
    const { videoTitle, username, sound, posttype, tagpeople, location, sharegroup, posttypechild, ispost } = req.body;
    const newReel = new Reel({
      videoUrl: uploadedFiles,
      videoTitle,
      username,
      sound,
      posttype,
      tagpeople,
      location,
      sharegroup, posttypechild, ispost
    });
    const savedReel = await newReel.save();
    return res.status(201).json({
      message: 'File uploaded successfully',
      data: savedReel
    });
    //////////////////////////
  });

};

export const getStickers = async (req, res) => {
  const MY_STICKERS_ARRAY = [
    { id: 's1', uri: '/uploads/stickers/ballon.png' },
    { id: 's2', uri: '/uploads/stickers/balloon.png' },
    { id: 's3', uri: '/uploads/stickers/bouquet.png' },
    { id: 's4', uri: '/uploads/stickers/couple.png' },
    { id: 's5', uri: '/uploads/stickers/hand-sign.png' },
    { id: 's6', uri: '/uploads/stickers/heart-9000.png' },
    { id: 's7', uri: '/uploads/stickers/heart.png' },
    { id: 's8', uri: '/uploads/stickers/i-love-you-1.png' },
    { id: 's9', uri: '/uploads/stickers/i-love-you-44.png' },
    { id: 's10', uri: '/uploads/stickers/i-love-you.png' },
    { id: 's11', uri: '/uploads/stickers/in-love-89899.png' },
    { id: 's12', uri: '/uploads/stickers/kiss-6000.png' },
    { id: 's13', uri: '/uploads/stickers/kiss.png' },
    { id: 's14', uri: '/uploads/stickers/love-000.png' },
    { id: 's15', uri: '/uploads/stickers/love-8.png' },
    { id: 's16', uri: '/uploads/stickers/love-66.png' },
    { id: 's17', uri: '/uploads/stickers/love-678.png' },
    { id: 's18', uri: '/uploads/stickers/love-you.png' },
    { id: 's19', uri: '/uploads/stickers/love.png' },
    { id: 's20', uri: '/uploads/stickers/smile.png' },
  ];
  res.json(MY_STICKERS_ARRAY);
}





