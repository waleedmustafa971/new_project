import React, { useEffect, useState, useRef } from "react";
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
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Entypo from "react-native-vector-icons/Entypo";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import EvilIcons from "react-native-vector-icons/EvilIcons";
import axios from "axios";
import * as base from "../../../component/global";
import api from "../../../component/api";

const PostModalComents = ({ data, visible, onClose, username, reelId, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replytext, setReplytext] = useState(null);
  const [post, setPost] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    setComments(data?.commentsdetails || []);
    setPost(data);
  }, [data]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    if (replytext) {
      // Adding a reply
      const commentId = replytext._id;
      const message = newComment;
      const userinfo = replytext.user;
      console.log(`${base.BASE_URL}/apis/reel/addreply`)
      try {
        const response = await axios.post(`${base.BASE_URL}/apis/reel/addreply`, {
          reelId,
          commentId,
          username,
          message,
          userinfo,
        });

        if (response.data.success) {
          const addedReply = response.data.result;
          // Update local comments
          setComments((prev) =>
            prev.map((c) =>
              c._id === commentId
                ? { ...c, reply: [...(c.reply || []), addedReply] }
                : c
            )
          );
          // Notify parent
          if (onCommentAdded) onCommentAdded(addedReply);
          setNewComment("");
          setReplytext(null);
          Keyboard.dismiss();
        }
      } catch (error) {
        console.error("Add reply error:", error.message);
      }
    } else {
      // Adding a top-level comment
      try {
        const result = await api.post("/apis/reel/addcomments", {
          username,
          id: reelId,
          message: newComment,
        });

        console.log("...first time add comments... ", result.data);

        const newComments = result.data.comments || [];

        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const uniqueNewComments = newComments.filter((c) => !existingIds.has(c._id));

          // Notify parent
          if (onCommentAdded) {
            uniqueNewComments.forEach((c) => onCommentAdded(c));
          }

          return [...prev, ...uniqueNewComments];
        });

        setNewComment("");
        Keyboard.dismiss();
      } catch (error) {
        console.error("Add comment error:", error.message);
      }

    }

    setLoading(false);
  };

  const replyHandler = (item) => {
    setReplytext(item);
    setNewComment(`@${item.user.name} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const onReplyLike = async (item) => {
    const commentId = item._id;
    const userinfo = item.user;

    try {
      const response = await axios.post(`${base.BASE_URL}/apis/reel/addcommentsylike`, {
        reelId,
        commentId,
        username,
        userinfo,
      });

      if (response.data.success) {
        console.log("Reply liked:", response.data.result);
      }
    } catch (error) {
      console.error("Reply like error:", error.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "90%" }}>
              <TouchableOpacity onPress={onClose} style={{ marginRight: 10 }}>
                <AntDesign name="left" size={20} color="black" />
              </TouchableOpacity>
              <Image
                source={
                  post.userInfo?.image
                    ? { uri: post.userInfo.image }
                    : require("../../../assets/user.png")
                }
                style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
              />
              <Text style={{ fontWeight: "bold" }}>{post.userInfo?.name}</Text>
            </View>
            <Entypo name="dots-three-vertical" size={20} color="black" />
          </View>

          {/* Post Description */}
          <View style={{ padding: 5, marginBottom: 5 }}>
            <Text numberOfLines={2}>{post?.videoTitle}</Text>
          </View>

          {/* Likes & Views */}
          <View style={styles.likesRow}>
            <Text>{post.likes || 0} Likes</Text>
            <Text>{post.views || 0} Views</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <FontAwesome name="thumbs-o-up" size={18} color="gray" />
              <Text>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Feather name="message-circle" size={18} color="gray" />
              <Text>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <FontAwesome name="whatsapp" size={18} color="#25D366" />
              <Text>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Feather name="send" size={18} color="black" />
              <Text>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
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
                  <View style={{ backgroundColor: "#f2f2f2", padding: 6, borderRadius: 6 }}>
                    <Text style={{ fontWeight: "bold" }}>{item.user?.name}</Text>
                    <Text>{item.message}</Text>
                  </View>
                </View>

                {/* Reply / Like / Reply List */}
                <View style={{ marginLeft: 40 }}>
                  <View style={{ flexDirection: "row", marginBottom: 5 }}>
                    <TouchableOpacity onPress={() => onReplyLike(item)} style={{ marginRight: 10 }}>
                      <EvilIcons name="like" size={20} color="black" />
                      <Text>Like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => replyHandler(item)}>
                      <Text>Reply</Text>
                    </TouchableOpacity>
                  </View>

                  {item.reply?.length > 0 && (
                    <View style={{ paddingLeft: 10 }}>
                      {item.reply.map((replyItem) => (
                        <View key={replyItem._id} style={styles.commentItem}>
                          <Image
                            source={
                              replyItem.userinfo?.image
                                ? { uri: replyItem.userinfo.image }
                                : require("../../../assets/user.png")
                            }
                            style={styles.profilePic}
                          />
                          <View
                            style={{
                              backgroundColor: "#f1f5f9",
                              padding: 6,
                              borderRadius: 6,
                              flex: 1,
                            }}
                          >
                            <Text style={{ fontWeight: "bold" }}>
                              {replyItem.userinfo?.name || "Unknown"}
                            </Text>
                            <Text>{replyItem.message}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
          />

          {/* Add Comment Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.inputWrapper}>
                <Ionicons name="camera" size={20} color="gray" style={{ marginRight: 8 }} />
                <TextInput
                  ref={inputRef}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  style={styles.input}
                  returnKeyType="send"
                  onSubmitEditing={addComment}
                />
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <TouchableOpacity onPress={addComment}>
                    <Ionicons name="send" size={22} color="blue" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    height: "100%",
    backgroundColor: "white",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  likesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  actionButton: { flexDirection: "row", alignItems: "center", marginRight: 4 },
  commentItem: { flexDirection: "row", marginVertical: 5 },
  profilePic: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 5,
  },
  input: { flex: 1, fontSize: 14, color: "#000" },
});

export default PostModalComents;
