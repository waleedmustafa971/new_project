import {
    View, Text, SafeAreaView,
    Platform, StatusBar, FlatList, Dimensions,
    ActivityIndicator
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReelItem from './ReelItem'
const { height } = Dimensions.get("window"); // starting guess only; replaced by onLayout
import axios from 'axios';
import * as base from '../../../component/global'
import { useFocusEffect } from "@react-navigation/native";
import Sound from 'react-native-sound';

const ShowReel = ({ route, navigation }) => {
    const reel = route?.params?.reel;
    console.log('....got from single screen', reel)
    const [reels, setReels] = useState(reel);
    //const [reels, setReels] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);
    const [listHeight, setListHeight] = useState(height);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    });


    if (!reel) {
        return (
            <View>
                <Text>No reel data found.</Text>
            </View>
        );
    }

    /*
      This used to return fetchReels as the cleanup, so the feed loaded a page
      on blur — appending into a screen being navigated away from. The initial
      load belongs to the mount effect below.
    */

    const fetchReels = useCallback(async () => {
        console.log('....fetch is loaded')
        //if (loading || !hasMore) return;
        if (loading || !hasMore || page > totalPage) return; // 👈 this check is important
        setLoading(true);
        const user = await AsyncStorage.getItem("username");
        try {
            const res = await axios.get(
                base.BASE_URL + `/apis/reel/getreel?page=${page}&limit=2&username=${user}`
            );
            if (res.data?.message === "No reels found") {
                setHasMore(false);
            } else {
                // console.log('reel show.....' + JSON.stringify(res.data.reels))
                /*
                   Appending blindly produced "Encountered two children with
                   the same key": the list is seeded with the reel you tapped,
                   and the first page returns it again. React then omits or
                   duplicates children, so the item the viewability config
                   reports as active is not the one on screen and the video
                   never plays.
                */
                setReels((prev) => {
                    const seen = new Set(prev.map((r) => String(r._id)));
                    const fresh = (res.data.reels || []).filter(
                        (r) => !seen.has(String(r._id))
                    );
                    return [...prev, ...fresh];
                });
                setTotalPage(res.data.totalPages)
                setPage((prev) => prev + 1);
            }
        } catch (err) {
            console.error(err);
        }

        setLoading(false);
    }, [loading, page, hasMore]);


    useEffect(() => {
        console.log('...got this....' + JSON.stringify(reels))
        if (reels.length > 0) {
            // console.log('reel is started from dashboard' + JSON.stringify(reels))
            /* setPage(0) asked the API for page zero, which serves page one —
               the same reels already seeded here. Start at one and let the
               de-duplication above absorb the overlap. */
            setPage(1);
        }
        else {
            fetchReels();
        }
    }, []);


    /*
      Measure the list rather than trusting Dimensions.

      Item height came from Dimensions.get("window").height while the app draws
      edge to edge under the status bar (targetSdk 35), so each reel was shorter
      than the viewport and the next one's header peeked in at the bottom —
      two close buttons visible at once. Measuring the container makes the item,
      the snap interval and getItemLayout agree with what is actually on screen.
    */
    return (
        <View style={{ flex: 1 }}>
                <FlatList
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h && Math.abs(h - listHeight) > 1) setListHeight(h);
                    }}
                    ref={flatListRef}
                    data={reels}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => (
                        <ReelItem
                            reel={item}
                            itemHeight={listHeight}
                            isActive={index === activeIndex}
                            onClose={() => navigation.goBack()}
                        //   shouldStop={shouldStop}
                        />
                    )}
                    onEndReached={fetchReels}
                    onEndReachedThreshold={0.5}
                    snapToInterval={listHeight}
                    decelerationRate="fast"
                    keyboardShouldPersistTaps="always" // Ensures touch events are passed to FlatList
                    scrollEnabled={true} // Explicitly enable scrolling
                    pagingEnabled
                    //   contentContainerStyle={{ flexGrow: 1 }} // Ensures list content takes full height
                    /* No bottom padding: on a paged list it shifts the last
                       snap point and lets the previous item bleed in. */
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={loading ? (
                        <ActivityIndicator />
                    ) : null}
                    onViewableItemsChanged={onViewableItemsChanged.current}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
                    getItemLayout={(data, index) => ({
                        length: listHeight,
                        offset: listHeight * index,
                        index,
                    })}
                />
        </View>

    );
};

export default ShowReel;
