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
import LoveIcon from "../../../assets/post/love.svg";
import RedLoveIcon from "../../../assets/post/red_love.svg";
import CommentIcon from "../../../assets/post/comment.svg";
import ShareIcon from "../../../assets/post/share.svg";
import SaveIcon from "../../../assets/post/save.svg";
import Toast from "react-native-toast-message";
import SaveModal from "./SaveModal";
import Ionicons from "react-native-vector-icons/Ionicons";

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
  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(false);
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
  const isFollowing =
    post?.followStatus === "follow" ||
    followedUsersing.includes(post?.userInfo?.userid);

  const handleFollow = (followId) => {
    if (followedUsersing.includes(followId)) return;

    setFollowedUsersing((prev) => [...prev, followId]);

    dispatch(followUserAsync({ userId: userid, followId }))
      .catch(() => {
        // rollback
        setFollowedUsersing((prev) =>
          prev.filter((id) => id !== followId)
        );
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

  const getTimeAgo = (time) => {
    return dayjs(time).fromNow();
  };

  useEffect(() => {
    const checkIfLiked = async () => {
      const user = await AsyncStorage.getItem("username");
      setUsername(userid);
      // fetch from your API if user has liked this reel
      const res = await fetch(`${base.BASE_URL}/apis/reel/checkliked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, id: post._id }),
      });
      const result = await res.json();
      if (result.liked) {
        setLiked(true);
      }
    };

    checkIfLiked();
  }, []);



  const handleLike = async (reelId) => {
    console.log('....like post.....', reelId)
    setLiked(prev => !prev);
    setLikes(prev => prev + (liked ? -1 : 1));
    try {
      // 1️⃣ Get logged-in username     
      const endpoint = liked
        ? "/apis/reel/removeslike"
        : "/apis/reel/addlike";
      console.log('reelId.... ', reelId)
      // 3️⃣ Axios POST request
      const response = await api.post(endpoint, {
        username: userid,
        id: reelId,
      });

      // 4️⃣ Axios already parses JSON → no response.text()
      const result = response.data;
      console.log('....data..... ', response.data)
      // 5️⃣ Update UI state
      if (result?.totalLikes !== undefined) {
        //   setLikes(result.totalLikes);
        //   setLiked((prev) => !prev); // safer toggle
      }
    } catch (error) {
      console.error("Like toggle error:", error);
    }
  };

  const handleComment = async (post) => {
    const user = await AsyncStorage.getItem("username");
    setUsername(user);
    setShowComments(true);
  };

  const handleProfile = (item) => {
    // Alert.alert(item.userInfo.userid)
    navigation.navigate("UserProfile", {
      userid: item.userInfo.userid,
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

  return (
    <View style={{
      marginBottom: 1,
      borderWidth: 1, borderColor: '#f2f2f2',
      marginBottom: 2,
      padding: 0 //7
    }}>
      <View style={{
        marginBottom: 2,
        //padding: 3, backgroundColor: 'white'
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8, padding: 7
        }}>
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
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 50, marginRight: 7 // fully rounded avatar
                }}
              />
              {/*  <Text>{base.BASE_URL + post.userInfo.image}</Text> */}
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View>
                <TouchableOpacity onPress={() => {
                  handleProfile(post)
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>
                    {post.userInfo?.name}
                  </Text>
                  <Text style={{ fontSize: 12 }}>
                    {getTimeAgo(post?.xtime)}
                  </Text>
                </TouchableOpacity>
              </View>
             {/*  <Text>x: {post?.followStatus}</Text> */}
               {
                post?.followStatus == "not follow" ?
                  <TouchableOpacity
                    style={{ backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 9999 }}
                    onPress={() => {
                      handleFollow(post?.userInfo?.userid)
                    }}
                    disabled={followedUsersing.includes(post?.userInfo?.userid)}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      {post?.followStatus === "follow" ? 'following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                  : null
              } 
              {
                !isFollowing ? (
                  <TouchableOpacity onPress={() => handleFollow(post?.userInfo?.userid)} 
                    style={{ backgroundColor: '#000', paddingHorizontal: 16, 
                    paddingVertical: 4, borderRadius: 9999 }}>
                     <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      follow
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View   
                  style={{ backgroundColor: '#f2f2f2', paddingHorizontal: 16, 
                  paddingVertical: 4, borderRadius: 9999 }}>
                    <Text>Following</Text>
                  </View>
                )
              }

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
            <Text style={{ fontSize: 14, paddingVertical: 4 }}>Report</Text>
            <Text style={{ fontSize: 14, paddingVertical: 4 }}>Hide Post</Text>
            <Text style={{ fontSize: 14, paddingVertical: 4 }}>Unfollow</Text>
          </View>

        )}
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
                fontSize: viewfont,
                marginBottom: isWhiteBackground ? 8 : 0,
                textAlign: isWhiteBackground ? 'left' : 'center',
              }}
              numberOfLines={expanded ? 0 : 2}
            >
              {post.videoTitle}
            </Text>



            {/* end share content */}
            {post.videoTitle.length > 100 && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                <Text
                  style={{
                    fontSize: 14,
                    marginTop: 8,
                    textAlign: isWhiteBackground ? 'left' : 'center',
                  }}
                >
                  {expanded ? 'Read less' : 'Read more'}
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

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8, marginTop: 5,
            width: '100%', borderWidth: 0,
            borderColor: 'red',
            padding: 7
          }}
        >
          <View style={{
            width: 120, borderWidth: 0, borderColor: '#000',
            height: 25, display: 'flex', flexDirection: 'row',
            justifyContent: 'space-between'
          }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}
              onPress={() => handleLike(post._id)}
            >
              {liked ? (
                <>
                  <Ionicons
                    name="heart"
                    size={18}
                    color="red"
                  />
                </>
              ) : (
                <LoveIcon width={18} height={18} stroke="gray" fill="none" />
              )}
              {likes > 0 && (
                <Text style={{
                  fontSize: 14,
                  color: '#4B5563', marginLeft: 6
                }}>{likes}</Text>)}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => handleComment(post)}
            >

              <CommentIcon width={18} height={18} />
              {
                post.commentsdetails?.length > 0 ?
                  <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 4 }}> {post.commentsdetails?.length}</Text>
                  : null
              }

            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                shareHandle(post)
              }}
            >
              <ShareIcon width={18} height={18} />
              {post.shares > 0 ?
                <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 4 }}>{post.shares}</Text>
                : null
              }

            </TouchableOpacity>

          </View>
          <View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                handleSavepost(post)
              }}
            >
              <SaveIcon />
            </TouchableOpacity>
          </View>
        </View>
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
