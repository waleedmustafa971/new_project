// connectivitySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';

export const checkConnectivity = createAsyncThunk(
  'connectivity/checkConnectivity',
  async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }
);

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState: {
    isConnected: true,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkConnectivity.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkConnectivity.fulfilled, (state, action) => {
        state.loading = false;
        state.isConnected = action.payload;
        console.log('...connectivity slice...' + state.isConnected);
      })
      .addCase(checkConnectivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default connectivitySlice.reducer;
