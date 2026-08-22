import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifySessionChanged } from "../../component/session";
import * as base from "../../component/global";
import api from "../../component/api";
import { registerPushToken, unregisterPushToken } from "../../services/pushToken";

// Get user data from AsyncStorage
export const getUserData = createAsyncThunk('auth/getLocalstoragedata', async () => {
  const jsonValue = await AsyncStorage.getItem('userdata');
  if (jsonValue != null) {
    return JSON.parse(jsonValue);
  } else {
    throw new Error('No user data found');
  }
});

// Login user
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${base.BASE_URL}/apis/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue({ message: data.message || "Login failed" });
      }

      if (data.message === "Login successful") {
        await AsyncStorage.setItem("username", email);
        await AsyncStorage.setItem("password", password);
        await AsyncStorage.setItem("userdata", JSON.stringify(data.usersdata));
        await AsyncStorage.setItem("userinfo", JSON.stringify(data.usersdata));
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
        // UserContext reads storage; it has to be told that storage moved.
        // A thunk cannot use the hook, which is why this is an event.
        notifySessionChanged();

        /*
          Register this device for push now that there is an account to attach it
          to. Sign-up sends `fcmtoken` in its own payload, but sign-in never did,
          so an existing user on a new phone was never registered and could not
          be reached. Deliberately not awaited: push is a convenience and must
          not be able to delay or fail a sign-in.
        */
        registerPushToken();

        return data;
      } else {
        return rejectWithValue({ message: data.message || "Login failed" });
      }
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

// Check email
export const chekEmailaddress = createAsyncThunk(
  "auth/checkemail",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${base.BASE_URL}/apis/auth/checkEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue({ message: data.message || "Check failed" });
      }

      await AsyncStorage.setItem("tempemail", email);
      await AsyncStorage.setItem("regtype", 'email');
      return data;
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);


export const profileUserupdate = createAsyncThunk(
  "auth/profileUpdate",
  async ({ id, email, name, bio, mobileno }, { rejectWithValue }) => {
    try {
      // ✅ axios POST with JSON body
      const response = await api.post("/apis/auth/editProfile", {
        id,
        email,
        name,
        bio, mobileno
      });

      const data = response.data; // axios automatically parses JSON

      if (data.message === "User updated successfully") {
        console.log("Updated user data:", JSON.stringify(data.user));

        // ✅ Store login data in AsyncStorage
        await AsyncStorage.multiRemove(["username", "userdata", "userinfo"]);
        await AsyncStorage.multiSet([
          ["username", email],
          ["userdata", JSON.stringify(data.user)],
          ["userinfo", JSON.stringify(data.user)],
        ]);

        return data; // Return the user data on success
      } else {
        return rejectWithValue(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      return rejectWithValue(error.message || "Network error");
    }
  }
);


// Initial state
const initialState = {
  user: null,
  token: null,
  loading: false,
  message: null,
  error: null,
  userdata: null,
  updateuserlist: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutUser: (state) => {
      /*
        Drop this device from the account first, while its keys are still in
        storage — the removeItem calls below are what it needs to read. Issued
        before them so the native storage queue serves the read first.

        Without this the tokens pile up on the first account and the next person
        to sign in on this handset keeps receiving the previous user's pushes.
      */
      unregisterPushToken();

      state.user = null;
      state.token = null;
      AsyncStorage.removeItem("username");
      AsyncStorage.removeItem("password");
      AsyncStorage.removeItem("userdata");
      AsyncStorage.removeItem("userinfo");
      AsyncStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.usersdata;
        state.token = action.payload.token;
        state.message = action.payload.message;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login error";
      })

      .addCase(getUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserData.fulfilled, (state, action) => {
        state.loading = false;
        state.userdata = action.payload;
      })
      .addCase(getUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(chekEmailaddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(chekEmailaddress.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(chekEmailaddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Email check failed";
      });
  },
});

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;
