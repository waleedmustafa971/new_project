import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUserList, followUser, fetchSingleUser, deleteAddress } from "../api";

// Async thunk to fetch single user profile
export const getSingleUser = createAsyncThunk(
  "users/getSingleUser",
  async (userId, { rejectWithValue }) => {
    try {
      const data = await fetchSingleUser(userId);
    //  console.log('...data.....', JSON.data.data)
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load user profile");
    }
  }
);

// deleteUserAddress thunk
export const deleteUserAddress = createAsyncThunk(
  "users/deleteAddress",
  async ({ userId, addressId }, { rejectWithValue }) => {
    try {
      const data = await deleteAddress(userId, addressId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to delete address"
      );
    }
  }
);

// Async thunk for fetching user list
export const getUserList = createAsyncThunk("users/getUserList", async (_, { rejectWithValue }) => {
  try {
    const data = await fetchUserList();
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to fetch users");
  }
});

// Async thunk for following a user
export const followUserAsync = createAsyncThunk("users/followUser", async (userId, { rejectWithValue }) => {
  try {
    const data = await followUser(userId);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to follow user");
  }
});

// Initial state
const initialState = {
  users: [],
   singleUser: { user: { address: [] } },
  //followedUsers: [],
  //followedUsers: '',
  followedUsers: {},
  loading: false,
  error: null
};

// Create user slice
const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getUserList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserList.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(getUserList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
       .addCase(followUserAsync.fulfilled, (state, action) => {
        state.followedUsers.add(action.payload.userId);
       // state.followedUsers.push(action.payload);
       /*  const alreadyFollowed = state.followedUsers.some(user => user.userId === action.payload.userId);
  
        if (!alreadyFollowed) {
          state.followedUsers.push(action.payload);
        } */
      }) 
    /*   .addCase(followUserAsync.fulfilled, (state, action) => {
        state.followedUsers.add(action.payload.userId);
      }) */
      .addCase(followUserAsync.rejected, (state, action) => {
        state.error = action.payload;
      });

   builder
  .addCase(getSingleUser.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(getSingleUser.fulfilled, (state, action) => {
    state.loading = false;
    state.singleUser = action.payload; 
  })
  .addCase(getSingleUser.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload;
  });

 builder
  .addCase(deleteUserAddress.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(deleteUserAddress.fulfilled, (state, action) => {
    state.loading = false;
    state.singleUser = action.payload; 
  })
  .addCase(deleteUserAddress.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload;
  });


  },
});

export default userSlice.reducer;
