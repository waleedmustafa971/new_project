import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Dimensions,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
import StoryItem from "./StoryItem";
import MediaController from "../../../component/story/MediaController";
//import ReelItem from "../reel/ReelItem";

const { width } = Dimensions.get("window");

const StoryViewer = ({ navigation }) => {
  const route = useRoute();
  const { itemdata } = route.params;

  const [storydata, setStorydata] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const cancelSourceRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // --- Fetch Stories ---
  const fetchNextStory = async (id = null, cancelToken = null) => {
    if (loading || !hasMore || page > totalPage) return;
    setLoading(true);

    const user = await AsyncStorage.getItem("username");
    const posttype = "Story";

    try {
      const res = await axios.get(
        `${base.BASE_URL}/apis/postreel/recentstory?page=${page}&limit=2&username=${user}&posttype=${posttype}&reelid=${id}`,
        { cancelToken }
      );

      if (res.data?.message === "No story found") {
        setHasMore(false);
      } else {
        setStorydata((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const newItems = res.data.reels.filter(
            (item) => !existingIds.has(item._id)
          );
          return [...prev, ...newItems];
        });

        setPage((prev) => prev + 1);
        setTotalPage(res.data.totalPages);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request cancelled:", err.message);
      } else {
        console.error(err);
      }
    }

    setLoading(false);
  };

  // --- Initial Load ---
  useEffect(() => {
    cancelSourceRef.current = axios.CancelToken.source();

    const fetchInitialStory = async () => {
      if (itemdata && itemdata[0]?._id) {
        console.log("Initial load with ID:", itemdata[0]._id);
        await fetchNextStory(itemdata[0]._id, cancelSourceRef.current.token);
      }
    };

    fetchInitialStory();

    return () => {
      console.log("Cleaning up StoryViewer...");
      cancelSourceRef.current?.cancel?.("Component unmounted");
      MediaController.stopAllMedia(); // Clean up sound/video
    };
  }, []);

  // --- Scroll End Handler ---
  const handleScrollEnd = async (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);

    if (newIndex !== currentIndex) {
     // await MediaController.stopAllMedia(); // stop audio/video
      setCurrentIndex(newIndex);

      // Preload more stories when near end
      if (newIndex >= storydata.length - 2) {
        cancelSourceRef.current?.cancel?.("Request superseded");
        cancelSourceRef.current = axios.CancelToken.source();
        fetchNextStory(null, cancelSourceRef.current.token);
      }
    }
  };

  // --- Manual Skip on Video End ---
  const handleNextStory = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < storydata.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
     // await MediaController.stopAllMedia();
    }
  };

   const onViewableItemsChanged = useRef(({ viewableItems }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index);
      }
    });
  

  
  return (
    <FlatList
      ref={flatListRef}
      data={storydata}
      keyExtractor={(item, index) => item._id || index.toString()}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScrollEnd}
      renderItem={({ item, index }) => (
     //  renderItem={({ item }) => (
        <StoryItem
         // key={item._id} // 👈 force full remount on story change
          reel={item}
          isActive={index === activeIndex}
          navigation={navigation}
          onVideoEnd={handleNextStory}
          onClose={() => navigation.goBack()}
        />
      )}

      onViewableItemsChanged={onViewableItemsChanged.current}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}


      initialScrollIndex={0}
      getItemLayout={(data, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      
    />
  );
};

export default StoryViewer;
