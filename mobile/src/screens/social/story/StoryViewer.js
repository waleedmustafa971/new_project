import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Dimensions } from "react-native";
import { useRoute } from "@react-navigation/native";
import StoryItem from "./StoryItem";
import MediaController from "../../../component/story/MediaController";

const { width } = Dimensions.get("window");

/*
  Show the stories the rail already handed over.

  This used to throw `itemdata` away and re-fetch from
  /apis/postreel/recentstory, which is the legacy endpoint the rail itself was
  moved off. That endpoint:

    - looks the author up with `User.findOne({ email: reel.username })`, but
      `username` holds an ObjectId, so the author was *always* null and every
      story rendered with no name and no avatar;
    - filters on nothing but posttype — no expiry, no privacy, no block list —
      so it served expired stories, and stories from people you do not follow;
    - identifies the viewer by `AsyncStorage.getItem("username")`, which is the
      account's email, and then compares it against follower ObjectIds.

  It also meant opening a story cost a network round trip before anything could
  be drawn, on top of the one the rail had already made. The rings from
  /apis/feed/stories are filtered, ordered and complete, and they are already in
  memory by the time this screen mounts — so render those, and open instantly.
*/
const StoryViewer = ({ navigation }) => {
  const route = useRoute();
  const { itemdata, author } = route.params || {};

  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [removed, setRemoved] = useState([]);

  /*
    The author travels beside the items rather than inside them: the feed
    shapes each story with `username` as a bare id, while the ring carries the
    name and avatar once. Attaching it here is what lets StoryItem draw a
    header without another lookup.
  */
  const storydata = useMemo(() => {
    const items = (Array.isArray(itemdata) ? itemdata : [])
      .filter((item) => !removed.includes(String(item._id)));
    if (!author) return items;
    return items.map((item) => ({ ...item, userInfo: item.userInfo || author }));
  }, [itemdata, author, removed]);

  useEffect(() => {
    return () => {
      MediaController.stopAllMedia(); // Clean up sound/video
    };
  }, []);

  const goTo = (i) => {
    flatListRef.current?.scrollToIndex({ index: i, animated: true });
    setActiveIndex(i);
  };

  const handleNextStory = () => {
    const next = activeIndex + 1;
    if (next < storydata.length) return goTo(next);
    // Past the last story there is nothing left to watch, and sitting on a
    // finished one with no way forward reads as frozen.
    navigation.goBack();
  };

  /* A tap on the left goes back a story; on the first one it stays put rather
     than closing, which is what every story viewer does. */
  const handlePrevStory = () => {
    if (activeIndex > 0) goTo(activeIndex - 1);
  };

  /*
    Drop a deleted story from the reel without a round trip.

    Deleting the last one leaves nothing to show, so the viewer closes rather
    than sitting on a blank screen.
  */
  const handleDeleted = (id) => {
    const remaining = storydata.filter((s) => String(s._id) !== String(id));
    if (!remaining.length) return navigation.goBack();
    setRemoved((prev) => [...prev, String(id)]);
    setActiveIndex((i) => Math.min(i, remaining.length - 1));
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  return (
    <FlatList
      ref={flatListRef}
      data={storydata}
      keyExtractor={(item, index) => String(item._id || index)}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <StoryItem
          reel={item}
          isActive={index === activeIndex}
          navigation={navigation}
          index={index}
          total={storydata.length}
          onVideoEnd={handleNextStory}
          onPrev={handlePrevStory}
          onDeleted={handleDeleted}
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
