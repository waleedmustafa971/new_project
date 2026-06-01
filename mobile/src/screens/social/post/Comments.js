import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  ScrollView,
  Pressable,
} from "react-native";
import * as base from "../../../component/global";
import axios from "axios";
import Ionicons from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';


const Comments = ({ data, visible, onClose, username, reelId }) => {
  const [comments, setComments] = useState([]); //
  const [totalcomments, setTotalcomments] = useState(null); //
  const [newComment, setNewComment] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [replytext, setReplytext] = useState(null);
  const inputRef = React.useRef(null);

  useEffect(() => {
    setLoading(true);
    // setComments(data?.commentsdetails);
    setComments(data?.commentsdetails);
    setTotalcomments(data?.comments);
    setLoading(false);
  }, [data]);

  const addComment = async () => {
    setLoading(true);
    if (replytext) {
      console.log("reply id" + reelId);
      //reply Insert
      const commentId = replytext._id;
      const message = newComment;
      const userinfo = replytext.user;
      console.log("Reply Comments..." + JSON.stringify(replytext));
      try {
        const response = await axios.post(
          `${base.BASE_URL}/apis/reel/addreply`,
          {
            reelId,
            commentId,
            username,
            message,
            userinfo,
          }
        );

        if (response.data.success) {
          console.log("Reply added:", response.data.result);
          setLoading(false);
          setNewComment("");
          //return true;
        } else {
          console.warn("Reply failed:", response.data);
          setLoading(false);
          //return false;
        }
      } catch (error) {
        setLoading(false);
        console.error("Add reply error:", error.message);
        return false;
      }
    } else {
      console.log("Not reply... " + reelId);

      ////comments Insert
      console.log("...comments..." + reelId);
      try {
        const response = await fetch(base.BASE_URL + `/apis/reel/addcomments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            id: reelId,
            message: newComment,
          }),
        });
        const text = await response.text();
        const result = JSON.parse(text);
        //  console.log("Parsed response: add comments", result.comments);
        setLoading(false);
        setComments((prevComments) => {
          const existingIds = new Set(prevComments.map((c) => c._id));
          const newUniqueComments = result.comments.filter(
            (c) => !existingIds.has(c._id)
          );
          return [...prevComments, ...newUniqueComments];
        });

        setNewComment("");
        // ✅ Now dismiss the keyboard
        Keyboard.dismiss();
      } catch (error) {
        setLoading(false);
        //  console.error("Comments Error:", error);
      }
    }
  };
  const replyHandler = (item) => {
    setReplytext(item);
    console.log("reply data... " + JSON.stringify(item));
    setNewComment(`@${item.user.name} `); // prefill with mention
    setTimeout(() => {
      inputRef.current?.focus(); // focus the input
    }, 100);
  };
  const onReplyLike = async (item) => {
    //onReplyLike
    //end onReplyLike
    console.log("reply id" + reelId);
    //reply Insert
    const commentId = item._id;
    const userinfo = item.user;
    console.log("Reply Comments..." + JSON.stringify(item));
    try {
      const response = await axios.post(
        `${base.BASE_URL}/apis/reel/addcommentsylike`,
        {
          reelId,
          commentId,
          username,
          userinfo,
        }
      );

      if (response.data.success) {
        console.log("Reply added likes:", response.data.result);
        setLoading(false);
        setNewComment("");
        //return true;
      } else {
        console.warn("Reply failed likes:", response.data);
        setLoading(false);
        //return false;
      }
    } catch (error) {
      setLoading(false);
      console.error("Add reply error:", error.message);
      return false;
    }
  };
  /* behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} */
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Text style={styles.modalTitle}>Comments </Text>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <>
                <View style={{ marginBottom: 10 }}>
                  <View style={styles.commentItem}>
                    <Image
                      source={
                        item.user?.image
                          ? { uri: item.user.image }
                          : require("../../../assets/user.png")
                      }
                      style={styles.profilePic}
                    />
                    <View className="bg-sliver">
                      <Text style={styles.commentUser}>{item.user?.name}</Text>
                      <Text style={styles.commentText}>{item.message}</Text>
                    </View>
                  </View>
<View style={styles.commentContainer}>
  <View style={styles.commentTopRow}>
    <View style={styles.commentActions}>
      <Text style={styles.timestamp}>1 d ago</Text>
      <TouchableOpacity onPress={() => onReplyLike(item)} style={styles.likeButton}>
        <EvilIcons name="like" size={24} color="black" />
        <Text>Like</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => replyHandler(item)}>
        <Text>Reply</Text>
      </TouchableOpacity>
    </View>

    {item.reply.length > 0 && (
      <View style={styles.replyCount}>
        <Text style={styles.replyCountText}>{item.reply.length}</Text>
        <Ionicons name="heart" size={17} color="red" style={styles.replyHeartIcon} />
      </View>
    )}
  </View>

  {item.reply.length > 0 && (
    <View style={styles.replyContainer}>
      {item.reply.map((replyItem, index) => (
        <View key={replyItem._id || index} style={[styles.commentItem, { marginBottom: 8 }]}>
          <Image
            source={
              replyItem.userinfo?.image
                ? { uri: replyItem.userinfo.image }
                : require("../../../assets/user.png")
            }
            style={styles.profilePic}
          />
          <View style={styles.replyBubble}>
            <Text style={styles.commentUser}>
              {replyItem.userinfo?.name || "Unknown User"}
            </Text>
            {replyItem.message && (
              <Text style={styles.replyText}>{replyItem.message}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )}
</View>

                </View>
              </>
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false} // stop right side indicator
            contentContainerStyle={{ paddingBottom: 100 }} // 👈 key fix
          />
          {/* Keyboard View */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // adjust if you have headers
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputInner}>
                  {/* 📸 Camera Icon - left inside input */}
                  <Ionicons
                    name="camera"
                    size={20}
                    color="gray"
                    style={styles.cameraIcon}
                  />

                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#888"
                    value={newComment}
                    onChangeText={setNewComment}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    returnKeyType="send"
                    onSubmitEditing={addComment}
                  />

                  {/* Right-side Icons */}
                  {loading ? (
                    <ActivityIndicator style={styles.rightIcon} />
                  ) : newComment.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setTimeout(() => addComment(), 50);
                      }}
                      style={styles.rightIcon}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="send" size={22} color="blue" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.rightIcon}>
                      <TouchableOpacity>
                        <Ionicons name="happy-outline" size={20} color="gray" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* End Keyboard View */}
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end", // Align content to the bottom
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Optional dim background
  },
  modalContent: {
    height: "80%", // Make modal take up 50% of screen
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "20%", // 👈 Tap area to close
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Ensure it takes up space when the content is small
    // paddingBottom: 100, // Optional, gives padding at the bottom for comfort
  },
  modalTitle: { fontSize: 14, alignItems: "center", justifyContent: "center" },
  commentItem: { flexDirection: "row", marginVertical: 5 },
  commentItemReply: {
    //flexDirection: "row",
    flexDirection: "col",
    marginLeft: 40,
    justifyContent: "space-between",
  },
  commentUser: { marginRight: 5 },
  commentText: { flex: 1 },
  inputContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    padding: 8,
    borderRadius: 25,
    fontSize: 13,
    borderColor: "#ccc",
  },
  closeButton: { alignSelf: "center", marginTop: 10 },
  profilePic: { width: 30, height: 30, borderRadius: 20, marginRight: 10 },

  closeText: { color: "red" },

  inputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },

  textInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 25,
    paddingHorizontal: 10,
    flex: 1,
    position: "relative",
  },

  input: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 30, // space for camera icon
    paddingRight: 80, // space for icons or send button
    fontSize: 16,
    color: "#000",
  },

  leftIcon: {
    position: "absolute",
    left: 10,
    zIndex: 1,
  },
  rightIcon: {
    position: "absolute",
    right: 10,
  },
  rightIconsGroup: {
    position: "absolute",
    right: 10,
    flexDirection: "row",
    gap: 8,
  },
  dragIndicator: {
    alignSelf: "center",
    width: 40,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  inputWrapper: {
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb', // equivalent to Tailwind 'border-gray-200'
  backgroundColor: '#fff',
  position: 'absolute',
  bottom: 0,
  width: '100%',
  zIndex: 10,
},

inputInner: {
  position: 'relative',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f3f4f6', // Tailwind 'bg-gray-100'
  borderRadius: 9999, // fully rounded, like 'rounded-full'
  paddingHorizontal: 16,
  paddingVertical: 3,
},

cameraIcon: {
  position: 'absolute',
  left: 20,
  zIndex: 1,
},

textInput: {
  flex: 1,
  paddingLeft: 30, // space for camera icon
  paddingRight: 80, // space for send/emoji
  fontSize: 14,
  color: '#000',
},

rightIcon: {
  position: 'absolute',
  right: 12,
  flexDirection: 'row',
  alignItems: 'center',
},
 commentContainer: {
    flexDirection: 'column',
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    marginRight: 12,
  },
  likeButton: {
    flexDirection: 'row',
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  replyCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyCountText: {
    marginRight: 3,
  },
  replyHeartIcon: {
    marginTop: 3,
  },
  replyContainer: {
    padding: 8,
    borderRadius: 6,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  replyBubble: {
    backgroundColor: '#f1f5f9', // tailwind 'bg-slate-100'
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    flex: 1,
  },
  commentUser: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyText: {
    color: 'green',
  },
});
export default Comments
