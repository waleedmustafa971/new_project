import React, { useState, useEffect, useCallback, useRef } from "react";
import { FlatList, Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from "../../../component/global";
import AntDesign from "react-native-vector-icons/AntDesign";
import { Video } from "react-native-video";
import api from "../../../component/api";

const StorySection = ({ navigation, name, image }) => {
  const [getstory, setGetstory] = useState([]);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const videoRefs = useRef([]);

  useEffect(() => {
    fetchStory();
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video == null) return;
      if (index === currentVisibleIndex) {
        video.playAsync?.();
      } else {
        video.pauseAsync?.();
      }
    });
  }, [currentVisibleIndex]);

const fetchStory = useCallback(async () => {
  if (loading || !hasMore) return;

  setLoading(true);

  try {
    const [username, profilePic] = await Promise.all([
      AsyncStorage.getItem("username"),
      AsyncStorage.getItem("profileImage"),
    ]);
    setUser(username);
    setProfileImage(profilePic);
    const res = await api.get("/apis/postreel/recentstory", {
      params: {
        page,
        limit: 10,
        username,
        posttype: "Story",
      },
    });

    if (res.data?.message === "No story found") {
      setHasMore(false);
    } else {
      const newData =
        page === 1
          ? [{ _id: "create_story", isCreateStory: true }, ...res.data.reels]
          : res.data.reels;

      setGetstory((prev) => [...prev, ...newData]);
      setPage((prev) => prev + 1);
    }
  } catch (error) {
    console.error("Failed to fetch story:", error);
  } finally {
    setLoading(false);
  }
}, [loading, hasMore, page]);

  const renderStoryItem = ({ item, index }) => {
    const isVideo = (url) => /\.(mp4|mov|webm|avi|m3u8)$/i.test(url);

    if (item.isCreateStory) {
      return (
        <TouchableOpacity
          style={[styles.storyItem, { marginRight: 12, alignItems: "center" }]}
          onPress={() =>  navigation.navigate("CreateStory", {
        itemdata: []
      })}

        >
          <View style={[styles.storyBox, { width: 130, height: 160 }]}>
            <Image
              source={
                image
                  ? {
                      uri: image,
                    }
                  : null //require("../../../assets/user.png")
              }
              style={styles.storyImage}
            />
            <View style={styles.plusIconContainer}>
              <AntDesign name="plus" size={24} color="white" />
            </View>
          </View>
          <Text style={styles.createStoryText}>Create Story</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.storyItem, { marginRight: 12, alignItems: "center" }]}
        onPress={() => 
          navigation.navigate("StoryViewer", { itemdata: [item] })
      
      }
      >
        <View style={[styles.storyBox, { width: 130, height: 160, position: "relative" }]}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                item
                  ? {
                      uri: item?.userInfo.image,
                    }
                  : null //require("../../../assets/user.png")
              }
              style={styles.profileImage}
            />
          </View>
          {isVideo(item.videoUrl) ? (
            <Video
              ref={(ref) => (videoRefs.current[index] = ref)}
              source={{ uri: item?.videoUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              muted={true}
              isLooping={false}
              shouldPlay={false}
              onPlaybackStatusUpdate={(status) => {
                if (status.didJustFinish && index === currentVisibleIndex) {
                  // handleNextStory();
                }
              }}
              onError={(err) => console.log("Story Section ....Video load/playback error:", err)}
            />
          ) : (
            <>
            <Image
              source={{ uri: base.BASE_URL + item.videoUrl }}
              style={styles.storyImage}
              resizeMode="cover"
            />
            </>
          )}
        </View>
        <Text style={styles.userNameText} numberOfLines={1}>{item.userInfo?.name}</Text>
      </TouchableOpacity>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentVisibleIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  return (
    <View style={{ marginBottom: 16, marginLeft: 8, marginTop: 0 }}>
      <FlatList
        horizontal
        data={getstory}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        renderItem={renderStoryItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={fetchStory}
        onEndReachedThreshold={0.8}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  storyItem: {
    marginRight: 12,
    alignItems: "center",
  },
  storyBox: {
    backgroundColor: "#E5E7EB", // gray-200
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  plusIconContainer: {
    position: "absolute",
    bottom: 12,
    padding: 4,
    borderRadius: 9999,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  createStoryText: {
    fontSize: 12,
    marginTop: 4,
  },
  profileImageContainer: {
    position: "absolute",
    zIndex: 10,
    borderRadius: 9999,
    right: 0,
    top: 0,
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 16,
  },
  userNameText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default StorySection;
