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
import { FB } from "../../../theme/social";
import { useDispatch } from "react-redux";
import { followUserAsync } from "../../../store/slice/userSlice";
import Toast from "react-native-toast-message";

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
  /*
    Who the wall belongs to, as the wall itself reports them -- including
    whether you follow them. getProfile answers with counts but never says
    that, and reading it off a post fails on an account with no posts.
  */
  const [author, setAuthor] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  /*
    What the viewer is to this account: "none" | "requested" | "following" |
    "self". A private account turns a follow into a request that has to be
    approved, so a single boolean cannot describe the button.
  */
  const [viewerState, setViewerState] = useState("none");
  /* "private" | "suspended" | "deleted" | "blocked" -- why the wall is shut. */
  const [lockReason, setLockReason] = useState(null);
  const dispatch = useDispatch();

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
        setLockReason(data?.locked ? (data.reason || "private") : null);
        if (data?.author) {
          setAuthor(data.author);
          setFollowing(!!data.author.isFollowing);
          setViewerState(data.author.viewerState || (data.author.isFollowing ? "following" : "none"));
        }
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
        /*
          403 is the server telling us this wall is shut -- blocked either way,
          or a suspended account. It is an answer, not a failure, and it has to
          reach the screen: the catch used to swallow it and leave an empty
          grid, which reads as "they have posted nothing".
        */
        const status = e?.response?.status;
        const body = e?.response?.data;
        if (generation === generationRef.current) {
          if (status === 403) {
            setLocked(true);
            setLockReason(body?.reason || "blocked");
            setItems([]);
          } else if (status === 404) {
            setLocked(true);
            setLockReason("deleted");
            setItems([]);
          } else if (initial) {
            setItems([]);
          }
        }
        console.log("wall:", body || e.message);
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

  /*
    Follow, optimistically.

    Waiting on a round trip before the button changes reads as a dead tap, and
    the store outlives this screen so the change survives navigating away and
    back.
  */
  const toggleFollow = useCallback(async () => {
    if (!viewerId || !authorId || followBusy) return;
    const before = following;
    setFollowing(!before);
    setFollowBusy(true);
    try {
      if (viewerState === "requested") {
        /* A pending request is withdrawn, not re-sent. */
        await api.post("/apis/profile/unfollow", { userId: viewerId, targetId: authorId });
        setViewerState("none");
        setFollowing(false);
        return;
      }
      if (before) {
        /*
          Unfollowing needs its own endpoint.

          /apis/reel/Addfollow does not toggle -- it only ever follows, and
          answers "Already following!" when you are. Driving both directions
          through it would have cleared the button while the server kept the
          follow, so the next screen you opened showed Following again.
        */
        await api.post("/apis/profile/unfollow", { userId: viewerId, targetId: authorId });
      } else {
        /*
          /apis/profile/follow, not the legacy /apis/reel/Addfollow.

          The legacy one adds a follower unconditionally: it does not know
          about private accounts, so following a private account bypassed
          approval entirely, and it does not refuse a blocked or suspended
          account either. This one answers "requested" for a private account
          and 403 for the rest, which is exactly what the button needs.
        */
        const { data } = await api.post("/apis/profile/follow", {
          userId: viewerId,
          targetId: authorId,
        });
        const state = data?.status === "requested" ? "requested"
          : data?.status === "following" ? "following"
            : "none";
        setViewerState(state);
        setFollowing(state === "following");
        if (state === "requested") {
          Toast.show({ type: "success", text1: "Follow request sent" });
        }
      }
    } catch (e) {
      setFollowing(before);
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message
          || (before ? "Could not unfollow" : "Could not follow"),
      });
    } finally {
      setFollowBusy(false);
    }
  }, [viewerId, authorId, following, followBusy, dispatch]);

  const openMessage = useCallback(() => {
    if (!viewerId || !authorId) return;
    navigation.navigate("ChatDetails", {
      me: viewerId,
      partner: authorId,
      userinfo: {
        _id: authorId,
        type: "private",
        partner: {
          _id: authorId,
          name: author?.name || profile?.name || "",
          image: author?.image || profile?.image || "",
        },
        lastMsg: null,
      },
    });
  }, [viewerId, authorId, author, profile, navigation]);

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
          colors={[FB.primary, "#4B9BFF", "#8AC1FF"]}
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
              <Ionicons name="checkmark-circle" size={18} color={FB.primary} />
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

          {!isMine ? (
            /*
              Somebody else's wall: Follow and Message.

              Tapping a name in the timeline used to open UserProfile, a
              separate screen that fetched the *logged-in* user's profile and
              ignored the id it was given -- so the header showed you while the
              tabs below showed them. That screen is gone; this one takes the
              id it is handed and uses it.
            */
            <View style={styles.actions}>
              {/*
                Three states, not two. A private account turns a follow into a
                request somebody has to approve, so "Follow" would be a lie and
                tapping it again would send a second one.
              */}
              <TouchableOpacity
                style={[
                  styles.action,
                  viewerState === "none" ? styles.actionPrimary : styles.actionFollowing,
                ]}
                onPress={toggleFollow}
                activeOpacity={0.85}
                disabled={followBusy}
              >
                <Ionicons
                  name={
                    viewerState === "following" ? "checkmark"
                      : viewerState === "requested" ? "time-outline"
                        : "person-add"
                  }
                  size={16}
                  color={viewerState === "none" ? "#fff" : FB.text}
                />
                <Text style={viewerState === "none" ? styles.actionPrimaryText : styles.actionText}>
                  {viewerState === "following" ? "Following"
                    : viewerState === "requested" ? "Requested"
                      : "Follow"}
                </Text>
              </TouchableOpacity>

              {/* Messaging a private account you cannot see is a dead end, so
                  it is only offered once you are through the door. */}
              {(!locked || viewerState === "following") && (
                <TouchableOpacity style={styles.action} onPress={openMessage} activeOpacity={0.85}>
                  <Ionicons name="chatbubble-outline" size={15} color={FB.text} />
                  <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
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
          )}
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
                  color={active ? FB.primary : FB.textSecondary}
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
    [avatar, name, profile, postCount, reelCount, tab, isMine, authorId, navigation, following, followBusy, toggleFollow, openMessage]
  );

  const Empty = () => {
    if (loading || tab === "about") return null;
    if (locked) {
      /*
        Why the wall is shut decides what to say, and what to offer.

        A private account is not a missing one: the visitor should see who it
        is, that it is private, and the one action that changes that -- sending
        a request. A blocked or suspended account gets no such invitation,
        because there is nothing they can do about it and hinting otherwise
        would be worse than silence.
      */
      const shut = {
        private: {
          icon: "lock-closed",
          title: "This profile is private",
          body: "Send them a follow request to see their posts, photos and reels.",
        },
        suspended: {
          icon: "alert-circle-outline",
          title: "This profile is not available",
          body: "This account has been suspended.",
        },
        deleted: {
          icon: "person-remove-outline",
          title: "This profile is not available",
          body: "This account no longer exists.",
        },
        blocked: {
          icon: "ban-outline",
          title: "This profile is not available",
          body: "You can't view this account.",
        },
      }[lockReason || "private"];

      return (
        <View style={styles.state}>
          <View style={styles.lockCircle}>
            <Ionicons name={shut.icon} size={30} color={FB.textSecondary} />
          </View>
          <Text style={styles.stateTitle}>{shut.title}</Text>
          <Text style={styles.stateHint}>{shut.body}</Text>

          {lockReason === "private" && viewerState !== "following" && (
            <TouchableOpacity
              style={[
                styles.action,
                viewerState === "requested" ? styles.actionFollowing : styles.actionPrimary,
                { marginTop: 18 },
              ]}
              onPress={toggleFollow}
              disabled={followBusy}
              activeOpacity={0.85}
            >
              <Ionicons
                name={viewerState === "requested" ? "time-outline" : "person-add"}
                size={16}
                color={viewerState === "requested" ? FB.text : "#fff"}
              />
              <Text style={viewerState === "requested" ? styles.actionText : styles.actionPrimaryText}>
                {viewerState === "requested" ? "Request sent" : "Send follow request"}
              </Text>
            </TouchableOpacity>
          )}

          {viewerState === "requested" && lockReason === "private" && (
            <Text style={styles.stateFoot}>
              They'll be able to approve it from their notifications.
            </Text>
          )}
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

  /* Same recycling problem as the timeline: the wall is a FlatList too. */
  const applyReaction = useCallback((postId, summary) => {
    setItems((prev) =>
      prev.map((p) =>
        String(p._id) === String(postId)
          ? { ...p, reactions: summary, likes: summary?.total ?? p.likes }
          : p
      )
    );
  }, []);

  const renderCard = ({ item }) => (
    <View>
      <PostSection
        post={item}
        navigation={navigation}
        userid={viewerId}
        onReactionChange={applyReaction}
      />
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
            <ActivityIndicator style={{ marginVertical: 24 }} color={FB.primary} />
          ) : paging ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={FB.primary} />
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
            colors={[FB.primary]}
            tintColor={FB.primary}
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
  screen: { flex: 1, backgroundColor: FB.page },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: FB.hairline,
    backgroundColor: FB.surface,
  },
  topbarTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    color: FB.text,
  },

  cover: { height: 120, width: "100%" },

  identity: { paddingHorizontal: 16, marginTop: -34, backgroundColor: FB.surface, paddingBottom: 4 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#E5E7EB",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  name: { fontSize: 20, fontWeight: "700", color: FB.text, maxWidth: "85%" },
  bio: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#4B5563" },
  bioEmpty: { marginTop: 4, fontSize: 13, color: FB.primary, fontWeight: "600" },

  stats: {
    flexDirection: "row",
    marginTop: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: FB.hairline,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: FB.text },
  statLabel: { fontSize: 12, color: FB.textSecondary, marginTop: 2 },

  actions: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    backgroundColor: FB.hairline,
  },
  actionText: { fontSize: 13, fontWeight: "600", color: FB.text },
  actionPrimary: { backgroundColor: FB.primary },
  actionFollowing: { backgroundColor: FB.fill },
  actionPrimaryText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FB.hairline,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: FB.surface,
    marginTop: 0,
    marginBottom: FB.card.gap,
    borderBottomWidth: 1,
    borderBottomColor: FB.hairline,
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
  tabActive: { borderBottomColor: FB.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: FB.textSecondary },
  tabTextActive: { color: FB.primary },

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
  lockCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    backgroundColor: FB.fill,
  },
  stateTitle: { marginTop: 12, fontSize: 17, fontWeight: "700", color: FB.text },
  stateFoot: {
    marginTop: 12, fontSize: 12, color: FB.textTertiary,
    textAlign: "center", lineHeight: 17,
  },
  stateHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: FB.textTertiary,
    textAlign: "center",
  },

  about: { paddingHorizontal: 16, paddingTop: 12 },
  aboutRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  aboutLabel: { fontSize: 12, color: FB.textTertiary },
  aboutValue: { fontSize: 14, color: FB.text, fontWeight: "500", marginTop: 1 },

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
