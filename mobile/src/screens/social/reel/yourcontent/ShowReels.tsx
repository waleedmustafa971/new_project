import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Video from "react-native-video";
import { useNavigation } from "@react-navigation/native";
import api from "../../../../component/api";
import * as base from "../../../../component/global";

const { width } = Dimensions.get("window");

// Simple Filter Icon Component
const FilterIcon = () => (
  <View style={{ width: 22, height: 18, justifyContent: 'space-between' }}>
    <View style={{ height: 2, backgroundColor: '#000', width: '100%', borderRadius: 1 }} />
    <View style={{ height: 2, backgroundColor: '#000', width: '100%', borderRadius: 1 }} />
    <View style={{ position: 'absolute', top: -2, left: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#000', borderWidth: 1, borderColor: '#fff' }} />
    <View style={{ position: 'absolute', bottom: -2, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#000', borderWidth: 1, borderColor: '#fff' }} />
  </View>
);

const ShowReels = () => {
  const navigation = useNavigation();

  const [reels, setReels] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const onEndReachedCalledDuringMomentum = useRef(true);

  useEffect(() => {
    fetchReels(1);
  }, []);

  const fetchReels = useCallback(
    async (pageNumber: number) => {
      if (loading || !hasMore) return;

      try {
        setLoading(true);
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (!jsonValue) return;
        const userData = JSON.parse(jsonValue);

        const res = await api.get("/apis/postreel/your-content", {
          params: {
            page: pageNumber,
            limit: 10,
            userid: userData._id,
            posttype: "Reel",
          },
        });

        const newReels = res?.data?.reels ?? [];

        if (!Array.isArray(newReels) || newReels.length === 0) {
          setHasMore(false);
          return;
        }

        setReels((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const filtered = newReels.filter((item: any) => !existingIds.has(item._id));
          return pageNumber === 1 ? filtered : [...prev, ...filtered];
        });

        setPage(pageNumber + 1);
      } catch (error: any) {
        console.log("Pagination Error:", error?.message);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore]
  );

  const renderItem = ({ item }: any) => {
    const mediaUrl = item?.videoUrl ? `${base.BASE_URL}/${item.videoUrl}` : null;
    
    // Date formatting logic
    const formattedDate = item.createdAt 
      ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : "August 21, 2025";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("SingleReel" as never, { reel: [item] } as never)}
      >
        {/* LEFT SIDE: VIDEO PREVIEW */}
        <View style={styles.videoWrapper}>
          {mediaUrl ? (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="contain"
              paused={true} // Keep paused for list view stability
              muted={true}
            />
          ) : (
            <View style={styles.noMedia}><Text>?</Text></View>
          )}
          {/* Duration overlay */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration || "00:15"}</Text>
          </View>
        </View>

        {/* RIGHT SIDE: TEXT CONTENT */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.videoTitle || "Untitled video"}
          </Text>
          <Text style={styles.stats}>
            {item.views || 0} views • {item.likes || 0} likes
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Tab Toggle */}
      <FlatList
        data={reels}
        keyExtractor={(item, index) => item?._id?.toString() || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onMomentumScrollBegin={() => {
          onEndReachedCalledDuringMomentum.current = false;
        }}
        onEndReached={() => {
          if (!onEndReachedCalledDuringMomentum.current && !loading && hasMore) {
            fetchReels(page);
            onEndReachedCalledDuringMomentum.current = true;
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" color="#000" style={{ margin: 20 }} /> : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  activeTab: {
    backgroundColor: "#E7F3FF", // Light blue background
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeTabText: {
    color: "#007AFF", // Brand blue text
    fontWeight: "bold",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row", // Aligns video and text horizontally
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  videoWrapper: {
    width: width * 0.4, // 40% of screen width
    height: 90,
    borderRadius: 12,
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  durationBadge: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  stats: {
    fontSize: 14,
    color: "#65676B",
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: "#8A8D91",
  },
  noMedia: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#eee',
  },
});

export default ShowReels;