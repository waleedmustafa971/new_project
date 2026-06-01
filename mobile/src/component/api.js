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
          await AsyncStorage.multiRemove(['token', 'refreshToken']);
         // Alert.alert("Auth Token is expaired")
         // resetToAuth();
          return Promise.reject(error);
        }
        const res = await fetch(`${base.BASE_URL}/apis/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        // ❌ Refresh failed → logout
        if (!res.ok) {
          await AsyncStorage.multiRemove(['token', 'refreshToken']);
          //Alert.alert("Auth Token is expaired")
          //resetToAuth();
          return Promise.reject(error);
        }

        // ✅ Refresh success
        const data = await res.json();
        await AsyncStorage.setItem('token', data.token);

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (err) {
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        resetToAuth();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
