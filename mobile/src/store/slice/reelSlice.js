// redux/slices/reelSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import * as base from "../../component/global";


export const fetchReels = createAsyncThunk(
  'reels/fetchReels',
  async ({ page, email, limit }, thunkAPI) => {
    
    try {
        //http://192.168.1.204:5000/apis/reel/userreels?page=1&limit=1&email=h1@gmail.com
      const response = await axios.get(`${base.BASE_URL}/apis/reel/userreels?page=${page}&limit=${limit}&email=${email}`);
      console.log('data...single reels' + JSON.stringify(response.data))
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data || error.message);
    }
  }
);

const reelSlice = createSlice({
  name: 'reels',
  initialState: {
    reels: [],
    page: 1,
    totalPages: 1,
    status: 'idle',
    error: null,
    isRefreshing: false,
  },
  reducers: {
    resetReels: (state) => {
      state.reels = [];
      state.page = 1;
      state.totalPages = 1;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReels.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReels.fulfilled, (state, action) => {
        const { reels, page, totalPages } = action.payload;
        state.reels = page === 1 ? reels : [...state.reels, ...reels];
        state.page = page;
        state.totalPages = totalPages;
        state.status = 'succeeded';
      })
      .addCase(fetchReels.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetReels } = reelSlice.actions;
export default reelSlice.reducer;
