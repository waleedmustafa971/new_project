import {
    View, Text, SafeAreaView,
    Platform, StatusBar, FlatList, Dimensions,
    ActivityIndicator
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReelItem from './ReelItem'
const { height } = Dimensions.get("window");
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

    useFocusEffect(
        useCallback(() => {
            return () => {
                fetchReels();
                console.log('console clear show reel');
            };
        }, [])
    );

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
                setReels((prev) => [...prev, ...res.data.reels]);
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
            setReels(reels);
            setPage(0);
        }
        else {
            fetchReels();
        }
    }, []);


    return (
        <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={reels}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => (
                        <ReelItem
                            reel={item}
                            isActive={index === activeIndex}
                            onClose={() => navigation.goBack()}
                        //   shouldStop={shouldStop}
                        />
                    )}
                    onEndReached={fetchReels}
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
                        <ActivityIndicator />
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

export default ShowReel;
