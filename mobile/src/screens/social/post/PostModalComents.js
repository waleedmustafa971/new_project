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
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import Toast from "react-native-toast-message";
import { FB } from "../../../theme/social";

/*
  Stored image paths are relative. This sheet rendered them raw --
  `{ uri: item.user.image }` -- so every avatar in the thread fell back to the
  silhouette even when the person had a photo.
*/
const avatarOf = (image) => {
  if (!image) return require("../../../assets/user.png");
  const uri = /^(https?:|file:|data:)/.test(image)
    ? image
    : `${base.BASE_URL}/${String(image).replace(/^\/+/, "")}`;
  return { uri };
};

const timeAgo = (t) => {
  const d = dayjs(t);
  if (!d.isValid()) return "";
  return d.isAfter(dayjs()) ? "now" : d.fromNow(true);
};

const PostModalComents = ({ data, visible, onClose, username, reelId, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replytext, setReplytext] = useState(null);
  /* The post itself is no longer re-drawn in here, so the sheet does not need
     to hold a copy of it -- only its comments. */
  const inputRef = useRef(null);

  /*
    Seed the thread when the sheet opens, and only then.

    This used to key on `data`, whose identity changes every time the card
    above re-renders -- and the card re-renders as soon as a comment is added,
    because that is what updates its count. So the freshly posted comment was
    written into state and then immediately overwritten by the feed's copy of
    the post, which had been fetched before it existed. The comment reached the
    server and vanished from the screen, which reads exactly like a failure.
  */
  useEffect(() => {
    if (visible) setComments(data?.commentsdetails || []);
  }, [visible]);

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

        /*
          /addcomments answers with the post's whole comment list, already
          enriched with each author. Taking it wholesale is both simpler and
          more correct than diffing it against what the sheet happens to hold:
          the merge here dropped anything whose _id it thought it had seen,
          and it was reconciling against state the effect above had just
          overwritten.
        */
        const serverComments = result.data.comments || [];
        setComments((prev) => {
          if (onCommentAdded) {
            const known = new Set(prev.map((c) => String(c._id)));
            serverComments
              .filter((c) => !known.has(String(c._id)))
              .forEach((c) => onCommentAdded(c));
          }
          return serverComments;
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

  /*
    Like a comment.

    Nothing changed on screen when you tapped it -- the handler logged the
    response and stopped there, so a like that worked and a like that failed
    looked identical. It also failed: the server answered 404 for every call,
    because it looked the caller up by email while the app sends a user id.

    Optimistic and reconciled, like every other like in the app: the count
    moves at once and the server's own answer replaces it.
  */
  const onReplyLike = async (item) => {
    const commentId = item._id;
    if (!commentId || !username) return;

    const bump = (fn) =>
      setComments((prev) =>
        prev.map((c) => (String(c._id) === String(commentId) ? fn(c) : c))
      );

    const liked = (item.likes || []).some(
      (l) => String(l.username?._id || l.username) === String(username)
    );

    bump((c) => ({
      ...c,
      likes: liked
        ? (c.likes || []).filter((l) => String(l.username?._id || l.username) !== String(username))
        : [...(c.likes || []), { username }],
    }));

    try {
      const { data } = await api.post("/apis/reel/addcommentsylike", {
        reelId,
        commentId,
        username,
      });
      if (typeof data?.count === "number") {
        bump((c) => ({
          ...c,
          // Keep the array's length honest against the server's count without
          // pretending to know who the other likers are.
          likes: data.liked
            ? [...(c.likes || []).filter((l) => String(l.username?._id || l.username) !== String(username)), { username }]
            : (c.likes || []).filter((l) => String(l.username?._id || l.username) !== String(username)),
        }));
      }
    } catch (e) {
      bump((c) => ({ ...c, likes: item.likes || [] }));
      Toast.show({
        type: "error",
        text1: e?.response?.data?.error || "Could not like that comment",
      });
    }
  };

  return (
    /*
      A comment sheet, not a second copy of the post.

      What was here re-drew the post header, its caption, a "N Likes / N Views"
      row and then four action buttons -- Like, Comment, Send, Share -- none of
      which had an onPress at all. Four dead controls, on top of a duplicate of
      the card you had just tapped through. All of it is gone; the sheet is
      about the thread.

      It is also a sheet now rather than a full-screen white page: it stops
      short of the top so the post stays visible behind it, which is what tells
      you what you are commenting on.
    */
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {comments.length > 0
              ? `${comments.length} comment${comments.length === 1 ? "" : "s"}`
              : "Comments"}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={FB.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item, i) => String(item?._id ?? i)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={38} color="#C7CBD1" />
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptyHint}>Be the first to say something.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ marginTop: 12 }}>
              <View style={styles.row}>
                <Image source={avatarOf(item.user?.image)} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  {/* Facebook puts the name inside the bubble with the text,
                      not on a line above it. */}
                  <View style={styles.bubble}>
                    <Text style={styles.bubbleName}>{item.user?.name || "Someone"}</Text>
                    <Text style={styles.bubbleText}>{item.message}</Text>
                  </View>

                  {/* Plain text links under the bubble, which is the whole
                      comment action set -- it was two stacked icon buttons
                      with labels beneath them, taking three times the room. */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaTime}>{timeAgo(item.timestamp)}</Text>
                    {/* Lit when it is yours, so the tap has a visible result. */}
                    <TouchableOpacity onPress={() => onReplyLike(item)}>
                      <Text
                        style={[
                          styles.metaAction,
                          (item.likes || []).some(
                            (l) => String(l.username?._id || l.username) === String(username)
                          ) && styles.metaActionOn,
                        ]}
                      >
                        Like
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => replyHandler(item)}>
                      <Text style={styles.metaAction}>Reply</Text>
                    </TouchableOpacity>
                    {item.likes?.length > 0 && (
                      <View style={styles.likePill}>
                        <Text style={styles.likePillText}>👍 {item.likes.length}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {item.reply?.length > 0 && (
                <View style={styles.replies}>
                  {item.reply.map((r, i) => (
                    <View key={String(r?._id ?? i)} style={styles.row}>
                      <Image source={avatarOf(r.userinfo?.image)} style={styles.avatarSmall} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.bubble}>
                          <Text style={styles.bubbleName}>
                            {r.userinfo?.name || "Someone"}
                          </Text>
                          <Text style={styles.bubbleText}>{r.message}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaTime}>{timeAgo(r.xtime)}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {/* Replying to someone is stated, with a way out. Tapping Reply used
              to change nothing on screen, so you could not tell whether your
              next message was a reply or a new comment. */}
          {replytext ? (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {replytext.user?.name || "someone"}
              </Text>
              <TouchableOpacity onPress={() => setReplytext(null)}>
                <Ionicons name="close" size={16} color={FB.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.composer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                placeholder={replytext ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor={FB.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={addComment}
                multiline
              />
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginLeft: 10 }} color={FB.primary} />
            ) : (
              <TouchableOpacity
                onPress={addComment}
                disabled={!newComment.trim()}
                style={{ marginLeft: 10 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="send"
                  size={22}
                  color={newComment.trim() ? FB.primary : FB.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  /* Stops short of the top so the post stays visible behind it. It used to be
     height: "100%", which is a page pretending to be a sheet. */
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: "86%",
    backgroundColor: FB.surface,
    borderTopLeftRadius: FB.radius.xl,
    borderTopRightRadius: FB.radius.xl,
    overflow: "hidden",
  },
  grabber: {
    alignSelf: "center",
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: FB.divider,
    marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FB.divider,
  },
  headerTitle: { ...FB.font.title, fontSize: 16 },

  row: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 32, height: 32, borderRadius: 16, marginRight: 8,
    backgroundColor: FB.fill,
  },
  avatarSmall: {
    width: 26, height: 26, borderRadius: 13, marginRight: 8,
    backgroundColor: FB.fill,
  },
  /* The grey bubble is the comment. Squared-off with 6px corners it read as a
     table cell; Facebook's is a soft 18px pill that wraps to the text. */
  bubble: {
    alignSelf: "flex-start",
    backgroundColor: FB.fill,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleName: { fontSize: 13, fontWeight: "700", color: FB.text, marginBottom: 1 },
  bubbleText: { fontSize: 15, color: FB.text, lineHeight: 20 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 5, marginLeft: 12 },
  metaTime: { fontSize: 12, color: FB.textTertiary },
  metaAction: { fontSize: 12, fontWeight: "700", color: FB.textSecondary },
  metaActionOn: { color: FB.primary },
  likePill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 6, height: 20, borderRadius: 10,
    backgroundColor: FB.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: FB.divider,
  },
  likePillText: { fontSize: 11, color: FB.textSecondary },

  replies: { marginLeft: 40, marginTop: 10, gap: 10 },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "600", color: "#3C4048" },
  emptyHint: { marginTop: 4, fontSize: 13, color: FB.textTertiary },

  replyingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: FB.page,
  },
  replyingText: { ...FB.font.meta, flex: 1 },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FB.divider,
    backgroundColor: FB.surface,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: FB.fill,
    borderRadius: FB.radius.pill,
    paddingHorizontal: 14,
    minHeight: 40,
    maxHeight: 110,
  },
  input: { fontSize: 15, color: FB.text, paddingVertical: 8 },
});

export default PostModalComents;
