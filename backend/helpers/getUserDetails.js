import jwt from 'jsonwebtoken';
//import users from '../models/users.js';
import User from "../models/users.js"; // import model user

import dotenv from "dotenv";
dotenv.config();
 
const getUserDetails = async (_id) => {

    const user = await User.findById(_id).select('-password');

    return user;
}; 


export default getUserDetails;
