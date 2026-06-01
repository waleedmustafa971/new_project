const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const Video = require("./models/Video");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// API: Upload Video
app.post("/upload", upload.single("video"), async (req, res) => {
  const newVideo = new Video({ videoUrl: `http://localhost:5000/uploads/${req.file.filename}` });
  await newVideo.save();
  res.json({ message: "Video uploaded successfully!", video: newVideo });
});

// API: Get All Videos
app.get("/videos", async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

// API: Like a Video
app.post("/videos/:id/like", async (req, res) => {
  const video = await Video.findById(req.params.id);
  video.likes += 1;
  await video.save();
  res.json(video);
});

// API: Dislike a Video
app.post("/videos/:id/dislike", async (req, res) => {
  const video = await Video.findById(req.params.id);
  video.dislikes += 1;
  await video.save();
  res.json(video);
});

// API: Add Comment
app.post("/videos/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  const video = await Video.findById(req.params.id);
  video.comments.push({ user, text });
  await video.save();
  res.json(video);
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));


VideoRecorder.js

import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Video, ActivityIndicator } from "react-native";
import { Camera } from "expo-camera";
import axios from "axios";

const VideoRecorder = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);

  // Request Camera Permissions
  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Start Recording
  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync();
      setVideoUri(video.uri);
      setIsRecording(false);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  // Upload Video to Server
  const uploadVideo = async () => {
    if (!videoUri) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("video", {
        uri: videoUri,
        type: "video/mp4",
        name: "video.mp4",
      });

      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Video uploaded successfully!");
      navigation.navigate("ReelsScreen"); // Navigate to Reels screen
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-900">
      {!videoUri ? (
        <Camera ref={cameraRef} style={{ width: "100%", height: 400 }} type={Camera.Constants.Type.back} />
      ) : (
        <Video source={{ uri: videoUri }} style={{ width: "100%", height: 400 }} useNativeControls />
      )}

      {/* Record & Upload Buttons */}
      <View className="flex-row mt-4 space-x-4">
        {!videoUri ? (
          <TouchableOpacity className="p-4 bg-blue-500 rounded-lg" onPress={isRecording ? stopRecording : startRecording}>
            <Text className="text-white font-semibold">{isRecording ? "Stop" : "Record"}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity className="p-4 bg-green-500 rounded-lg" onPress={uploadVideo}>
              <Text className="text-white font-semibold">Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-4 bg-gray-500 rounded-lg" onPress={() => setVideoUri(null)}>
              <Text className="text-white font-semibold">Retake</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Upload Progress */}
      {uploading && <ActivityIndicator size="large" color="#fff" className="mt-4" />}
    </View>
  );
};

export default VideoRecorder;

