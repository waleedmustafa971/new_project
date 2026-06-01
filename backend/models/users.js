
import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
location: String,
houseNumber: String,
name: String,
mobile: String,
instructions: String,
latitude: Number,
longitude: Number,
modulename : String
});

const userSchema = new mongoose.Schema({
    name: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    mobileno: { type: String },
    status: { type: String },
    emailaddress: { type: String },
    dateofbirth: { type: String },
    bio: { type: String },
    nationality: { type: String }, //Gender
    interest: { type: String }, //Gender
    gender: { type: String }, //Gender
    type: { type: String }, //Gender
    regtype: { type: String }, //Mobile / Email
    regby: { type: String }, //Google / facebook / signup by email, signup by mobile
    profileidverification: { type: String }, //yes / no
    otpverify: { type: String }, //yes / no
    image: { type: String }, //Gender
    onlinestatus: { type: String },
    enteredby: { type: Date, default: Date.now },
    updateby: { type: Date, default: Date.now },
    xtime: { type: Date, default: Date.now },
    otpcode: { type: String },
    modulewiselogin: { type: [String] },
    mobileverify: { type: String, default: "Not Verify" },
    emailverify: { type: String, default: "Not Verify" },
    // Follow list: stores user IDs of followers & following
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    gallery: [{ type: String }],
    address: [AddressSchema],
    logs: { type: Object },
    coins: {
        type: Number,
        default: 0,
        min: 0 // prevents negative coins
    },
   referralCode: {
    type: String,
    unique: true,
   },
   referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  blockedUsers: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],
  fcm_token: { type : String},
  setting_user: { type : Object},
  location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
  }
});

const User = mongoose.model('users', userSchema);

export default User;  // Default export

