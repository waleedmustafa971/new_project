import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Video from "react-native-video";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
import { useVideoController } from "../../../screens/hooks/useVideoController";
import Comments from "../post/Comments";
import ReelShared from "./ReelShared";
import api from "../../../component/api";
import SaveModal from "../post/SaveModal";
import Toast from "react-native-toast-message";

import LinearGradient from "react-native-linear-gradient";

const screenHeight = Dimensions.get("window").height;

const ReelItem = ({ reel, itemHeight, isActive, onClose, navigation }) => {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [username, setUsername] = useState(null);
  const [userid,setUserid] = useState(null)
  const [likes, setLikes] = useState(reel.likes || 0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(reel.comments || 0);
  const [shares, setShares] = useState(reel.shares || 0);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [savevisible, setSavevisible] = useState(false)
  const [savedatapass, setSavedatapass] = useState([])


  const hasSound = !!reel.sound;
  /*
    Decide the media type from the URL, defensively.

    `?.` only guards against null and undefined. Some rows come back with
    videoUrl as an array rather than a string, and then `.endsWith` is not a
    function — which crashed the whole reel list with
    "_reel$videoUrl.endsWith is not a function". Coercing to a string first
    makes an unexpected shape render as neither video nor image instead of
    taking the screen down.
  */
  const mediaUrl = Array.isArray(reel.videoUrl)
    ? String(reel.videoUrl[0] || '')
    : typeof reel.videoUrl === 'string'
      ? reel.videoUrl
      : '';
  const endsWithAny = (exts) => exts.some((e) => mediaUrl.toLowerCase().endsWith(e));

  const isVideo = endsWithAny(['.mp4', '.m3u8']);
  const isImage = endsWithAny(['.png', '.jpg', '.jpeg', '.webp']);

  const {
    videoRef,
    isVideoMuted,
    isPaused,
    setIsPaused
  } = useVideoController({
    isActive,
    videoUrl: reel.videoUrl,
    soundData: reel.sound,
    checkvideosoundisenableornot: reel.videosound,
    hasSound
  });

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleLike = async (reelId) => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      //  setUserid(userData._id);
      try {
        // 1️⃣ Get logged-in username     
        const endpoint = liked
          ? "/apis/reel/removeslike"
          : "/apis/reel/addlike";
        console.log('reelId.... ', reelId)
        // 3️⃣ Axios POST request
        const response = await api.post(endpoint, {
          username: userData._id,
          id: reelId,
        });

        // 4️⃣ Axios already parses JSON → no response.text()
        const result = response.data;
        console.log('....data..... ', response.data)
        // 5️⃣ Update UI state
        if (result?.totalLikes !== undefined) {
          setLikes(result.totalLikes);
          setLiked((prev) => !prev); // safer toggle
        }
      } catch (error) {
        console.error("Like toggle error:", error);
      }
    }

  };

  const handleShare = (reelId) => {
    setIsShareModalVisible(true);
  };
  //handleSave
  /*   const handleSave = (reelId) => {
      setIsShareModalVisible(true);
    };
   */

  const handleSavepost = async (item) => {
    console.log(JSON.stringify(item));
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      setSavedatapass("")
      if (!userData._id) {
        console.error("User ID is missing! Make sure you are logged in.");
        return;
      }
      // 2️⃣ CHECK: Is item._id correct?
      const reelid = item?._id;
      if (!reelid) {
        console.error("Reel ID is missing from the item object.");
        return;
      }
      console.log("Sending to Backend:", { username: userData._id, reelid: reelid });
      setSavedatapass(item)
      setSavevisible(true)
    }
    
  }


  const handleComment = async () => {
    const user = await AsyncStorage.getItem("username");
    setUsername(user);
    setShowComments(true);
  };

  useEffect(() => {
    const checkIfLiked = async () => {
      const user = await AsyncStorage.getItem("username");

      const res = await fetch(`${base.BASE_URL}/apis/reel/checkliked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, id: reel._id }),
      });
      const result = await res.json();
      if (result.liked) {
        setLiked(true);
      }
    };

    checkIfLiked();
  }, []);


  const handleSaveConfirm = async (item) => {
    console.log("Received in parent:", item);
    try {
      console.log('reelId.... ', JSON.stringify(item))
      // 3️⃣ Axios POST request
      const response = await api.post("/apis/reel/addSavepost", {
        username: userid,
        reelid: item._id,
      });
      const result = response.data;
      console.log('....data..... ', result.message)
      Toast.show({
        type: "success",
        text1: "Save in Timeline",
        text2: result?.message,
        position: "top",
        visibilityTime: 2000,
      });
    } catch (error) {
      if (error.response) {
        // This will tell you EXACTLY why the backend sent a 400
        console.log("SERVER ERROR MESSAGE:", error.response.data);
      } else {
        console.error("Savepost error:", error.message);
      }
    }

    setSavevisible(false);
  };


  return (
    <View style={[styles.container, { height: itemHeight || screenHeight }]}>
      {/*
        Scrims.

        Every control on this screen is white, and it was painted straight onto
        the media with nothing behind it — so on a light video, or on the plain
        placeholder shown when a reel has no media at all, the whole interface
        turned white-on-white and effectively disappeared. These two gradients
        sit above the media and below the controls, which is how the text stays
        readable whatever is playing underneath.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
        style={styles.scrimTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
        style={styles.scrimBottom}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Pressable onPress={() => {
          navigation.navigate("SearchReels")
        }}>
          <Feather name="search" size={24} color="white" />
        </Pressable>
      </View>

      {/* Media */}
      {isVideo ? (
        <Pressable onPress={togglePause} style={styles.flexFull}>
          <Video
            ref={videoRef}
            source={{ uri: base.BASE_URL + '/' + reel.videoUrl }}
            style={styles.flexFull}
            resizeMode="cover"
            repeat
            paused={isPaused || !isActive}
            muted={isVideoMuted}
          />
        </Pressable>
      ) : isImage ? (
        <>
          <Image
            source={{ uri: reel.videoUrl }}
            style={styles.flexFull}
            resizeMode="cover"
          />
        </>
      ) : (
        <View style={[styles.flexFull, styles.centerContent]}>
          <Text style={styles.titleText}>{reel.videoTitle}</Text>
        </View>
      )}

      {/* Bottom Left Info */}
      <View style={styles.bottomLeft}>
        <View style={styles.userRow}>
          <Text style={styles.userName}>{reel.userInfo?.name}</Text>
          {reel.followStatus !== "follow" && (
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ width: "90%" }}>
          <Text
            numberOfLines={expanded ? 0 : 2}
            style={styles.descriptionText}
          >
            {reel.videoTitle}
          </Text>
          {reel.videoTitle.length > 100 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.readMoreText}>
                {expanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        <Image
          source={{ uri: reel.userInfo?.image }}
          style={styles.userImage}
        />

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="star-outline" size={24} color="white" />
          <Text style={styles.actionText}>Give</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleLike(reel._id)}
          style={styles.actionBtn}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? "red" : "white"}
          />
          <Text style={styles.actionText}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleComment} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={24} color="white" />
          <Text style={styles.actionText}>{comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
          <Feather name="send" size={24} color="white" />
          <Text style={styles.actionText}>{shares}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          //onPress={handleSave} 
          onPress={() => {
            handleSavepost(reel)
          }}
          style={styles.actionBtn}>
          <Feather name="bookmark" size={24} color="white" />
          <Text style={styles.actionText}>{shares}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sponsored Banner */}
      <View style={styles.bottomSponsored}>
        <View style={styles.sponsoredContainer}>
          <Text style={styles.sponsoredText}>🔥 Sponsored Ad</Text>
          <TouchableOpacity>
            <Text style={styles.learnMoreText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </View>
      {
        showComments ?
          <Comments
            visible={showComments}
            data={reel}
            username={username}
            reelId={reel._id}
            onClose={() => setShowComments(false)}
          /> : ''
      }
      {
        isShareModalVisible ?
          <ReelShared
            visible={isShareModalVisible}
            data={reel}
            userid={reel?.userInfo?.userid}
            reelId={reel._id}
            onClose={() => setIsShareModalVisible(false)}
          />
          : ''
      }

      {

        savevisible ?
          <SaveModal
            visible={savevisible}
            savedata={savedatapass}
            onClose={() => setSavevisible(false)}
            onSave={handleSaveConfirm}
          />
          : ''
      }


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    // Media covers this; where a reel has none, black is what makes the white
    // overlay text legible instead of invisible.
    backgroundColor: "#000",
  },
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  scrimBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 340,
    zIndex: 1,
  },
  flexFull: {
    width: "100%",
    height: "100%",
  },
  header: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    color: "white",
    fontSize: 20,
  },
  bottomLeft: {
    position: "absolute",
    bottom: 128,
    left: 16,
    right: 90,   // keep clear of the action rail on the right
    zIndex: 5,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  userName: {
    color: "white",
    fontWeight: "600",
    marginRight: 10,
    fontSize: 16,
  },
  followBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "white",
    marginTop: 8, marginLeft: 15
  },
  followBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  descriptionText: {
    color: "white",
    lineHeight: 20,
    fontSize: 14,
  },
  readMoreText: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 4,
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 128,
    alignItems: "center",
    zIndex: 5,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 16,
  },
  actionBtn: {
    marginBottom: 20,
    alignItems: "center",
  },
  actionText: {
    color: "white",
  },
  bottomSponsored: {
    position: "absolute",
    bottom: 28,
    width: "100%",
    paddingHorizontal: 16,
    zIndex: 5,
  },
  sponsoredContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sponsoredText: {
    color: "white",
    fontWeight: "500",
  },
  learnMoreText: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
});

export default ReelItem;
