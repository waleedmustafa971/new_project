import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  Dimensions, TouchableWithoutFeedback,
  Alert,
  Pressable
} from "react-native";
import axios from "axios";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Video } from "react-native-video";
const { height } = Dimensions.get("window");
const { width: SCREEN_WIDTH } = Dimensions.get("window");
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import * as base from '../../../component/global'
import ShimmerGrid from "../../homepageloader/ShimmerGrid";
import api from "../../../component/api";
// Simple breakpoint logic
const isTablet = SCREEN_WIDTH >= 768;

const CARD_WIDTH = isTablet ? 150 : 130;
const CARD_HEIGHT = isTablet ? 180 : 170;

const ReelsFeed = ({ userid, refreshKey }) => {
  const [reels, setReels] = useState([]);
  const navigation = useNavigation();
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const videoRefs = useRef([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pausedStates, setPausedStates] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
    Refetched when the viewer arrives, when the screen is returned to, and when
    the timeline is pulled down -- not only on mount.

    Three separate bugs met here. The parent reads the signed-in user out of
    AsyncStorage, so `userid` is null for the first render or two; with an empty
    dependency array this fetched once against that null and never again, and
    every reel came back shaped for nobody -- isOwner false, liked false -- which
    the strip then handed to the reel viewer on tap. And nothing re-ran it at
    all, so a reel deleted in the viewer was still sitting in the strip when you
    came back to the timeline, which is what "I deleted one and it is still
    showing up" meant.

    `refreshKey` is part of the callback's identity rather than a separate
    effect, so a pull-to-refresh and a screen focus both go through this one
    path instead of racing each other for `reels`.
  */
  const fetchReels = useCallback(async (signal) => {
    try {
      const res = await api.get("/apis/reel/getReelFeed", {
        params: {
          page: 1,
          limit: 10,
          userid: userid || undefined,
        },
      });

      if (signal.cancelled) return;
      setReels(Array.isArray(res.data?.reels) ? res.data.reels : []);
    } catch (error) {
      if (!signal.cancelled) console.log("Error fetching reels:", error?.message);
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [userid, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      const signal = { cancelled: false };
      fetchReels(signal);
      // Blurring mid-request must not write a stale list over a newer one.
      return () => { signal.cancelled = true; };
    }, [fetchReels])
  );

  /*
    videoUrl arrives as a plain string, as an array, or as { url, type } from
    older rows. isVideo used to regex-test the value directly, so an object
    stringified to "[object Object]", matched nothing, and the tile fell to a
    branch that renders an empty fragment — a black rectangle with a caption.
  */
  const mediaPath = (item) => {
    const raw = Array.isArray(item?.videoUrl) ? item.videoUrl[0] : item?.videoUrl;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return String(raw.url || raw.uri || '');
    return '';
  };

  /*
    HLS output is stored with a leading slash and older uploads without one, so
    BASE_URL + '/' + path produced a double slash for every reel posted since
    the pipeline started working — and those were exactly the black tiles.
  */
  const mediaSource = (path) => {
    if (!path) return null;
    if (/^(https?:|file:|data:)/.test(path)) return path;
    return `${base.BASE_URL}/${String(path).replace(/^[/]+/, "")}`;
  };

  const isVideo = (url) => {
    return /\.(mp4|mov|webm|avi|m3u8)$/i.test(url || '');
  };

  useEffect(() => {
    setPausedStates((prevStates) =>
      prevStates.map((_, index) => index === currentVisibleIndex ? false : true)
    );
  }, [currentVisibleIndex]);


  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentVisibleIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const renderItem = ({ item, index }) => {
    return (
        <Pressable
          onPress={() => {
          //  Alert.alert("test entry");
            console.log('...frist....', JSON.stringify(item))
            console.log('...frist...userid.', userid)
            navigation.navigate("SingleReel", { reel: [item],  userid: userid })
          }}
          activeOpacity={0.9}
          style={{ marginRight: 4 }}
        >
          <View style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            marginRight: 7, // just a bit of spacing
            backgroundColor: '#e5e7eb',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative',
          }} pointerEvents="none">
            {mediaPath(item) ? (
              isVideo(mediaPath(item)) ? (
                <>
                  <Video
                    source={{ uri: mediaSource(mediaPath(item)) }}
                    ref={(ref) => {
                      if (ref && item.id) videoRefs.current[item.id] = ref;
                    }}
                    paused={pausedStates[item.id]}
                    resizeMode="cover"
                    repeat
                    muted
                    style={{ width: '100%', height: '100%' }}
                  />
                </>
              ) : (
                /* An image reel used to fall here and render nothing at all,
                   leaving a bare grey card in the strip. */
                <Image
                  source={{ uri: mediaSource(mediaPath(item)) }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              )
            ) : (
              <View style={{ backgroundColor: '#ccc', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No Media</Text>
              </View>
            )}


            {/* Top Overlay: User image + menu */}
            <View style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 8,
            }}>
              <Image
                source={
                  mediaSource(item?.userInfo?.image)
                    ? { uri: mediaSource(item?.userInfo?.image) }
                    : require('../../../assets/user.png')
                }
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                }}
              />
            </View>

            {/* Popup Menu */}
            {menuVisible && (
              <View style={{
                position: 'absolute',
                top: 40,
                right: 8,
                backgroundColor: 'white',
                borderRadius: 6,
                zIndex: 10,
              }}>
                <TouchableOpacity onPress={() => { setMenuVisible(false); /* Hide logic */ }} style={{
                  padding: 5
                }}>
                  <Text>Hide</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMenuVisible(false); /* Follow logic */ }} style={{
                  padding: 5
                }}>
                  <Text>Follow</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setMenuVisible(false); /* Report logic */ }} style={{
                  padding: 5
                }}>
                  <Text>Report</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Overlay: Title and Icons */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 8,
              paddingTop: 14,
              paddingBottom: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
            }}>
              {/*
                The caption used to be cut at 50 characters and dropped into a
                row that could not shrink, so a long title rendered wider than
                the card and was clipped mid-word — "Best shawarm / in the city
                #fo / #dubai". Two lines with a real ellipsis keeps it inside the
                tile, and the scrim is dark enough for white text to sit on.

                videoTitle is also read defensively: it was dereferenced with
                .length, which throws outright on a reel saved without one.
              */}
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{
                  color: '#fff',
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: '500',
                }}
              >
                {item?.videoTitle || ''}
              </Text>
            </View>
          </View>
        </Pressable>
    );
  };


  return (
    <>
      {Array.isArray(reels) && reels.length === 0 && loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {[...Array(18)].map((_, index) => (
            <ShimmerGrid key={index} />
          ))}
        </View>
      ) : (
        <View style={{
          marginBottom: 10,
          marginLeft: 8,
          marginRight: 8,
        }}>
          <FlatList
            data={reels}
            keyExtractor={(item, index) => (item?._id ? String(item._id) : `reel-${index}`)}
            renderItem={renderItem}
            horizontal
            // pagingEnabled
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 0 }}
          />
        </View>
      )}
    </>
  );
};

export default ReelsFeed;
