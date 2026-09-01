import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
/* axios is gone with the legacy endpoints; everything here goes through the
   shared api client, which carries the session token and refreshes it. */
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
  /*
    The whole sheet moved onto /apis/engagement.

    The legacy pair it used before -- /apis/reel/addcomments and
    /apis/reel/addreply -- store replies in a flat comment.reply[] array that
    carries no id a client can act on. That is why you could reply to a
    comment but never to a reply: there was nowhere to hang it and nothing to
    address. The engagement module has had real threading the whole time,
    replies being comments with parentId set, so a reply to a reply is just
    another comment pointed one level deeper.

    It also brings what the old endpoints never sent: whether *you* liked a
    comment, whether it is yours, how many replies it has, and the legacy
    reply[] rows surfaced read-only alongside the new ones so nothing already
    written disappears.
  */
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  /* What the composer is aimed at: null for a new top-level comment, or the
     comment being answered. Replying to a reply targets that reply. */
  const [replyTo, setReplyTo] = useState(null);
  /* Which threads are expanded. Replies are collapsed behind "View N replies"
     so a long argument cannot bury the rest of the conversation. */
  const [openThreads, setOpenThreads] = useState({});
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!reelId) return;
    setFetching(true);
    try {
      const { data: res } = await api.get(`/apis/engagement/posts/${reelId}/comments`, {
        params: { userId: username, limit: 50, replies: 10 },
      });
      setComments(res?.comments || []);
    } catch (e) {
      console.log("comments:", e?.response?.data || e.message);
    } finally {
      setFetching(false);
    }
  }, [reelId, username]);

  /* Seed once per opening. Keying this on the `data` prop is what used to
     wipe a freshly posted comment: the card above re-renders when its count
     changes, which changed the prop identity, which re-ran the effect with
     the feed's older copy of the post. */
  useEffect(() => {
    if (visible) {
      setReplyTo(null);
      setOpenThreads({});
      load();
    }
  }, [visible, load]);

  const addComment = async () => {
    const message = newComment.trim();
    if (!message || !username) return;
    setLoading(true);
    try {
      const { data: res } = await api.post(`/apis/engagement/posts/${reelId}/comments`, {
        userId: username,
        message,
        /* One field is the whole of threading. A reply to a reply points at
           that reply; the server resolves the root for display. */
        ...(replyTo ? { parentId: replyTo._id } : {}),
      });
      setNewComment("");
      setReplyTo(null);
      Keyboard.dismiss();
      if (replyTo) setOpenThreads((o) => ({ ...o, [String(replyTo.parentId || replyTo._id)]: true }));
      await load();
      if (onCommentAdded && res?.comment) onCommentAdded(res.comment);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message || "Could not post that comment",
      });
    } finally {
      setLoading(false);
    }
  };

  /*
    Like a comment or a reply.

    Optimistic and reconciled. It used to log the response and stop, so a like
    that worked and a like that failed looked identical -- and it always
    failed, because the legacy endpoint looked the caller up by email while
    the app sends a user id.
  */
  const toggleCommentLike = async (item) => {
    if (!username || item?.legacy) return;
    const id = String(item._id);

    const apply = (fn) => {
      const walk = (list) => list.map((c) => {
        if (String(c._id) === id) return fn(c);
        if (c.replies?.length) return { ...c, replies: walk(c.replies) };
        return c;
      });
      setComments((prev) => walk(prev));
    };

    const wasLiked = !!item.isLiked;
    apply((c) => ({ ...c, isLiked: !wasLiked, likes: Math.max((c.likes || 0) + (wasLiked ? -1 : 1), 0) }));

    try {
      const { data: res } = await api.post(
        `/apis/engagement/posts/${reelId}/comments/${id}/like`,
        { userId: username }
      );
      if (typeof res?.likes === "number") {
        apply((c) => ({ ...c, likes: res.likes, isLiked: !!res.liked }));
      }
    } catch (e) {
      apply((c) => ({ ...c, isLiked: wasLiked, likes: item.likes || 0 }));
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message || "Could not like that comment",
      });
    }
  };

  const startReply = (item) => {
    setReplyTo(item);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteComment = (item) => {
    if (!item?.isMine) return;
    Alert.alert("Delete comment?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/apis/engagement/posts/${reelId}/comments/${item._id}`, {
              params: { userId: username },
            });
            await load();
          } catch (e) {
            Toast.show({ type: "error", text1: e?.response?.data?.message || "Could not delete that" });
          }
        },
      },
    ]);
  };

  /*
    One row, drawn recursively.

    A reply is a comment with a parent, so the same component renders both and
    a reply to a reply needs no new code -- only a deeper indent. The old sheet
    had a hardcoded second level (comment, then comment.reply[]) which is
    exactly why the conversation stopped there.
  */
  const CommentRow = ({ item, depth }) => {
    const open = !!openThreads[String(item._id)];
    const replies = item.replies || [];
    /* Indent stops at the second level. Facebook does the same: past that the
       text column gets too narrow to read and threads walk off the screen. */
    const indent = Math.min(depth, 1) * 32;

    return (
      <View style={{ marginTop: depth === 0 ? 12 : 10, marginLeft: indent }}>
        <View style={styles.row}>
          <Image source={avatarOf(item.author?.image)} style={depth ? styles.avatarSmall : styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleName}>{item.author?.name || "Someone"}</Text>
              {item.deleted ? (
                <Text style={[styles.bubbleText, { fontStyle: "italic", color: FB.textTertiary }]}>
                  This comment was deleted
                </Text>
              ) : (
                <Text style={styles.bubbleText}>
                  {/*
                    Who this answers.

                    Replies are one level deep by design -- answering a reply
                    puts your comment beside it, not under it -- so without
                    naming the target a thread of three people becomes
                    unreadable. The server records it as `replyTo`.
                  */}
                  {item.replyTo?.name ? (
                    <Text style={styles.replyToName}>{item.replyTo.name} </Text>
                  ) : null}
                  {item.message}
                </Text>
              )}
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaTime}>{timeAgo(item.timestamp)}</Text>

              {/* Legacy replies carry no id, so they can be read but not acted
                  on. Offering buttons that cannot work would be worse. */}
              {!item.legacy && !item.deleted && (
                <>
                  <TouchableOpacity onPress={() => toggleCommentLike(item)}>
                    <Text style={[styles.metaAction, item.isLiked && styles.metaActionOn]}>
                      Like
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => startReply(item)}>
                    <Text style={styles.metaAction}>Reply</Text>
                  </TouchableOpacity>
                  {item.isMine && (
                    <TouchableOpacity onPress={() => deleteComment(item)}>
                      <Text style={[styles.metaAction, { color: FB.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {item.likes > 0 && (
                <View style={styles.likePill}>
                  <Text style={styles.likePillText}>👍 {item.likes}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Replies are folded away until asked for, so one busy thread cannot
            bury the rest of the conversation. */}
        {replies.length > 0 && !open && (
          <TouchableOpacity
            style={styles.viewReplies}
            onPress={() => setOpenThreads((o) => ({ ...o, [String(item._id)]: true }))}
          >
            <View style={styles.threadLine} />
            <Text style={styles.viewRepliesText}>
              View {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </Text>
          </TouchableOpacity>
        )}

        {open && replies.map((r, i) => (
          <CommentRow key={String(r?._id ?? i)} item={r} depth={depth + 1} />
        ))}

        {replies.length > 0 && open && (
          <TouchableOpacity
            style={styles.viewReplies}
            onPress={() => setOpenThreads((o) => ({ ...o, [String(item._id)]: false }))}
          >
            <View style={styles.threadLine} />
            <Text style={styles.viewRepliesText}>Hide replies</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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
            {(() => {
              const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
              return total > 0 ? `${total} comment${total === 1 ? "" : "s"}` : "Comments";
            })()}
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
          renderItem={({ item }) => <CommentRow item={item} depth={0} />}
        
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {/* Replying to someone is stated, with a way out. Tapping Reply used
              to change nothing on screen, so you could not tell whether your
              next message was a reply or a new comment. */}
          {replyTo ? (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {replyTo.author?.name || "someone"}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color={FB.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.composer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
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
  replyToName: { color: FB.primary, fontWeight: "600" },
  viewReplies: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 40, marginTop: 8 },
  threadLine: { width: 22, height: 1, backgroundColor: FB.divider },
  viewRepliesText: { fontSize: 12, fontWeight: "700", color: FB.textSecondary },
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
