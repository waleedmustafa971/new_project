import { View, Text, SafeAreaView,
  Platform, StatusBar, FlatList, Dimensions,
  ActivityIndicator
 } from 'react-native';
import React,{useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReelItem from './ReelItem'
const { height } = Dimensions.get("window");
import axios from 'axios';
import * as base from '../../../component/global'
import { useFocusEffect } from "@react-navigation/native";
import api from '../../../component/api';
//import { Audio } from "expo-av";

/*
  Merge a page of reels into the list without ever repeating one.

  This screen is seeded with the single reel that was tapped and then pages the
  same feed the tap came from, so page one always contains that reel again --
  which is exactly the "Encountered two children with the same key" warning,
  and, worse, a reel that plays twice on one scroll. Deduping on append fixes it
  at the point the two sources meet rather than for one of them: the seeded reel,
  a page re-requested after a failed scroll, and two pages that overlap because
  something was posted between them are all the same problem.
*/
const mergeReels = (prev, incoming) => {
  const seen = new Set(prev.map((r) => String(r?._id)));
  const added = [];
  for (const r of incoming || []) {
    const id = String(r?._id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    added.push(r);
  }
  return added.length ? [...prev, ...added] : prev;
};

const SingleReel = ({ route, navigation }) => {
  const reel = route?.params?.reel; //userid
  const routeUserid = route?.params?.userid;
  /*
    Not every entry point passes the viewer down -- the profile's "your content"
    grid navigates with the reel alone. Without an id the feed cannot tell the
    server who is looking, so it answered isOwner/liked for nobody and the
    viewer offered you a Follow button on your own reel. Falling back to the
    stored session makes the viewer the same person on every route in.
  */
  const [userid, setUserid] = useState(routeUserid || null);
  const [reels,setReels] = useState(() => mergeReels([], reel || []));
  //const [reels, setReels] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  // Mirrors `reels` so paging can merge against the current list synchronously.
  const reelsRef = useRef([]);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log('consolde clear show reel')
      };
    }, [])
  );



  useEffect(() => {
    reelsRef.current = reels;
  }, [reels]);

  useEffect(() => {
    if (routeUserid) return;
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem("userdata");
      const stored = raw ? JSON.parse(raw)?._id : null;
      if (!cancelled && stored) setUserid(stored);
    })();
    return () => { cancelled = true; };
  }, [routeUserid]);

  const loadSecondReel = () => {
  if (hasNavigated) return;

  setHasNavigated(true);
  navigation.navigate("ShowReel");
};
 
/*
  Page until something new arrives, not just once.

  Deduping on append means a page can land and add nothing -- the seeded reel is
  usually the newest, so page one is often entirely a repeat of what is already
  on screen. A single fetch would then leave the list the same length, and
  onEndReached does not fire again until the content size changes: the viewer
  would sit on one reel with no way to scroll on. Asking for the next page until
  one of them actually contributes keeps that from becoming a dead end, and the
  attempt cap stops it walking the whole feed if every page is a repeat.
*/
const MAX_EMPTY_PAGES = 3;

const fetchMoreReels = async () => {
  if (loadingRef.current || !hasMore) return;

  loadingRef.current = true;
  setLoading(true);

  try {
    let nextPage = page;
    let added = 0;

    for (let attempt = 0; attempt < MAX_EMPTY_PAGES && added === 0; attempt++) {
      nextPage += 1;

      const res = await api.get("/apis/reel/getReelFeed", {
        params: { page: nextPage, limit: 10, userid },
      });

      const newReels = res.data?.reels;
      if (!Array.isArray(newReels) || newReels.length === 0) {
        setHasMore(false);
        break;
      }

      /*
        Merged against a ref rather than inside a setState updater: the updater
        runs on the next render, so reading `added` out of it here would read a
        stale zero and the loop would keep paging even when it had just added
        ten reels.
      */
      const prev = reelsRef.current;
      const merged = mergeReels(prev, newReels);
      added = merged.length - prev.length;
      if (added > 0) {
        reelsRef.current = merged;
        setReels(merged);
      }
      setPage(nextPage);

      const totalPages = Number(res.data?.totalPages) || 0;
      if (totalPages && nextPage >= totalPages) {
        setHasMore(false);
        break;
      }
    }
  } catch (error) {
    console.log("Error loading more reels:", error);
  } finally {
    loadingRef.current = false;
    setLoading(false);
  }
};

  /*
    A deleted reel has to leave the list, not just stop existing on the server.
    Dropping the last one closes the screen -- otherwise the viewer sits on a
    blank black page with no reel and no way to tell what happened.
  */
  const handleDeleted = useCallback((deletedId) => {
    setReels((prev) => {
      const next = prev.filter((r) => String(r?._id) !== String(deletedId));
      if (next.length === 0) navigation.goBack();
      return next;
    });
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>

      <FlatList
        ref={flatListRef}
        data={reels}
       // keyExtractor={(item) => item._id}
        keyExtractor={(item, index) =>
        item?._id ? item._id.toString() : `reel-${index}`
        }
        renderItem={({ item, index }) => (
          <ReelItem
            reel={item}
            viewerId={userid}
            isActive={index === activeIndex}
            navigation={navigation}
            onClose={() => navigation.goBack()}
            onDeleted={handleDeleted}
          />
        )}
        onEndReached={fetchMoreReels}
        onEndReachedThreshold={0.5}
        snapToInterval={height} // Full screen scroll
        decelerationRate="fast"
        keyboardShouldPersistTaps="always" // Ensures touch events are passed to FlatList
        scrollEnabled={true} // Explicitly enable scrolling
        pagingEnabled
        //   contentContainerStyle={{ flexGrow: 1 }} // Ensures list content takes full height
        contentContainerStyle={{
          flexGrow: 1,
           paddingBottom: 20, // Adjust this value to match or exceed the header height + bottom spacing
        }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loading ? (
            <ActivityIndicator/>
        ) : null}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
  </View>

  );
};

export default SingleReel;
