import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const ShareContentinPost = ({ sharedata, base } : any) => {
  if (!sharedata || !sharedata.length) return null;

  const share = sharedata[0]; // Facebook-style: single share
  const original = share.originalPost;

  if (!original) return null;

  return (
    <View style={styles.container}>

      {/* Original Post Card */}
      <View style={styles.card}>
        {/* Original User */}
        <View style={styles.userRow}>
          <Image
             source={
                  original.username?.image
                    ? { uri: base + original.username?.image }
                    : require("../../../assets/user.png")
                }
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>
              {original.username?.name}
            </Text>
            <Text style={styles.time}>
              {new Date(original.xtime).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Original Content */}
       {/*  {original.videoTitle ? (
          <Text style={styles.content}>{original.videoTitle}</Text>
        ) : null} */}

        {/* Background Post (Text Post Style) */}
        {original.xbackgroundcolor ? (
          <View
            style={[
              styles.textPost,
              { backgroundColor: original.xbackgroundcolor.split(",")[0] },
            ]}
          >
            <Text style={styles.textPostText}>
              {original.videoTitle}
            </Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={styles.stat}>
            👍 {original.likes?.length || 0}
          </Text>
          <Text style={styles.stat}>
            💬 {original.comments?.length || 0}
          </Text>
          <Text style={styles.stat}>
            ↗ {original.shares?.length || 0}
          </Text>
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
  shareText: {
    fontSize: 14,
    color: "#111",
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E4E6EB",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  name: {
    fontWeight: "600",
    fontSize: 14,
  },
  time: {
    fontSize: 11,
    color: "#65676B",
  },
  content: {
    fontSize: 14,
    marginVertical: 6,
    color: "#050505",
  },
  textPost: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textPostText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stat: {
    fontSize: 12,
    color: "#65676B",
  },
});
