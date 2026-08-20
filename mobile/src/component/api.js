import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base from './global';
import { resetToAuth } from '../navigation/RootNavigation';
import { Alert } from 'react-native';

const api = axios.create({
  baseURL: base.BASE_URL,
});

// Request interceptor
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/*
  Ending a session, completely.

  The three failure paths below used to clear only `token` and `refreshToken`,
  leaving `userdata` behind, and the redirect to the auth screen was commented
  out. The app was then permanently half-signed-in: every screen believed there
  was a user, so nothing prompted a login, while every authenticated request
  answered 401. That is what made the live tab fail to load and device-token
  registration fail with "Access denied, no token provided", while open
  endpoints like the reel feed carried on working and hid the cause.
*/
const endSession = async () => {
  await AsyncStorage.multiRemove([
    'token', 'refreshToken', 'userdata', 'userinfo', 'fcmtoken:registered',
  ]);
  resetToAuth(); // no-op until the navigator is ready, by design
};

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        // 🚨 No refresh token → force logout
        if (!refreshToken) {
          await endSession();
          return Promise.reject(error);
        }
        const res = await fetch(`${base.BASE_URL}/apis/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        // ❌ Refresh failed → logout
        if (!res.ok) {
          await endSession();
          return Promise.reject(error);
        }

        // ✅ Refresh success
        const data = await res.json();
        await AsyncStorage.setItem('token', data.token);

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (err) {
        await endSession();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
