import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image, FlatList,
  TextInput,
  TouchableOpacity, StyleSheet,
  Alert,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Feather from "react-native-vector-icons/Feather";
import Entypo from "react-native-vector-icons/Entypo";
import ImageGallery from "./ImageGallery";
import axios from "axios";
import * as base from "../../../component/global";
import AsyncStorage from "@react-native-async-storage/async-storage";
//import Comments from "../../screen/reel/Comments";
import PostModalComents from "./PostModalComents";
import ShareModal from "./ShareModal";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { Provider, useDispatch, useSelector } from "react-redux";
import { followUserAsync } from "../../../store/slice/userSlice";
import { getUserData } from "../../../store/slice/authSlice";
import LinearGradient from "react-native-linear-gradient";
import ShareContentinPost from "./ShareContentinPost";
import api from "../../../component/api";
/* The five hand-drawn SVG icons went with the strip that used them. The
   action row is Facebook's now -- a lit-up reaction face or an outline thumb,
   drawn from the reaction set rather than from bespoke artwork. */
import Toast from "react-native-toast-message";
import SaveModal from "./SaveModal";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReportSheet from "./ReportSheet";
import { FB } from "../../../theme/social";
import ActionBar from "../../../component/social/Reactions";

const PostSection = ({ post: initialPost, navigation, userid }) => {
  // console.log('..get post data...' + post.userInfo.userid)
  const [post, setPost] = useState(initialPost); // <-- local state
  const dispatch = useDispatch();
  const { followedUsers, loading, error } = useSelector((state) => state.users);
  const { getUserData } = useSelector((state) => state.auth);
  // LinearGradient needs at least 2 colors — older posts store a single one.
  const bgColors = (Array.isArray(post?.xbackgroundcolor)
    ? post.xbackgroundcolor
    : String(post?.xbackgroundcolor ?? '').split(','))
    .map((c) => String(c).trim())
    .filter(Boolean);
  const gradientColors =
    bgColors.length >= 2 ? bgColors
      : bgColors.length === 1 ? [bgColors[0], bgColors[0]]
        : ['#ffffff', '#ffffff'];
  const viewfont = post?.xfontsize ? Number(post.xfontsize) : 14;
  const [showComments, setShowComments] = useState(null);
  const [commentVisible, setCommentVisible] = useState(null)
  const [dropdownVisible, setDropdownVisible] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  // const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [username, setUsername] = useState(null);

  /*
    The six-way reaction state, seeded from what the feed sent.

    The card used to keep a boolean and a count and drive them through
    /apis/reel/addlike -- a thumb, and nothing else, in a product whose backend
    has carried like / love / haha / wow / sad / angry since the Engagement
    build. ActionBar owns the interaction now; this holds the seed and the
    latest summary so the counts above the bar stay in step.
  */
  const [reactions, setReactions] = useState(
    post.reactions || { total: post.likes || 0, counts: {}, myReaction: null }
  );
  useEffect(() => {
    if (post.reactions) setReactions(post.reactions);
  }, [post.reactions]);
  const [sharedata, setSharedata] = useState([]);
  const [shareModal, setShareModal] = useState(false);
  const [followedUsersing, setFollowedUsersing] = useState([]);
  const [savevisible, setSavevisible] = useState(false)
  const [savedatapass, setSavedatapass] = useState([])
  // ✅ Check if URL is an image (IMPORTANT)
  const isImageUrl = (url) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0];
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanUrl);
  };

  // ✅ Filter only image URLs safely
  const imageUrls = Array.isArray(post.videoUrl)
    ? post.videoUrl.filter(isImageUrl)
    : [];

  ///last code
  /*
    Three sources, because one alone is not enough.

    followStatus is what the server said when this post was fetched, and it goes
    stale the moment you follow someone. followedUsersing is local and optimistic,
    but it dies with the component — and the feed re-renders these cards
    constantly, so on its own the button snapped back to "Follow" seconds later.
    The store outlives the card, which is what makes the change stick.
  */
  const authorId = String(post?.userInfo?.userid || "");
  const isFollowing =
    post?.followStatus === "follow" ||
    followedUsersing.includes(post?.userInfo?.userid) ||
    (Array.isArray(followedUsers) && followedUsers.includes(authorId));

  // Your own post never offers a follow button.
  const isOwnPost = String(post?.userInfo?.userid || "") === String(userid || "");

  const [reportOpen, setReportOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const openReport = () => {
    toggleDropdown(null);
    setReportOpen(true);
  };

  /* Hiding is optimistic: the card goes immediately and only comes back if the
     server refuses, because waiting on a round trip to remove something you
     asked to stop seeing feels broken. */
  const hideThisPost = async () => {
    toggleDropdown(null);
    setHidden(true);
    try {
      await api.post("/apis/safety/hide-post", { userId: userid, postId: post._id });
    } catch (e) {
      if (e?.response?.status !== 409) {
        setHidden(false);
        Toast.show({ type: "error", text1: "Could not hide that post" });
      }
    }
  };

  const unfollowAuthor = async () => {
    toggleDropdown(null);
    const followId = post?.userInfo?.userid;
    if (!followId) return;
    try {
      await dispatch(followUserAsync({ userId: userid, followId })).unwrap();
      setFollowedUsersing((prev) => prev.filter((id) => id !== followId));
      Toast.show({ type: "success", text1: `Unfollowed ${post?.userInfo?.name || ""}`.trim() });
    } catch {
      Toast.show({ type: "error", text1: "Could not unfollow" });
    }
  };

  const handleFollow = (followId) => {
    if (followedUsersing.includes(followId)) return;

    setFollowedUsersing((prev) => [...prev, followId]);

    dispatch(followUserAsync({ userId: userid, followId }))
      .unwrap()
      .catch(() => {
        // Only a real failure rolls back. Without .unwrap() a rejected thunk
        // resolves here, so genuine failures used to pass silently.
        setFollowedUsersing((prev) => prev.filter((id) => id !== followId));
        Toast.show({ type: "error", text1: "Could not follow that account" });
      });
  };


  const isWhiteBackground =
    gradientColors[0]?.toLowerCase() === '#ffffff' &&
    gradientColors[1]?.toLowerCase() === '#ffffff';

  const toggleDropdown = (id) => {
    setDropdownVisible(dropdownVisible === id ? null : id);
  };

  const handleMorePress = () => {
    Alert.alert("More Images", "You clicked to view more images.");
    // Or navigate to a full gallery screen
  };

  useEffect(() => {
  }, []);

  /*
    dayjs().fromNow() happily renders a future timestamp as "in 2 minutes",
    which is what a post carrying a slightly-ahead server clock looks like in
    the feed. Nothing in a timeline is ever legitimately in the future, so
    anything at or after now reads as "just now" instead.
  */
  const getTimeAgo = (time) => {
    const t = dayjs(time);
    if (!t.isValid()) return "";
    return t.isAfter(dayjs()) ? "just now" : t.fromNow();
  };

  /*
    The per-card `checkliked` round trip is gone.

    Every card in the feed fired its own POST to /apis/reel/checkliked on
    mount -- ten posts, ten requests, on every page -- to learn one boolean the
    feed could have sent all along. It also asked with AsyncStorage's
    "username", which holds an email, while the endpoint keys on the user id,
    so for reel-composer posts it answered false regardless of the truth.

    `reactions.myReaction` arrives with the post now and carries strictly more
    information: not just whether you reacted but which of the six it was.
  */
  useEffect(() => {
    setUsername(userid);
  }, [userid]);



  /* handleLike is gone with the button that called it: it posted to
     /apis/reel/addlike, which knows only "like". Reactions go through
     /apis/engagement/posts/:id/react inside ActionBar. */

  const handleComment = async (post) => {
    const user = await AsyncStorage.getItem("username");
    setUsername(user);
    setShowComments(true);
  };

  const handleProfile = (item) => {
    const authorid = item?.userInfo?.userid;
    if (!authorid) return;
    /*
      Your own name led to UserProfile, the screen written for looking at
      somebody else: a Follow button and a Message button pointed back at
      yourself. Your own posts belong on your own wall.
    */
    if (String(authorid) === String(userid || "")) {
      navigation.navigate("MyWall");
      return;
    }
    navigation.navigate("UserProfile", {
      userid: authorid,
      name: item.userInfo.name,
      image: item.userInfo.image
    })
  }
  const shareHandle = (item) => {
    setShareModal(true)
    setSharedata(item)
  }

  const handleFollow_off = (followId) => {
    //  Alert.alert(followId + ' Follow ');
    const userId = userid; //67dc057dd0c338e049d45603
    console.log("current user id....." + userid);
    dispatch(followUserAsync({ userId, followId }));
    setFollowedUsersing((prev) => [...prev, followId]);
  };

  const handleCommentAdded = (newComment) => {
    setPost((prevPost) => ({
      ...prevPost,
      commentsdetails: [...(prevPost.commentsdetails || []), newComment],
    }));
  };

  const handleSavepost = async (item) => {
    // Alert.alert(JSON.stringify(item));
    setSavedatapass("")
    if (!userid) {
      console.error("User ID is missing! Make sure you are logged in.");
      return;
    }
    // 2️⃣ CHECK: Is item._id correct?
    const reelid = item?._id;
    if (!reelid) {
      console.error("Reel ID is missing from the item object.");
      return;
    }
    console.log("Sending to Backend:", { username: userid, reelid: reelid });
    setSavevisible(true)
    setSavedatapass(item)
  }

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

  if (hidden) return null;

  return (
    /*
      A Facebook feed card: a white surface on the grey page, full-bleed, with
      the page itself showing through as the gap between cards. It used to be a
      white box on a white page ringed with a 1px #f2f2f2 border, which is why
      the timeline read as one undifferentiated column rather than a stack of
      separate posts.
    */
    <View style={styles.card}>
      <View>
        <View style={styles.header}>
          {/* Username and User logo */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 0, borderColor: 'green'
          }}>
            <TouchableOpacity onPress={() => {
              handleProfile(post)
            }}>
              <Image
                source={
                  post.userInfo?.image
                    ? { uri: base.BASE_URL + '/' + post.userInfo.image }
                    : require("../../../assets/user.png")
                }
                style={styles.avatar}
              />
              {/*  <Text>{base.BASE_URL + post.userInfo.image}</Text> */}
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View>
                <TouchableOpacity onPress={() => {
                  handleProfile(post)
                }}>
                  {/* Verified accounts were indistinguishable from everyone
                      else — the flag was never sent to the feed, and never
                      drawn if it had been. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.authorName}>
                      {post.userInfo?.name}
                    </Text>
                    {post.userInfo?.verifiedBadge ? (
                      <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                    ) : null}
                  </View>
                  {/* Facebook puts the audience beside the timestamp -- it is
                      the only place you can tell who can see what you posted. */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{getTimeAgo(post?.xtime)}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons
                      name={
                        post?.audience === 'onlyMe' ? 'lock-closed'
                          : post?.audience === 'followers' || post?.audience === 'closeFriends' ? 'people'
                            : 'earth'
                      }
                      size={11}
                      color={FB.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
              {/*
                One follow control, not two.

                There were two blocks here rendering side by side — one keyed on
                followStatus == "not follow", the other on !isFollowing — so a
                post from someone you do not follow showed both "Follow" and
                "follow" next to each other. `isFollowing` already folds in the
                optimistic local list, so it is the single source of truth.

                It is also hidden on your own posts, where offering to follow
                yourself made no sense.
              */}
              {!isOwnPost && (
                isFollowing ? (
                  <View style={styles.followingChip}>
                    <Text style={styles.followingChipText}>Following</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.followBtn}
                    onPress={() => handleFollow(post?.userInfo?.userid)}
                    disabled={followedUsersing.includes(post?.userInfo?.userid)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.followBtnText}>Follow</Text>
                  </TouchableOpacity>
                )
              )}

            </View>

          </View>

          {/* Post Dropdown */}
          <TouchableOpacity onPress={() => toggleDropdown(post._id)}>
            <Entypo name="dots-three-horizontal" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        {/* Dropdown */}
        {dropdownVisible === post._id && (
          <View
            style={{
              position: 'absolute',
              right: 16,
              top: 32,
              zIndex: 10,
              backgroundColor: 'white',
              borderRadius: 6,
              padding: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 3, // Android shadow
            }}
          >
            {/*
              These were three bare <Text> elements — no touchable, no handler.
              The menu looked like moderation was on offer and did nothing at
              all. Every one of them has had a working endpoint for a while.
            */}
            <TouchableOpacity style={styles.menuRow} onPress={openReport}>
              <Ionicons name="flag-outline" size={16} color="#B42318" />
              <Text style={[styles.menuText, { color: '#B42318' }]}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={hideThisPost}>
              <Ionicons name="eye-off-outline" size={16} color="#374151" />
              <Text style={styles.menuText}>Hide post</Text>
            </TouchableOpacity>

            {!isOwnPost && isFollowing && (
              <TouchableOpacity style={styles.menuRow} onPress={unfollowAuthor}>
                <Ionicons name="person-remove-outline" size={16} color="#374151" />
                <Text style={styles.menuText}>Unfollow</Text>
              </TouchableOpacity>
            )}
          </View>

        )}

        <ReportSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="post"
          targetId={post?._id}
          targetName={post?.userInfo?.name}
        />

        {/* Post Description */}
        <View style={{
          width: '100%', backgroundColor: 'white', borderWidth: 0,
          borderColor: '#000'
        }}>
          <LinearGradient
            colors={gradientColors}
            style={{
              width: '100%',
              padding: 10,
              height: isWhiteBackground ? 'auto' : 250,
              justifyContent: isWhiteBackground ? 'flex-start' : 'center',
              alignItems: isWhiteBackground ? 'flex-start' : 'center',
              borderRadius: 0,
            }}
          >
            <Text
              style={{
                // 15px is Facebook's body size. 14 is the single most common
                // reason a rebuilt feed looks close but not right.
                fontSize: isWhiteBackground ? (post?.xfontsize ? viewfont : 15) : viewfont,
                lineHeight: isWhiteBackground ? 20 : undefined,
                color: FB.text,
                marginBottom: isWhiteBackground ? 8 : 0,
                textAlign: isWhiteBackground ? 'left' : 'center',
              }}
              numberOfLines={expanded ? 0 : 5}
            >
              {post.videoTitle || ''}
            </Text>



            {/* end share content */}
            {/* A reel posted from the camera carries no caption at all, and
                reading `.length` off undefined took the whole list down with
                "Cannot read property 'length' of undefined" the moment one
                reached the wall. */}
            {(post.videoTitle || '').length > 100 && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                <Text
                  style={{
                    fontSize: 14,
                    marginTop: 8,
                    textAlign: isWhiteBackground ? 'left' : 'center',
                  }}
                >
                  {expanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

        </View>
        {/* Share content here if some one want to share your timeline */}
        {
          post.sharepost ?
            <View style={{ width: '100%' }}>
              <ShareContentinPost sharedata={post.sharepost} base={base.BASE_URL} />
            </View>
            : null
        }
        {imageUrls.length > 0 && (
          <View style={styles.mediaBox}>
            <ImageGallery
              videoUrls={imageUrls} //base.BASE_URL + 
              onMorePress={handleMorePress}
            />
          </View>
        )}

        {/*
          Like / Comment / Share, the Facebook way.

          What was here was a 120px-wide strip of three SVG icons with raw
          counts beside them, plus a save icon floated to the right. It drove a
          binary like through the legacy endpoint, so the six reactions the
          backend has always supported were unreachable, and the counts had no
          summary line -- you could not see who had reacted or with what.

          ActionBar owns the whole interaction: tap to like, hold for the
          reaction picker, and the summary row above it showing the top three
          faces and "You and N others". Save keeps its own affordance in the
          header menu's place, at the end of the row.
        */}
        <ActionBar
          postId={post._id}
          userId={userid}
          initialCounts={reactions.counts}
          initialTotal={reactions.total}
          initialMine={reactions.myReaction}
          onChanged={setReactions}
          onComment={() => handleComment(post)}
          onShare={() => shareHandle(post)}
        />

        <TouchableOpacity
          style={styles.saveRow}
          onPress={() => handleSavepost(post)}
          activeOpacity={0.6}
        >
          <Ionicons name="bookmark-outline" size={16} color={FB.textSecondary} />
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
      {
        showComments ?
          <PostModalComents
            visible={showComments}
            data={post}
            username={userid}
            reelId={post._id}
            onClose={() => setShowComments(false)}
            onCommentAdded={handleCommentAdded} // <-- callback
          />
          : ''
      }

      {
        shareModal ?
          <ShareModal
            visible={shareModal}
            data={sharedata}
            userid={post?.userInfo?.userid}
            reelId={post._id}
            onClose={() => setShareModal(false)}
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
export default PostSection;

const styles = StyleSheet.create({
  /* The card. Full-bleed on a phone: square corners, no side margin, and the
     grey page showing through underneath as the only separator. */
  card: {
    backgroundColor: FB.surface,
    marginBottom: FB.card.gap,
    paddingTop: FB.card.padding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FB.card.padding,
    marginBottom: 10,
  },
  avatar: {
    width: FB.avatar.md,
    height: FB.avatar.md,
    borderRadius: FB.avatar.md / 2,
    marginRight: 8,
    backgroundColor: FB.fill,
  },
  authorName: { ...FB.font.name },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  metaText: { ...FB.font.meta },
  metaDot: { ...FB.font.meta, marginHorizontal: 4 },

  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: FB.card.padding,
    paddingBottom: 10,
    paddingTop: 2,
  },
  saveText: { ...FB.font.meta, fontWeight: '600' },

  /* Follow control — one pill, two states. Sized so the row height does not
     jump when it flips between them. */
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 6,
    minWidth: 150,
  },
  menuText: { fontSize: 14, color: '#374151' },

  followBtn: {
    backgroundColor: FB.primary,
    paddingHorizontal: 14,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  followingChip: {
    paddingHorizontal: 14,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  followingChipText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  viewcolor: {
    width: '100%',
    padding: 10,
    borderRadius: 8, height: 250
  },
  text: {
    fontSize: 14,
    marginBottom: 8,
    color: '#000',
  },
  toggleText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#000',
    fontWeight: 'bold',
  },
});
