import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../store/slice/userSlice";
import authReducer from '../store/slice/authSlice' //../store/slice/authSlice
import connectivityReducer from '../store/slice/connectivitySlice'
import reelReducer from '../store/slice/reelSlice';
import followingReducer from '../store/slice/followingSlice';
import userdetailsReducer from '../store/slice/userDetails'

const store = configureStore({
  reducer: {
    users: userReducer,
    auth: authReducer,
    connectivity: connectivityReducer,
    reels: reelReducer,
    followings: followingReducer,
    user: userdetailsReducer
  },
});

export default store;
