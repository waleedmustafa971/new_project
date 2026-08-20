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
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
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
  // Page and in-flight flag are refs, not state: this list is horizontal and
  // short, so onEndReached fires before a setPage/setLoading update commits.
  // Reading state here would refetch page 1 and append it a second time,
  // duplicating every story and the "create_story" tile.
  if (fetchingRef.current || !hasMore) return;

  const requestedPage = pageRef.current;
  fetchingRef.current = true;
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
        page: requestedPage,
        limit: 10,
        username,
        posttype: "Story",
      },
    });

    if (res.data?.message === "No story found") {
      setHasMore(false);
      /*
        Keep the "Your story" tile even when nobody has an active story.

        It used to be prepended only in the branch below, so an empty rail
        rendered nothing at all — and since stories expire, that is the normal
        state most of the time. The entry point for creating one disappeared
        exactly when it was most needed.
      */
      if (requestedPage === 1) {
        setGetstory((prev) =>
          prev.some((x) => String(x._id) === "create_story")
            ? prev
            : [{ _id: "create_story", isCreateStory: true }, ...prev]
        );
      }
    } else {
      const newData =
        requestedPage === 1
          ? [{ _id: "create_story", isCreateStory: true }, ...res.data.reels]
          : res.data.reels;

      setGetstory((prev) => {
        const merged = [...prev, ...newData];
        const seen = new Set();
        return merged.filter((s) => {
          const id = String(s._id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
      pageRef.current = requestedPage + 1;
      setPage(requestedPage + 1);
    }
  } catch (error) {
    console.error("Failed to fetch story:", error);
  } finally {
    fetchingRef.current = false;
    setLoading(false);
  }
}, [hasMore]);

  /*
    Stored image paths are relative to the API host ("uploads/..."), and the two
    avatar <Image>s here passed them through unchanged — and passed `null` as the
    source when there was no image at all. Both render nothing, which is why the
    story rail was a wall of grey boxes. The story media itself already prefixed
    BASE_URL; the avatars never did.
  */
  const AVATAR_FALLBACK = require("../../../assets/user.png");
  const resolveUri = (path) => {
    if (!path) return null;
    const p = String(path);
    if (/^(https?:|file:|data:)/.test(p)) return p;
    return `${base.BASE_URL}/${p.replace(/^\/+/, "")}`;
  };
  const avatarSource = (path) => {
    const uri = resolveUri(path);
    return uri ? { uri } : AVATAR_FALLBACK;
  };

  /*
    Story media comes back in more than one shape: the app writes videoUrl as a
    string, while rows created by the in-app tester write { url, type }. The old
    code concatenated it onto BASE_URL regardless, so an object became the URL
    "http://host/[object Object]" and the tile stayed grey. Normalising here
    means either shape renders, and anything unrecognised degrades to a plain
    placeholder rather than a broken request.
  */
  const storyMedia = (item) => {
    const raw = item?.videoUrl;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const path =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
          ? value.url || value.uri || ""
          : "";
    const declaredVideo =
      value && typeof value === "object" && value.type === "video";
    return {
      uri: resolveUri(path),
      isVideo: declaredVideo || /\.(mp4|mov|webm|avi|m3u8)$/i.test(path || ""),
    };
  };

  const renderStoryItem = ({ item, index }) => {

    if (item.isCreateStory) {
      return (
        <TouchableOpacity
          style={[styles.storyItem, { marginRight: 12, alignItems: "center" }]}
          onPress={() =>  navigation.navigate("CreateStory", {
        itemdata: []
      })}

        >
          <View style={[styles.storyBox, styles.storyBoxSize]}>
            <Image source={avatarSource(image)} style={styles.storyImage} resizeMode="cover" />
            {/* A scrim so the button reads against any photo underneath it. */}
            <View style={styles.createScrim} />
            <View style={styles.plusIconContainer}>
              <AntDesign name="plus" size={18} color="#fff" />
            </View>
          </View>
          <Text style={styles.createStoryText} numberOfLines={1}>Your story</Text>
        </TouchableOpacity>
      );
    }

    const media = storyMedia(item);

    return (
      <TouchableOpacity
        style={[styles.storyItem, { marginRight: 12, alignItems: "center" }]}
        onPress={() => 
          navigation.navigate("StoryViewer", { itemdata: [item] })
      
      }
      >
        <View style={[styles.storyBox, styles.storyBoxSize, { position: "relative" }]}>
          <View style={styles.profileImageContainer}>
            <Image
              source={avatarSource(item?.userInfo?.image)}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
          {media.isVideo && media.uri ? (
            <Video
              ref={(ref) => (videoRefs.current[index] = ref)}
              source={{ uri: media.uri }}
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
          ) : media.uri ? (
            <Image
              source={{ uri: media.uri }}
              style={styles.storyImage}
              resizeMode="cover"
            />
          ) : null}
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
  /* One place to change the rail's proportions. 108x148 keeps the 3:4 shape but
     gives back roughly a third of the vertical space the old 130x160 tiles ate
     before the first post was reachable. */
  storyBoxSize: { width: 108, height: 148 },
  storyBox: {
    backgroundColor: "#E9EBEE",
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  createScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  plusIconContainer: {
    position: "absolute",
    bottom: 10,
    borderRadius: 9999,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#fff",
  },
  createStoryText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: "600",
    color: "#374151",
    maxWidth: 108,
    textAlign: "center",
  },
  /* The author badge sits inset with a white ring, the way every story rail
     does it — flush in the corner it looked like a rendering mistake. */
  profileImageContainer: {
    position: "absolute",
    zIndex: 10,
    left: 8,
    top: 8,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
  },
  userNameText: {
    fontSize: 11,
    marginTop: 6,
    color: "#374151",
    maxWidth: 108,
    textAlign: "center",
  },
});

export default StorySection;
