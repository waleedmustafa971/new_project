// redux/slices/reelSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import * as base from "../../component/global";


export const fetchFollowing = createAsyncThunk(
  'followering/fetchFollowing',
  async ({ page, userid, limit }, thunkAPI) => {
    
    try {
        //http://192.168.1.204:5000/apis/reel/userreels?page=1&limit=1&email=h1@gmail.com
      const response = await axios.get(`${base.BASE_URL}/apis/reel/myFollowering?page=${page}&limit=${limit}&userId=${userid}`);
      console.log('data...single followers' + JSON.stringify(response.data))
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data || error.message);
    }
  }
);

const followingSlice = createSlice({
  name: 'followering',
  initialState: {
    followers: [],
    page: 1,
    totalPages: 1,
    status: 'idle',
    error: null,
    isRefreshing: false,
  },
  reducers: {
    resetFollowing: (state) => {
      state.followers = [];
      state.page = 1;
      state.totalPages = 1;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowing.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        const { followers, page, totalPages  } = action.payload;
        state.followers = page === 1 ? followers : [...state.followers, ...followers];
        state.page = page;
        state.totalPages = totalPages;
        state.status = 'succeeded';
      })
      .addCase(fetchFollowing.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetFollowing } = followingSlice.actions;
export default followingSlice.reducer;
