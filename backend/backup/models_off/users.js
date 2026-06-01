
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name : { type : String },
    firstname : { type : String },
    lastname : { type : String },
    email: { type: String, unique: true, required: true },
    password:  { type : String, required : true },
    mobileno: { type : String },
    status: { type : String },
    emailaddress: { type : String },
    dateofbirth: { type : String }, 
    bio: { type : String }, 
    nationality: { type : String }, //Gender
    interest: { type : String }, //Gender
    gender: { type : String }, //Gender
    type: { type : String }, //Gender
    regtype: { type : String }, //Mobile / Email
    regby: { type : String }, //Google / facebook / signup by email, signup by mobile
    profileidverification: { type : String }, //yes / no
    otpverify: { type : String }, //yes / no
    image: { type : String }, //Gender
    onlinestatus: { type : String },
    enteredby: { type : Date, default: Date.now },
    updateby: { type : Date, default: Date.now },
    xtime: { type : Date, default: Date.now },
    otpcode: { type : String },
    mobileverify: { type : String },
    emailverify: { type : String },
    // Follow list: stores user IDs of followers & following
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    gallery: [{ type: String }],
    address: [
    {
      type: { type: String },        // "home" | "office" | "tutor" etc.
      location: String,
      houseNumber: String,
      name: String,
      mobile: String,
      instructions: String,
      latitude: String,
      longitude: String,
    }
  ]
});

const User = mongoose.model('users', userSchema);

export default User;  // Default export

