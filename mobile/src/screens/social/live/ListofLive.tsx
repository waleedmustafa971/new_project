import React, {
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StyleSheet, Text, TouchableOpacity
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import api from "../../../component/api";
import ListofLiveChild from "./ListofLiveChild";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // Ensure this is installed
const { height } = Dimensions.get("window");
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ===================== TYPES ===================== */

interface Hoster {
  _id: string;
  name: string;
}

export interface LiveStream {
  _id: string;
  channelName: string;
  hoster: Hoster;
  thumbnail: string;
  title: string;
  location: string;
  viewers_count: number;
  status: string;
}

interface Props {
  navigation: any;
  route: any;
}

/* ===================== COMPONENT ===================== */

const ListofLive: React.FC<Props> = ({ navigation }) => {
  const [reels, setReels] = useState<LiveStream[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPage, setTotalPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);
 // const [userid, setUserid] = useState(null);
  const [userid, setUserid] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList<LiveStream>>(null);

  /* ===================== VIEWABILITY LOGIC ===================== */
  // Detects which item is currently 80% visible on the screen
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  });

  /* ===================== FETCH DATA ===================== */

  const fetchReels = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const jsonValue = await AsyncStorage.getItem('userdata');
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
   

    try {
      const res = await api.get("/apis/live/get-live-stream", {
        params: { page, limit: 2 },
      });

      if (res.data?.success) {
        const { data = [], currentPage, totalPages } = res.data;
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          // Filter out duplicates based on _id
          setReels(prev => {
            const newItems = data.filter(
              (item: LiveStream) => !prev.some(p => p._id === item._id)
            );
            return [...prev, ...newItems];
          });
          
          setTotalPage(totalPages);
          setPage(currentPage + 1);
          
          if (currentPage >= totalPages) {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error("Fetch reels error:", err);
    } finally {
      setLoading(false);
    }
     }
  }, [loading, page, hasMore]);

  /* ===================== NAVIGATION FOCUS ===================== */

  useFocusEffect(
    useCallback(() => {
      if (reels.length === 0) {
        fetchReels();
      }
    }, [reels.length, fetchReels])
  );

  /* ===================== RENDER ITEM ===================== */
// 1. Create the Empty State Component
  const renderEmptyComponent = () => {
    if (loading && reels.length === 0) return null; // Don't show "No Data" while initial loading

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="live-tv" size={80} color="#555" />
        <Text style={styles.emptyTitle}>No Live Streams</Text>
        <Text style={styles.emptySubtitle}>
          There are no active broadcasts right now. Check back later!
        </Text>
        <TouchableOpacity 
          style={styles.refreshBtn} 
          onPress={() => {
            setPage(1);
            setHasMore(true);
            fetchReels();
          }}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: LiveStream; index: number }) => {
    return (
      <View style={{ height: height }}>
        <ListofLiveChild 
          item={item} 
          userid={userid}
          // Item is active only if it's the current index AND the screen is focused
          isActive={index === activeIndex && isFocused} 
        />
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        onEndReached={fetchReels}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyComponent}
        // Vertical Paging Configuration
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        pagingEnabled
        showsVerticalScrollIndicator={false}
        
        // Performance & Visibility
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        
        // Loading Indicator
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color="#fff" style={{ margin: 20 }} /> : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
 mainContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  // 3. Styles for the centered empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: 30,
    backgroundColor: '#333',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#444'
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default ListofLive;