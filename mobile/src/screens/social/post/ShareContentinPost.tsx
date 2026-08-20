import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/*
  The quoted card shown inside a post that shares someone else's post.

  It used to render as an almost-empty bordered box: the original caption was
  commented out, so all that showed was a name, a raw
  `new Date(...).toLocaleString()` stamp reading "09/08/2026, 16:48:50", and
  three emoji counters spread edge to edge by `justifyContent: space-between`.
  Next to the outer post — which says "2 days ago" and uses vector icons — it
  read as a debug block rather than a quoted post.

  Now it shows the content, matches the app's relative-time wording, and uses
  the same icon family as the action row underneath it.
*/

const timeAgo = (value?: string) => {
  const then = new Date(value || "").getTime();
  if (!then || Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(then).toLocaleDateString();
};

const Stat = ({ icon, value }: { icon: string; value: number }) => (
  <View style={styles.stat}>
    <Ionicons name={icon} size={13} color="#8A8F98" />
    <Text style={styles.statText}>{value}</Text>
  </View>
);

const ShareContentinPost = ({ sharedata, base }: any) => {
  if (!sharedata || !sharedata.length) return null;

  const share = sharedata[0]; // Facebook-style: single share
  const original = share.originalPost;

  if (!original) return null;

  const author = original.username || {};
  const caption = original.videoTitle || original.caption || "";
  // A text post carries its own background; the first colour is the flat one.
  const bg = original.xbackgroundcolor
    ? String(original.xbackgroundcolor).split(",")[0]
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Who wrote the original */}
        <View style={styles.userRow}>
          <Image
            source={
              author.image
                ? { uri: base + author.image }
                : require("../../../assets/user.png")
            }
            style={styles.avatar}
          />
          <View style={styles.userText}>
            <Text style={styles.name} numberOfLines={1}>
              {author.name || "Unknown"}
            </Text>
            <Text style={styles.time}>{timeAgo(original.xtime)}</Text>
          </View>
        </View>

        {/* What they wrote. A coloured text post keeps its background; a plain
            one is just text, rather than the nothing it showed before. */}
        {bg ? (
          <View style={[styles.textPost, { backgroundColor: bg }]}>
            <Text style={styles.textPostText} numberOfLines={4}>
              {caption}
            </Text>
          </View>
        ) : caption ? (
          <Text style={styles.content} numberOfLines={4}>
            {caption}
          </Text>
        ) : null}

        {/* Counts, grouped left instead of flung to the edges */}
        <View style={styles.stats}>
          <Stat icon="heart-outline" value={original.likes?.length || 0} />
          <Stat icon="chatbubble-outline" value={original.comments?.length || 0} />
          <Stat icon="paper-plane-outline" value={original.shares?.length || 0} />
        </View>
      </View>
    </View>
  );
};

export default ShareContentinPost;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E9EBEE",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FAFBFC",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userText: {
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E9EBEE",
  },
  name: {
    fontWeight: "600",
    fontSize: 13,
    color: "#111827",
  },
  time: {
    fontSize: 11,
    color: "#8A8F98",
    marginTop: 1,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    color: "#1F2937",
  },
  textPost: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 22,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textPostText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: "#fff",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F2",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: "#8A8F98",
    fontWeight: "500",
  },
});
