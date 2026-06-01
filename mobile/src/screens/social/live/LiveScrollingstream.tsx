import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as base from "../../../component/global";
import api from "../../../component/api";
import LiveItem from "./LiveItem";

const { height } = Dimensions.get("window");

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

const LiveScrollingstream: React.FC<Props> = ({ navigation }) => {
  const [reels, setReels] = useState<LiveStream[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPage, setTotalPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const flatListRef = useRef<FlatList<LiveStream>>(null);

  /* ===================== VIEWABILITY ===================== */

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  /* ===================== FETCH REELS ===================== */

  const fetchReels = useCallback(async () => {
    if (loading || !hasMore || page > totalPage) return;

    setLoading(true);

    try {
      const res = await api.get("/apis/live/get-live-stream", {
        params: { page, limit: 2 },
      });

      if (!res.data?.success) {
        setHasMore(false);
        return;
      }

      const { data = [], currentPage, totalPages } = res.data;
      console.log('...data.... live stream... ', data)
      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      setReels(prev => [...prev, ...data]);
      setTotalPage(totalPages);
      setPage(currentPage + 1);

      if (currentPage >= totalPages) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Fetch reels error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, page, hasMore, totalPage]);

  /* ===================== ON SCREEN FOCUS ===================== */

  useFocusEffect(
    useCallback(() => {
      fetchReels();
    }, [])
  );

  /* ===================== RENDER ===================== */

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <>
           <LiveItem
            reel={item}
            isActive={index === activeIndex}
            onClose={() => navigation.goBack()}
          />        
          </>

        )}
        onEndReached={fetchReels}
        onEndReachedThreshold={0.5}
        snapToInterval={height}
        decelerationRate="fast"
        pagingEnabled
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" /> : null
        }
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
    </View>
  );
};

export default LiveScrollingstream;
