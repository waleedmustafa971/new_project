import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import LinearGradient from "react-native-linear-gradient";
import dayjs from "dayjs";

import api from "../../../component/api";
import * as base from "../../../component/global";
import PostSection from "../post/PostSection";
import Footerpage from "../Footerpage";

/*
  The personal wall.

  Everything a person has published, on one screen, in one place: written
  posts, shares, photos and reels, newest first, under their own name and
  counts. Nothing in the app did this. MyProfile is a settings dashboard —
  coins, language, ads, logout — and the only place a post of yours ever
  appeared was the shared timeline, mixed in with everybody else's and gone
  the moment it scrolled past. There was no answer to "show me what I have
  posted".

  It reads /apis/postreel/wall, which is the feed's own visibility logic
  filtered to one author, so this cannot become a way around privacy: your own
  wall shows everything including "only me" posts, and someone else's shows
  only what they have let you see.

  Written to take an optional `userid` route param so the same screen serves
  anyone's wall. With no param it is yours.
*/

const { width } = Dimensions.get("window");
const GAP = 2;
const COLS = 3;
const TILE = (width - GAP * (COLS + 1)) / COLS;

const TABS = [
  { key: "posts", label: "Posts", icon: "grid-outline" },
  // Photos and videos together — "Photos" would be a lie the moment a
  // video post lands in it, and reels already have their own tab.
  { key: "media", label: "Media", icon: "images-outline" },
  { key: "reels", label: "Reels", icon: "film-outline" },
  { key: "about", label: "About", icon: "information-circle-outline" },
];

const PAGE_SIZE = 12;

/* Server paths arrive with and without a leading slash, and some rows already
   hold an absolute url. Concatenating blindly gives a double slash, which the
   image loader treats as a miss and renders as a grey square. */
const absolute = (path) => {
  const value = Array.isArray(path) ? path[0] : path;
  const raw =
    typeof value === "string" ? value : value?.url || value?.uri || "";
  if (!raw) return null;
  if (/^(https?:|file:|data:)/.test(raw)) return raw;
  return `${base.BASE_URL}/${String(raw).replace(/^\/+/, "")}`;
};

/* The first frame worth showing for a wall tile: an explicit thumbnail, then
   the first media item, then the legacy videoUrl in any of its shapes. */
const tileUri = (item) =>
  absolute(item?.thumbnail) ||
  absolute(item?.media?.[0]?.thumbnail) ||
  absolute(item?.media?.[0]?.url) ||
  absolute(item?.videoUrl);

const isVideoTile = (item) => {
  const uri = String(tileUri(item) || "").toLowerCase().split("?")[0];
  return (
    item?.posttype === "Reel" ||
    item?.media?.[0]?.type === "video" ||
    uri.endsWith(".mp4") ||
    uri.endsWith(".m3u8") ||
    uri.endsWith(".mov")
  );
};

const MyWall = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [viewerId, setViewerId] = useState(null);
  const [authorId, setAuthorId] = useState(route?.params?.userid || null);
  const [profile, setProfile] = useState(null);

  const [tab, setTab] = useState("posts");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ posts: 0, reels: 0, media: 0 });
  const [total, setTotal] = useState(0);
  const [locked, setLocked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  /*
    Page and in-flight state live in refs, not state: onEndReached fires while
    the first short page is still committing, so reading state here would
    re-request page one and append it a second time. The generation counter
    exists for the same reason the timeline has one — a pull-to-refresh or a
    tab switch must be able to throw away an answer that is still in the air,
    or page three lands on top of a freshly reloaded page one.
  */
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const generationRef = useRef(0);

  const isMine = !!viewerId && String(viewerId) === String(authorId);

  const loadProfile = useCallback(async (id) => {
    try {
      const { data } = await api.get("/apis/auth/getProfile", { params: { id } });
      setProfile(data?.user || null);
    } catch (e) {
      // A wall without its header is still a wall; the posts matter more.
      console.log("wall profile:", e?.response?.data || e.message);
    }
  }, []);

  const loadWall = useCallback(
    async (which, { initial = false } = {}) => {
      if (!authorId) return;
      if (which === "about") return;
      if (fetchingRef.current) return;
      if (!initial && !hasMore) return;

      const requested = initial ? 1 : pageRef.current;
      const generation = generationRef.current;
      fetchingRef.current = true;
      if (initial) setLoading(true);
      else setPaging(true);

      try {
        const { data } = await api.get("/apis/postreel/wall", {
          params: {
            userid: authorId,
            viewerId,
            type: which,
            page: requested,
            limit: PAGE_SIZE,
          },
        });

        // Superseded by a refresh or a tab switch while this was in flight.
        if (generation !== generationRef.current) return;

        setLocked(!!data?.locked);
        setCounts(data?.counts || { posts: 0, reels: 0, media: 0 });
        setTotal(data?.total || 0);
        setHasMore(!!data?.hasMore);

        const incoming = data?.posts || [];
        setItems((prev) => {
          const merged = initial ? incoming : [...prev, ...incoming];
          const seen = new Set();
          return merged.filter((p) => {
            const id = String(p?._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        pageRef.current = requested + 1;
      } catch (e) {
        if (generation === generationRef.current && initial) setItems([]);
        console.log("wall:", e?.response?.data || e.message);
      } finally {
        if (generation === generationRef.current) {
          fetchingRef.current = false;
          setLoading(false);
          setPaging(false);
        }
      }
    },
    [authorId, viewerId, hasMore]
  );

  /* Resolve who is being looked at before anything is fetched. */
  const bootstrap = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("userdata");
      const me = raw ? JSON.parse(raw) : null;
      const viewer = me?._id ? String(me._id) : null;
      const author = route?.params?.userid || viewer;
      setViewerId(viewer);
      setAuthorId(author);
      if (author) loadProfile(author);
      // No signed-in user and no route param: nothing will ever be fetched, so
      // the spinner has to be cleared here or it turns into a dead screen.
      else setLoading(false);
    } catch (e) {
      console.log("wall bootstrap:", e.message);
    }
  }, [route?.params?.userid, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  /*
    Refetch whenever the wall's subject or tab changes, and again on every
    return to the screen — you get here straight after posting, and a wall that
    does not show the post you just wrote reads as the post having failed.
  */
  useFocusEffect(
    useCallback(() => {
      if (!authorId) return;
      generationRef.current += 1;
      fetchingRef.current = false;
      pageRef.current = 1;
      setHasMore(true);
      setItems([]);
      loadWall(tab, { initial: true });
      // loadWall is intentionally out of the dep list: it changes identity on
      // every hasMore flip, which would restart the list mid-scroll.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authorId, viewerId, tab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    generationRef.current += 1;
    fetchingRef.current = false;
    pageRef.current = 1;
    setHasMore(true);
    try {
      await loadWall(tab, { initial: true });
      if (authorId) await loadProfile(authorId);
    } finally {
      setRefreshing(false);
    }
  }, [loadWall, loadProfile, tab, authorId]);

  /*
    Removing your own post.

    The wall is where you go to manage what you have published, so this is the
    one screen that has to offer it. The card itself only offered Report / Hide
    / Unfollow — all aimed at other people's posts.
  */
  const confirmDelete = useCallback(
    (item) => {
      if (!isMine || !item?._id) return;
      Alert.alert(
        "Delete this post?",
        "It will be removed from your wall and from everyone's timeline.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const removed = items;
              setItems((prev) => prev.filter((p) => String(p._id) !== String(item._id)));
              setTotal((t) => Math.max(t - 1, 0));
              try {
                await api.delete(`/apis/posting/posts/${item._id}`, {
                  params: { userId: viewerId },
                });
              } catch (e) {
                setItems(removed);
                setTotal((t) => t + 1);
                Alert.alert("Could not delete that post", e?.response?.data?.message || "");
              }
            },
          },
        ]
      );
    },
    [isMine, items, viewerId]
  );

  const avatar = absolute(profile?.image);
  const name = profile?.name || "";

  /*
    The header prefers the wall's own counts and falls back to the profile
    endpoint. A server that predates the counts field sends neither them nor a
    `type`, and a header of three hard zeros above a list of real posts reads as
    a broken screen rather than an out-of-date server.
  */
  const postCount = counts.posts || (tab === "posts" ? total : 0);
  const reelCount = counts.reels || profile?.reelsCount || 0;

  const openTile = (item) => navigation.navigate("ShowReel", { reel: [item] });

  const Header = useMemo(
    () => (
      <View>
        {/* Cover. There is no cover image on the account yet, so the band is
            drawn rather than left as an empty grey slab. */}
        <LinearGradient
          colors={["#1877F2", "#4B9BFF", "#8AC1FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        />

        <View style={styles.identity}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              isMine && navigation.navigate("EditProfile", { userdata: profile })
            }
          >
            <Image
              source={avatar ? { uri: avatar } : require("../../../assets/user.png")}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {profile?.verifiedBadge ? (
              <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
            ) : null}
          </View>

          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : isMine ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile", { userdata: profile })}
            >
              <Text style={styles.bioEmpty}>Add a bio</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{postCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate("CurrentUserFollowers", { username: authorId })
              }
            >
              <Text style={styles.statValue}>{profile?.followersCount ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() =>
                navigation.navigate("CurrentUserFollowering", { username: authorId })
              }
            >
              <Text style={styles.statValue}>{profile?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{reelCount}</Text>
              <Text style={styles.statLabel}>Reels</Text>
            </View>
          </View>

          {isMine ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.action, styles.actionPrimary]}
                onPress={() => navigation.navigate("CreatePost")}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.actionPrimaryText}>Create post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.action}
                onPress={() => navigation.navigate("EditProfile", { userdata: profile })}
                activeOpacity={0.85}
              >
                <Feather name="edit-2" size={15} color="#111827" />
                <Text style={styles.actionText}>Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => navigation.navigate("MyProfile")}
                activeOpacity={0.85}
              >
                <Feather name="settings" size={16} color="#111827" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={active ? "#1877F2" : "#6B7280"}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === "about" ? <About profile={profile} /> : null}
      </View>
    ),
    [avatar, name, profile, postCount, reelCount, tab, isMine, authorId, navigation]
  );

  const Empty = () => {
    if (loading || tab === "about") return null;
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
    const copy = {
      posts: isMine
        ? ["Your wall is empty", "Anything you post appears here, newest first."]
        : ["No posts yet", "When they post something, it will show up here."],
      media: isMine
        ? ["No photos or videos yet", "Posts with a photo or a video collect here."]
        : ["No photos or videos yet", ""],
      reels: isMine
        ? ["No reels yet", "Reels you record show up here."]
        : ["No reels yet", ""],
    }[tab] || ["Nothing here yet", ""];

    return (
      <View style={styles.state}>
        <Ionicons name="albums-outline" size={40} color="#C7CBD1" />
        <Text style={styles.stateTitle}>{copy[0]}</Text>
        {copy[1] ? <Text style={styles.stateHint}>{copy[1]}</Text> : null}
        {isMine && tab === "posts" ? (
          <TouchableOpacity
            style={[styles.action, styles.actionPrimary, { marginTop: 16 }]}
            onPress={() => navigation.navigate("CreatePost")}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionPrimaryText}>Create your first post</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderCard = ({ item }) => (
    <View>
      <PostSection post={item} navigation={navigation} userid={viewerId} />
      {isMine ? (
        <TouchableOpacity
          style={styles.deleteChip}
          onPress={() => confirmDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={14} color="#B42318" />
          <Text style={styles.deleteChipText}>Delete</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderTile = ({ item }) => {
    const uri = tileUri(item);
    const bg = item.xbackgroundcolor
      ? String(item.xbackgroundcolor).split(",")[0]
      : null;

    return (
      <TouchableOpacity
        style={styles.tile}
        activeOpacity={0.85}
        onPress={() => openTile(item)}
        onLongPress={() => confirmDelete(item)}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.tileImage} resizeMode="cover" />
        ) : (
          /* A text post has no media, so the tile carries its words rather
             than showing an empty square. */
          <View style={[styles.tileText, bg ? { backgroundColor: bg } : null]}>
            <Text style={styles.tileTextBody} numberOfLines={5}>
              {item.videoTitle || " "}
            </Text>
          </View>
        )}
        {isVideoTile(item) ? (
          <View style={styles.tileBadge}>
            <Ionicons name="play" size={11} color="#fff" />
          </View>
        ) : null}
        {item.isShare ? (
          <View style={[styles.tileBadge, styles.tileBadgeLeft]}>
            <Ionicons name="repeat" size={11} color="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const grid = tab === "media" || tab === "reels";
  const data = tab === "about" ? [] : items;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {isMine ? "My wall" : name}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(isMine ? "GalleryScreen" : "MyProfile", { userId: authorId })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="images-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <FlatList
        /* Remounted per tab: React Native refuses to change numColumns on a
           live list, and the grid tabs and the card tab disagree about it. */
        key={grid ? "grid" : "list"}
        data={data}
        keyExtractor={(item, index) => String(item?._id ?? index)}
        renderItem={grid ? renderTile : renderCard}
        numColumns={grid ? COLS : 1}
        columnWrapperStyle={grid ? { gap: GAP } : undefined}
        contentContainerStyle={grid ? styles.gridContent : styles.listContent}
        ListHeaderComponent={Header}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color="#1877F2" />
          ) : paging ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#1877F2" />
          ) : (
            <View style={{ height: 90 }} />
          )
        }
        onEndReached={() => loadWall(tab)}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1877F2"]}
            tintColor="#1877F2"
          />
        }
      />

      <View style={styles.footer}>
        <Footerpage navigation={navigation} />
      </View>
    </SafeAreaView>
  );
};

const About = ({ profile }) => {
  const rows = [
    { icon: "person-outline", label: "Name", value: profile?.name },
    { icon: "mail-outline", label: "Email", value: profile?.email },
    { icon: "male-female-outline", label: "Gender", value: profile?.gender },
    { icon: "flag-outline", label: "Nationality", value: profile?.nationality },
    {
      icon: "calendar-outline",
      label: "Joined",
      value: profile?.enteredby ? dayjs(profile.enteredby).format("MMMM YYYY") : null,
    },
  ].filter((r) => r.value);

  if (!rows.length) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateHint}>Nothing filled in yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.about}>
      {rows.map((r) => (
        <View key={r.label} style={styles.aboutRow}>
          <Ionicons name={r.icon} size={18} color="#6B7280" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.aboutLabel}>{r.label}</Text>
            <Text style={styles.aboutValue}>{String(r.value)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default MyWall;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
    backgroundColor: "#fff",
  },
  topbarTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  cover: { height: 120, width: "100%" },

  identity: { paddingHorizontal: 16, marginTop: -34 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#E5E7EB",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  name: { fontSize: 20, fontWeight: "700", color: "#111827", maxWidth: "85%" },
  bio: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#4B5563" },
  bioEmpty: { marginTop: 4, fontSize: 13, color: "#1877F2", fontWeight: "600" },

  stats: {
    flexDirection: "row",
    marginTop: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EEF0F3",
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  actions: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#EEF0F3",
  },
  actionText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  actionPrimary: { backgroundColor: "#1877F2" },
  actionPrimaryText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0F3",
  },

  tabs: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#1877F2" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#1877F2" },

  listContent: { paddingBottom: 20 },
  gridContent: { gap: GAP, paddingHorizontal: GAP, paddingBottom: 20 },

  tile: {
    width: TILE,
    height: TILE,
    backgroundColor: "#EDEFF2",
    borderRadius: 4,
    overflow: "hidden",
  },
  tileImage: { width: "100%", height: "100%" },
  tileText: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#1F2937",
  },
  tileTextBody: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  tileBadge: {
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
  tileBadgeLeft: { left: 6, right: undefined },

  deleteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    marginRight: 12,
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3D3D0",
    backgroundColor: "#FEF3F2",
  },
  deleteChipText: { fontSize: 12, fontWeight: "600", color: "#B42318" },

  state: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
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

  about: { paddingHorizontal: 16, paddingTop: 12 },
  aboutRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  aboutLabel: { fontSize: 12, color: "#8A8F98" },
  aboutValue: { fontSize: 14, color: "#111827", fontWeight: "500", marginTop: 1 },

  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 3,
    elevation: 5,
    zIndex: 10,
  },
});
