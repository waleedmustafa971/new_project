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
import GiftModal from "../live/GiftModal";
import Toast from "react-native-toast-message";

import LinearGradient from "react-native-linear-gradient";

const screenHeight = Dimensions.get("window").height;

const ReelItem = ({ reel, itemHeight, isActive, onClose, navigation, viewerId, onDeleted }) => {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [username, setUsername] = useState(null);
  const [userid,setUserid] = useState(viewerId || null)
  const [likes, setLikes] = useState(reel.likes || 0);
  /*
    Seeded from the feed, which now says whether this viewer liked this reel.
    It used to start false and be corrected by a per-reel round trip that asked
    with the wrong identity, so the heart was always empty -- and tapping an
    already-liked reel asked the server to like it again and got a 400 back.
  */
  const [liked, setLiked] = useState(!!reel.liked);
  /*
    Whether the reel in hand was shaped for the person holding it.

    `liked`, `isOwner` and `followStatus` are all viewer-relative, and this reel
    may have been fetched by a list that had not resolved the session yet. When
    the stamp does not match, those three fields answer for someone else and are
    re-derived rather than displayed.
  */
  const payloadViewer = reel?.viewer ? String(reel.viewer) : null;
  const viewerMatches = !!userid && payloadViewer === String(userid);
  const [likeBusy, setLikeBusy] = useState(false);
  const [following, setFollowing] = useState(
    viewerMatches ? reel.followStatus === "follow" : false
  );
  const [followBusy, setFollowBusy] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [giftVisible, setGiftVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [stars, setStars] = useState(reel.stars || 0);
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
  const rawMedia = Array.isArray(reel.videoUrl) ? reel.videoUrl[0] : reel.videoUrl;
  /*
    Three shapes reach here: a plain string, an array, and { url, type } —
    the last written by older rows. Only the first two were handled, so an
    object collapsed to '' and matched neither the video nor the image
    branch: the reel rendered as a bare caption on black and never played.
  */
  const mediaUrl =
    typeof rawMedia === 'string'
      ? rawMedia
      : rawMedia && typeof rawMedia === 'object'
        ? String(rawMedia.url || rawMedia.uri || '')
        : '';

  /*
    HLS output is stored with a leading slash and older files without one, so
    concatenating BASE_URL + '/' + path gave a double slash for the new reels.
    Absolute urls are left alone.
  */
  const mediaSrc = !mediaUrl
    ? null
    : /^(https?:|file:|data:)/.test(mediaUrl)
      ? mediaUrl
      : `${base.BASE_URL}/${mediaUrl.replace(/^[/]+/, '')}`;

  const avatarSrc = reel.userInfo?.image
    ? /^(https?:|file:|data:)/.test(reel.userInfo.image)
      ? reel.userInfo.image
      : `${base.BASE_URL}/${String(reel.userInfo.image).replace(/^[/]+/, '')}`
    : null;
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

  /*
    Who is watching.

    `userdata._id` is the one identity the reel endpoints accept -- likes,
    follows, gifts and deletes are all keyed on it. The old code reached for
    AsyncStorage's "username" in places, which holds a display name, so those
    calls asked the server about a user that does not exist and were answered
    accordingly: a like that never registered, a liked state that never showed.
  */
  const resolveViewerId = async () => {
    if (userid) return userid;
    const jsonValue = await AsyncStorage.getItem("userdata");
    const id = jsonValue ? JSON.parse(jsonValue)?._id : null;
    if (id) setUserid(id);
    return id || null;
  };

  /*
    Like / unlike.

    The heart moves first and is put back if the server refuses, because a like
    that waits for a round trip feels broken on a slow connection. What the
    server answers wins in the end: both endpoints return the real total and the
    resulting `liked`, so a state that had drifted is corrected by using the
    reel rather than by another request.
  */
  const handleLike = async (reelId) => {
    const me = await resolveViewerId();
    if (!me) return;
    if (likeBusy) return;

    const wasLiked = liked;
    const wasLikes = likes;

    setLikeBusy(true);
    setLiked(!wasLiked);
    setLikes(Math.max(0, wasLikes + (wasLiked ? -1 : 1)));

    try {
      const endpoint = wasLiked
        ? "/apis/reel/removeslike"
        : "/apis/reel/addlike";

      const response = await api.post(endpoint, {
        username: me,
        id: reelId,
      });

      const result = response.data;
      if (typeof result?.totalLikes === "number") setLikes(result.totalLikes);
      if (typeof result?.liked === "boolean") setLiked(result.liked);
    } catch (error) {
      setLiked(wasLiked);
      setLikes(wasLikes);
      console.log("Like toggle failed:", error?.response?.data || error.message);
      Toast.show({
        type: "error",
        text1: "Couldn't update your like",
        position: "top",
        visibilityTime: 2000,
      });
    } finally {
      setLikeBusy(false);
    }
  };

  /*
    Is this the viewer's own reel?

    The server answers this now (`isOwner`), because it is the only side that
    knows who the reel belongs to when the viewer arrived without an id. The
    local comparison is the fallback for payloads written before that field
    existed. Getting it wrong is what put a Follow button on your own reel and
    left you no way to delete it.
  */
  const authorId = reel?.userInfo?.userid || reel?.username;
  const isOwner = userid
    ? !!authorId && String(authorId) === String(userid)
    : reel?.isOwner === true;

  const handleFollow = async () => {
    const me = await resolveViewerId();
    if (!me || !authorId || followBusy) return;
    if (String(authorId) === String(me)) return;

    const wasFollowing = following;
    setFollowBusy(true);
    setFollowing(!wasFollowing);

    try {
      const endpoint = wasFollowing ? "/apis/reel/Unfollow" : "/apis/reel/Addfollow";
      const res = await api.post(endpoint, { userId: me, followId: authorId });

      /*
        A private account answers "requested", not "following". Showing Following
        for a request still waiting on approval tells the viewer they are seeing
        posts they are not.
      */
      if (res.data?.status === "following") {
        setFollowing(true);
      } else if (res.data?.status === "requested") {
        setFollowing(false);
        Toast.show({
          type: "success",
          text1: "Follow request sent",
          position: "top",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      setFollowing(wasFollowing);
      console.log("Follow failed:", error?.response?.data || error.message);
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Couldn't update follow",
        position: "top",
        visibilityTime: 2000,
      });
    } finally {
      setFollowBusy(false);
    }
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete reel?",
      "This removes it from your profile and from everyone's feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const me = await resolveViewerId();
            if (!me || !reel?._id) return;
            try {
              await api.delete(`/apis/posting/posts/${reel._id}`, {
                params: { userId: me },
              });
              Toast.show({
                type: "success",
                text1: "Reel deleted",
                position: "top",
                visibilityTime: 2000,
              });
              if (onDeleted) onDeleted(reel._id);
              else if (onClose) onClose();
            } catch (error) {
              console.log("Delete failed:", error?.response?.data || error.message);
              Toast.show({
                type: "error",
                text1: error?.response?.data?.message || "Couldn't delete this reel",
                position: "top",
                visibilityTime: 2500,
              });
            }
          },
        },
      ]
    );
  };

  /*
    Send a gift.

    The catalogue and the charge both come from the server, so what the sheet
    shows and what leaves the wallet cannot disagree -- the same arrangement
    live gifting already uses. Before this, "Give" had no handler at all.
  */
  const handleGive = async () => {
    const me = await resolveViewerId();
    if (!me) return;
    if (isOwner) {
      Toast.show({
        type: "info",
        text1: "You can't gift your own reel",
        position: "top",
        visibilityTime: 2000,
      });
      return;
    }
    setGiftVisible(true);
  };

  const handleSendGift = async (gift) => {
    const me = await resolveViewerId();
    if (!me || !gift?._id || sendingGift) return;

    setSendingGift(true);
    try {
      const res = await api.post("/apis/reel/gift", {
        userId: me,
        reelId: reel._id,
        giftId: gift._id,
        quantity: 1,
      });
      if (typeof res.data?.stars === "number") setStars(res.data.stars);
      setGiftVisible(false);
      Toast.show({
        type: "success",
        text1: `Sent ${gift.name}`,
        text2: `${res.data?.coinsSpent ?? gift.coinCost} coins — ${res.data?.senderCoins ?? 0} left`,
        position: "top",
        visibilityTime: 2500,
      });
    } catch (error) {
      const data = error?.response?.data;
      console.log("Gift failed:", data || error.message);
      Toast.show({
        type: "error",
        // 402 carries the balance and the price, which is the whole answer to
        // "why did nothing happen".
        text1: data?.error || "Couldn't send that gift",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setSendingGift(false);
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

  /*
    Only asked when the feed did not already say.

    Every list endpoint now returns `liked` for the viewer, so the common path
    costs nothing. This stays for reels reaching the viewer from somewhere that
    does not -- a share link, an older cached payload -- and it asks with the
    user id, which is what the endpoint compares against.
  */
  useEffect(() => {
    if (viewerMatches && typeof reel.liked === "boolean") return;
    let cancelled = false;

    (async () => {
      try {
        const me = await resolveViewerId();
        if (!me || !reel?._id) return;
        const res = await api.post("/apis/reel/checkliked", {
          username: me,
          id: reel._id,
        });
        if (!cancelled) setLiked(!!res.data?.liked);
      } catch (error) {
        // A reel whose like state cannot be read still plays; leaving the
        // heart empty is a better failure than taking the viewer down.
        console.log("checkliked failed:", error?.response?.data || error.message);
      }
    })();

    return () => { cancelled = true; };
  }, [reel?._id, viewerMatches]);

  // The viewer can change route-to-route; keep the id in step with the prop.
  useEffect(() => {
    if (viewerId && viewerId !== userid) setUserid(viewerId);
  }, [viewerId]);

  // Adopt the follow state as soon as the payload is answering for this viewer
  // -- it may only become trustworthy after the session finishes loading.
  useEffect(() => {
    if (viewerMatches) setFollowing(reel.followStatus === "follow");
  }, [viewerMatches, reel?.followStatus]);


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
        <View style={styles.headerRight}>
          <Pressable onPress={() => {
            navigation.navigate("SearchReels")
          }}>
            <Feather name="search" size={24} color="white" />
          </Pressable>
          {/* The author's own controls. Nothing here belongs to anyone else,
              so the whole affordance is absent rather than disabled. */}
          {isOwner && (
            <Pressable
              onPress={() => setMenuVisible((v) => !v)}
              style={styles.headerMenuBtn}
              hitSlop={10}
            >
              <Feather name="more-vertical" size={22} color="white" />
            </Pressable>
          )}
        </View>
      </View>

      {isOwner && menuVisible && (
        <>
          {/* Tapping anywhere else closes it -- a menu with no way out but its
              own button is how you end up stuck on a paused reel. */}
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.ownerMenu}>
            <TouchableOpacity style={styles.ownerMenuItem} onPress={handleDelete}>
              <Feather name="trash-2" size={16} color="#E53935" />
              <Text style={styles.ownerMenuTextDanger}>Delete reel</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Media */}
      {isVideo ? (
        <Pressable onPress={togglePause} style={styles.flexFull}>
          <Video
            ref={videoRef}
            source={{ uri: mediaSrc }}
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
            source={{ uri: mediaSrc }}
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
          {/* Never offered on your own reel: there is nobody to follow. */}
          {!isOwner && (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollow}
              disabled={followBusy}
            >
              <Text style={styles.followBtnText}>
                {following ? "Following" : "Follow"}
              </Text>
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
          {/* A reel posted without a caption has no videoTitle, and reading
              .length off it took the whole feed down. */}
          {(reel.videoTitle?.length || 0) > 100 && (
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
          source={
            avatarSrc
              ? { uri: avatarSrc }
              : require("../../../assets/user.png")
          }
          style={styles.userImage}
        />

        <TouchableOpacity style={styles.actionBtn} onPress={handleGive}>
          <Ionicons name="star-outline" size={24} color="white" />
          <Text style={styles.actionText}>{stars > 0 ? stars : "Give"}</Text>
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
          {/* This read {shares} -- the same number as the button above it,
              which made saving look like it was counting shares. */}
          <Text style={styles.actionText}>Save</Text>
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

      {giftVisible && (
        <GiftModal
          visible={giftVisible}
          sending={sendingGift}
          onClose={() => setGiftVisible(false)}
          onSendGift={handleSendGift}
        />
      )}

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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerMenuBtn: {
    marginLeft: 18,
  },
  /* Full-screen and below the menu, so a tap outside dismisses it without
     reaching the video underneath and toggling playback. */
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 19,
  },
  ownerMenu: {
    position: "absolute",
    top: 46,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 160,
    zIndex: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  ownerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ownerMenuTextDanger: {
    color: "#E53935",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
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
  // Following is a state you can leave, not a call to action -- it reads
  // quieter so Follow stays the button that asks to be pressed.
  followBtnActive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.55)",
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
