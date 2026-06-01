import axios from "axios";
import * as base from '../component/global'
import api from "../component/api";
const API_BASE_URL = base.BASE_URL; // Replace with your API URL


export const fetchSingleUser = async (userId) => {
  const response = await api.get(`/apis/auth/getProfile?id=${userId}`);
 console.log('...get Single Data.....', response.data)
  return response.data; 
};
export const deleteAddress = async (userId, addressId) => {
  console.log('....test' + api.post("/apis/auth/delete-address", {
    userId,
    addressId,
  }))

  const response = await api.post("/apis/auth/delete-address", {
    userId,
    addressId,
  });

  return response.data;
};
export const fetchPosts = async () => {
  const response = await axios.get(`${API_BASE_URL}/posts`);
  return response.data;
};

export const createPost = async (postData) => {
  const response = await axios.post(`${API_BASE_URL}/posts`, postData);
  return response.data;
};

/* export const followUser = async (userId) => {
  const response = await axios.post(`${base.BASE_URL}/apis/reel/Addfollow`, { userId });
  return response.data;
};
 */
// API to follow a user userId followId
  export const followUser = async ({ userId, followId }) => 
  {
    console.log('user id....' + userId + '--Follow ID---' + followId);
    try {
      const response = await axios.post(
        `${base.BASE_URL}/apis/reel/Addfollow`,
        {
          userId,
          followId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  
      console.log("API Response:", response.data.message); // Debugging the response
  
      return response.data.message; // Ensure correct response handling
    } catch (error) {
      console.error("Follow API Error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to follow user");
    }
  };
  
  
