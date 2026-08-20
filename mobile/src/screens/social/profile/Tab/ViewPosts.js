import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api from "../../../../component/api";
import * as base from "../../../../component/global";

/*
  A wall: this person's posts and shares, as a grid.

  Nothing in the app showed this. Reels had a tab, uploaded images had a tab,
  and posts — the main thing people write — had nowhere at all, on your own
  profile or anyone else's. The timeline was the only place a post ever
  appeared, mixed in with everybody else's.

  It reads /apis/postreel/wall, which decides visibility exactly the way the
  feed does, so a wall cannot become a way around privacy. When the answer is
  "private", that is shown as a state rather than an empty grid: an account that
  exists but is closed to you is a different thing from one with nothing in it,
  and only one of the two is worth sending a follow request to.
*/

const GAP = 2;
const COLS = 3;
const SIZE = (Dimensions.get("window").width - GAP * (COLS + 1)) / COLS;

const mediaUri = (post) => {
  const raw =
    (Array.isArray(post?.media) && post.media[0]?.url) ||
    post?.videoUrl ||
    "";
  const value = Array.isArray(raw) ? raw[0] : raw;
  const path = typeof value === "string" ? value : value?.url || "";
  if (!path) return null;
  if (/^(https?:|file:|data:)/.test(path)) return path;
  return `${base.BASE_URL}/${String(path).replace(/^\/+/, "")}`;
};

const ViewPosts = ({ userid }) => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [total, setTotal] = useState(0);
  const [isMine, setIsMine] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("userdata");
      const viewerId = raw ? JSON.parse(raw)?._id : null;
      const author = userid || viewerId;
      if (!author) return;

      setIsMine(String(author) === String(viewerId));

      const res = await api.get("/apis/postreel/wall", {
        params: { userid: author, viewerId, page: 1, limit: 30 },
      });
      setLocked(!!res.data?.locked);
      setPosts(res.data?.posts || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={styles.state}>
        <Ionicons name="lock-closed-outline" size={40} color="#C7CBD1" />
        <Text style={styles.stateTitle}>This account is private</Text>
        <Text style={styles.stateHint}>
          Follow this account to see what they post.
        </Text>
      </View>
    );
  }

  if (!posts.length) {
    return (
      <View style={styles.state}>
        <Ionicons name="grid-outline" size={40} color="#C7CBD1" />
        <Text style={styles.stateTitle}>
          {isMine ? "You haven't posted yet" : "No posts yet"}
        </Text>
        <Text style={styles.stateHint}>
          {isMine
            ? "Anything you post will appear here."
            : "When they post something, it will show up here."}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const uri = mediaUri(item);
    const bg = item.xbackgroundcolor
      ? String(item.xbackgroundcolor).split(",")[0]
      : null;

    return (
      <TouchableOpacity
        style={styles.cell}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ShowReel", { reel: [item] })}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.cellImage} resizeMode="cover" />
        ) : (
          /* A text post has no media, so the tile carries its words rather than
             showing an empty grey square. */
          <View style={[styles.textCell, bg ? { backgroundColor: bg } : null]}>
            <Text style={styles.textCellText} numberOfLines={4}>
              {item.videoTitle || " "}
            </Text>
          </View>
        )}

        {item.isShare && (
          <View style={styles.badge}>
            <Ionicons name="repeat" size={12} color="#fff" />
          </View>
        )}
        {item.audience && item.audience !== "everyone" && (
          <View style={[styles.badge, styles.badgeLeft]}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ width: "100%" }}>
      <Text style={styles.count}>
        {total} {total === 1 ? "post" : "posts"}
      </Text>
      <FlatList
        data={posts}
        keyExtractor={(item, index) => String(item?._id ?? index)}
        renderItem={renderItem}
        numColumns={COLS}
        scrollEnabled={false}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, paddingHorizontal: GAP }}
      />
    </View>
  );
};

export default ViewPosts;

const styles = StyleSheet.create({
  state: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 46,
    paddingHorizontal: 40,
  },
  stateTitle: { marginTop: 12, fontSize: 15, fontWeight: "600", color: "#3C4048" },
  stateHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#8A8F98",
    textAlign: "center",
  },
  count: {
    fontSize: 12,
    color: "#8A8F98",
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  cell: {
    width: SIZE,
    height: SIZE,
    backgroundColor: "#EDEFF2",
    borderRadius: 4,
    overflow: "hidden",
  },
  cellImage: { width: "100%", height: "100%" },
  textCell: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#1F2937",
  },
  textCellText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  badgeLeft: { left: 6, right: undefined },
});
