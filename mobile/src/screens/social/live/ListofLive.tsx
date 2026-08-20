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

  /*
    A ref rather than the loading state, because the guard has to be read and
    written synchronously. Two things call this — onEndReached and the refresh
    button — and a state flag set in one render is still false to the other.
  */
  const inFlight = useRef(false);

  const fetchReels = useCallback(
    async (reset = false) => {
      if (inFlight.current) return;
      if (!reset && !hasMore) return;

      inFlight.current = true;
      setLoading(true);

      const nextPage = reset ? 1 : page;

      try {
        const jsonValue = await AsyncStorage.getItem('userdata');
        if (jsonValue) setUserid(JSON.parse(jsonValue)._id);

        const res = await api.get('/apis/live/get-live-stream', {
          params: { page: nextPage, limit: 2 },
        });

        if (res.data?.success) {
          const { data = [], currentPage, totalPages } = res.data;

          if (data.length === 0) {
            if (reset) setReels([]);
            setHasMore(false);
          } else {
            setReels(prev => {
              const seed = reset ? [] : prev;
              const newItems = data.filter(
                (item: LiveStream) => !seed.some(p => p._id === item._id)
              );
              return [...seed, ...newItems];
            });

            setTotalPage(totalPages);
            setPage(currentPage + 1);
            setHasMore(currentPage < totalPages);
          }
        }
      } catch (err) {
        console.error('Fetch live streams error:', err);
      } finally {
        /* This used to sit inside the 'if (jsonValue)' block, so a missing
           session left loading stuck at true forever — and the empty state
           renders nothing while loading, which is a blank screen with no
           error anywhere to explain it. */
        setLoading(false);
        inFlight.current = false;
      }
    },
    [page, hasMore]
  );

  /* ===================== NAVIGATION FOCUS ===================== */

  /*
    Always refetch, not just when the list is empty. Whether anyone is
    broadcasting changes minute to minute, and the old condition meant that
    once you had seen 'No Live Streams' the screen never asked again —
    hasMore was false by then, so even coming back showed the same nothing.
  */
  useFocusEffect(
    useCallback(() => {
      fetchReels(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
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
          onPress={() => fetchReels(true)}
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
        onEndReached={() => fetchReels()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={reels.length ? undefined : { flexGrow: 1 }}
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

      {/*
        Starting a stream was reachable only from Social > your profile > Live,
        four taps away and in a list of unrelated shortcuts. The tab that shows
        everyone else's broadcasts is where you decide to make one.
      */}
      <TouchableOpacity
        style={styles.goLive}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateStream')}
      >
        <MaterialIcons name="videocam" size={20} color="#fff" />
        <Text style={styles.goLiveText}>Go live</Text>
      </TouchableOpacity>
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
  },
  goLive: {
    position: 'absolute',
    right: 18,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E1156C',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  goLiveText: { color: '#fff', fontWeight: '700', fontSize: 14.5 }
});

export default ListofLive;