import React, { useEffect, useState } from "react";
import {
  View, Text, Image, FlatList, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import api from "../../../component/api";
import * as base from "../../../component/global";

/*
  Who watched this story.

  The count existed on the rail with nothing behind it: the poster could see
  "3" and had no way to find out who. GET /apis/feed/stories/:id/viewers has
  always returned the names — it is author-only on the server, so this sheet is
  only ever opened from your own story.

  Fetched when it opens rather than with the story, because most stories are
  never checked and the list is only interesting after people have watched.
*/
const avatarFor = (image) =>
  image
    ? { uri: `${base.PROFILE_IMAGE_URL}/${String(image).replace(/^\/+/, "")}` }
    : require("../../../assets/user.png");

const timeAgo = (iso) => {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const StoryViewersSheet = ({ visible, storyId, viewerId, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [views, setViews] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !storyId || !viewerId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/apis/feed/stories/${storyId}/viewers`, { params: { userId: viewerId } })
      .then((res) => {
        if (cancelled) return;
        setViewers(res.data?.viewers || []);
        setViews(res.data?.views || 0);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message || "Could not load viewers");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [visible, storyId, viewerId]);

  const renderViewer = ({ item }) => (
    <View style={styles.row}>
      <Image source={avatarFor(item.image)} style={styles.avatar} />
      <View style={styles.rowText}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>{item.name || "Someone"}</Text>
          {!!item.verifiedBadge && (
            <AntDesign name="checkcircle" size={12} color="#3B82F6" style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.when}>{timeAgo(item.at)}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Tapping the dimmed area above the sheet closes it, which is what
          everyone tries first. */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>
            {views === 1 ? "1 view" : `${views} views`}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AntDesign name="close" size={20} color="#111" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : viewers.length === 0 ? (
          /* A view is recorded per person, so "0" and "nobody yet" are the same
             thing — say it in words rather than showing an empty box. */
          <Text style={styles.empty}>No one has watched this yet.</Text>
        ) : (
          <FlatList
            data={viewers}
            keyExtractor={(item, i) => String(item._id || i)}
            renderItem={renderViewer}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "60%",
  },
  grabber: {
    alignSelf: "center",
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: "#E5E7EB" },
  rowText: { flex: 1 },
  nameLine: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: "#111", flexShrink: 1 },
  when: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 30, marginBottom: 30 },
});

export default StoryViewersSheet;
