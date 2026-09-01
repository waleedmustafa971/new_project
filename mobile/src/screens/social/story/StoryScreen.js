import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from "../../../component/global";
import AntDesign from "react-native-vector-icons/AntDesign";
import { Video } from "react-native-video";
import api from "../../../component/api";
import LinearGradient from "react-native-linear-gradient";
import { FB } from "../../../theme/social";

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

  // Refetch on focus: posting a story returns to this screen, and a rail that
  // still shows the state from before the post is the bug that made it look
  // like nothing had been uploaded.
  useFocusEffect(useCallback(() => { fetchStory(); }, [fetchStory]));

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

/*
  Reads /apis/feed/stories, not /apis/postreel/recentstory.

  The rail was on the legacy endpoint, which returns every story ever written,
  by anyone, with no expiry, no privacy and no grouping. That is why a story
  posted an hour ago sat next to test rows from three days back, and why the
  count never went down. The purpose-built feed returns *rings* — one per
  author, newest first, already filtered to the last 24 hours and to what this
  viewer is allowed to see — plus `unseen`, `isMine` and each story's view
  count, which is what the rail actually wants to draw.
*/
const fetchStory = useCallback(async () => {
  if (fetchingRef.current) return;
  fetchingRef.current = true;
  setLoading(true);

  try {
    const [rawUser, profilePic] = await Promise.all([
      AsyncStorage.getItem("userdata"),
      AsyncStorage.getItem("profileImage"),
    ]);
    const me = rawUser ? JSON.parse(rawUser) : null;
    setUser(me?.name || null);
    setProfileImage(profilePic);
    if (!me?._id) {
      setGetstory([{ _id: "create_story", isCreateStory: true }]);
      return;
    }

    const res = await api.get("/apis/feed/stories", { params: { userId: me._id } });
    const rings = res.data?.rings || [];

    /*
      One tile per author. Your own ring is folded into the create tile rather
      than shown twice, which is how every story rail behaves: the "+" becomes
      your story once you have one.
    */
    const mine = rings.find((r) => r.isMine);
    const others = rings.filter((r) => !r.isMine);

    setGetstory([
      {
        _id: "create_story",
        isCreateStory: true,
        ring: mine || null,
        views: mine ? (mine.items || []).reduce((n, it) => n + (it.views || 0), 0) : 0,
      },
      ...others.map((r) => ({
        _id: String(r.user?._id || Math.random()),
        ring: r,
        userInfo: r.user,
        unseen: r.unseen || 0,
        videoUrl: (r.items || [])[0]?.videoUrl,
        items: r.items || [],
      })),
    ]);
    setHasMore(false); // the feed returns every live ring in one response
  } catch (error) {
    console.log("Failed to fetch stories:", error?.response?.data?.message || error?.message);
    setGetstory((prev) =>
      prev.length ? prev : [{ _id: "create_story", isCreateStory: true }]
    );
  } finally {
    fetchingRef.current = false;
    setLoading(false);
  }
}, []);

  /*
    Stored paths are relative to the API host ("uploads/..."), and the avatar
    <Image>s were handed them unchanged — and handed `null` when there was no
    image at all. Both render nothing, which is why the rail was a wall of grey.
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
    Story media arrives in more than one shape: a plain string from the app, and
    { url, type } from rows the in-app tester wrote. Normalising here means both
    render, and anything unrecognised degrades to a placeholder rather than a
    broken request.
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
          /*
            With a live story of your own, this tile opens it; otherwise it
            starts a new one. That is the behaviour of every story rail, and it
            is also the only place your own view count can sensibly live.
          */
          onPress={() =>
            item.ring
              ? navigation.navigate("StoryViewer", {
                  itemdata: item.ring.items,
                  author: item.ring.user,
                })
              : navigation.navigate("CreateStory", { itemdata: [] })
          }
        >
          <View style={[styles.storyBox, styles.storyBoxSize]}>
            {/*
              Only a real photo is used as the cover. Feeding the placeholder
              silhouette through resizeMode="cover" blew a 100px asset up to fill
              a 108x148 tile, so the tile became a giant cropped head. With no
              photo we draw a plain tile and a small centred glyph instead.
            */}
            {/*
              With a live story the tile shows that story, not your avatar —
              it is the thing you are being invited to look at. Your avatar is
              only the cover when there is nothing to show yet.
            */}
            {(() => {
              const ownCover = item.ring
                ? storyMedia((item.ring.items || [])[0] || {}).uri
                : null;
              return ownCover || resolveUri(image);
            })() ? (
              <>
                <Image
                  source={{
                    uri:
                      (item.ring
                        ? storyMedia((item.ring.items || [])[0] || {}).uri
                        : null) || resolveUri(image),
                  }}
                  style={styles.storyImage}
                  resizeMode="cover"
                />
                <View style={styles.createScrim} />
              </>
            ) : (
              <View style={styles.createEmpty}>
                <AntDesign name="user" size={30} color="#9CA3AF" />
              </View>
            )}
            {/* The "+" is an invitation to post; once you have posted it
                becomes a viewer count, which is the thing you actually want to
                check when you come back. */}
            {item.ring ? (
              <View style={styles.viewsPill}>
                <AntDesign name="eye" size={11} color="#fff" />
                <Text style={styles.viewsPillText}>{item.views || 0}</Text>
              </View>
            ) : null}

            {/*
              Facebook's create card: the photo fills the top, a white footer
              carries a blue "+" straddling the seam and the label beneath it.
              The label used to sit outside the tile in grey, which is the
              Instagram circle-rail pattern, not this one.
            */}
            <View style={styles.createFooter}>
              <Text style={styles.createFooterText} numberOfLines={1}>
                {item.ring ? "Your story" : "Create story"}
              </Text>
            </View>
            <View style={styles.plusIconContainer}>
              <AntDesign name="plus" size={16} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const media = storyMedia(item);

    return (
      <TouchableOpacity
        style={[styles.storyItem, { marginRight: 12, alignItems: "center" }]}
        onPress={() =>
          navigation.navigate("StoryViewer", {
            itemdata: item.items?.length ? item.items : [item],
            author: item.userInfo,
          })
        }
      >
        <View
          style={[
            styles.storyBox,
            styles.storyBoxSize,
            { position: "relative" },
            // An unseen ring is the whole point of a story rail: it is the only
            // signal telling you which tiles are worth opening.
            item.unseen > 0 && styles.storyBoxUnseen,
          ]}
        >
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
          {/*
            The name belongs on the card, in white over a scrim, the way every
            Facebook story tile does it. Below the card in grey it read as a
            caption for a thumbnail rather than as part of the tile, and it
            made the rail a good 18px taller for nothing.
          */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
            style={styles.nameScrim}
            pointerEvents="none"
          />
          <Text style={styles.userNameText} numberOfLines={2}>
            {item.userInfo?.name}
          </Text>
        </View>
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
    <View style={styles.rail}>
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
  rail: {
    backgroundColor: FB.surface,
    paddingVertical: FB.space.md,
    paddingLeft: FB.space.md,
    marginBottom: FB.card.gap,
  },
  storyItem: {
    marginRight: FB.story.gap,
    alignItems: "center",
  },
  /* One place to change the rail's proportions. 108x148 keeps the 3:4 shape but
     gives back roughly a third of the vertical space the old 130x160 tiles ate
     before the first post was reachable. */
  storyBoxSize: { width: FB.story.width, height: FB.story.height },
  storyBox: {
    backgroundColor: FB.fill,
    borderRadius: FB.story.radius,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  createScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  storyBoxUnseen: {
    borderWidth: 3,
    borderColor: FB.primary,
  },
  viewsPill: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  viewsPillText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  createEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F3F5",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  /* Straddles the seam between photo and footer, which is what makes the
     create card read as one object rather than two stacked halves. */
  plusIconContainer: {
    position: "absolute",
    bottom: 26,
    borderRadius: FB.radius.pill,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: FB.primary,
    borderWidth: 3,
    borderColor: FB.surface,
  },
  createFooter: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: 40,
    backgroundColor: FB.surface,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  createFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: FB.text,
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
  nameScrim: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: 62,
  },
  userNameText: {
    position: "absolute",
    left: 8, right: 8, bottom: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default StorySection;
