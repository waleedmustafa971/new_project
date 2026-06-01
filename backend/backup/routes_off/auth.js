import express from "express";
import { welcome,login,register,checkEmail, logout, 
  getuser, updateByMobile,
  getProfile, updateProfileImage, getSuggestions, 
  editProfile, updateProfileImageaws, updateProfileMultiImageaws,
  updateReelpost, notInfriends, updatePost, findPeople,
  checkMobile, registerMobile, verifyMobile, 
  updateDateofbirth,updateDateofbirthbyemail, webSignup, updatePassword,
  updateInterest, refreshToken, relstateProfile, Googlesignin,
Googlecheck, updateAds, deleteAddress  } from "../controllers/auth.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()

//router.get("/", welcome)
router.post("/google-login", Googlesignin) 
router.post("/googlelogincheck", Googlecheck) 
router.post("/register", register)
router.post("/signupwithweb", webSignup) //webSignup
router.post("/update-relestate-profile", authMiddleware, relstateProfile) //webSignup
router.post("/relestate-changepassword", authMiddleware, updatePassword) //webSignup

router.post("/mobile_register", registerMobile)
router.post("/update-address", authMiddleware, updateAds)
router.post("/delete-address", deleteAddress)
router.post("/verify_mobile", verifyMobile) 
router.post("/update_dateofbirth", updateDateofbirth) 
router.post("/update_dateofbirthemail", updateDateofbirthbyemail) 
router.post("/update-interest", updateInterest) 

router.post("/reg", (req, res) => {
    const { name, email, password } = req.body;
  
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    return res.status(200).json({ message: `Received: ${name}` });
  });

  router.get("/test", (req, res) => {
    res.send("API is running...send...logingeturl");
  });
  
  
//router.get("/test", logingeturl)
router.post("/login", login)
router.post("/refresh-token", refreshToken) //webSignup refresh-token
router.post("/register", register) //getuser checkEmail
router.post("/checkEmail", checkEmail) //getuser checkEmail
//router.get("/getuser", authMiddleware, getuser) //getuser
router.get("/getuser", getuser) //getuser getProfile
router.get("/notInfriends", notInfriends) 
router.get("/suggestions", getSuggestions)
router.get("/getProfile", getProfile)
router.post("/updateByMobile", updateByMobile) //getuser
router.post("/updateProfileImage",updateProfileImage) //updateOwnMusic
//router.post("/updateOwnMusic",updateOwnMusic) //updateOwnMusic
router.post("/editProfile", editProfile)
router.post("/updateProfileImageaws",updateProfileImageaws) //updateProfileMultiImageaws
router.post("/updateProfileMultiImageaws",updateProfileMultiImageaws) //updateProfileMultiImageaws
router.post("/updateReelpost", updateReelpost)
router.post("/updatePost", updatePost)
router.post("/logout", logout)


export default router