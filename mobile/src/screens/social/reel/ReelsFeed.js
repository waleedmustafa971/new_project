import React, { useEffect, useState, useRef } from "react";
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
import { useNavigation } from "@react-navigation/native";
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

const ReelsFeed = ({userid}) => {
  const [reels, setReels] = useState([]);
  const navigation = useNavigation();
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const videoRefs = useRef([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pausedStates, setPausedStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await api.get("/apis/reel/getReelFeed", {
          params: {
            page: 1,
            limit: 10,
            userid: userid
          },
        });

     //   console.log("...reels..." + JSON.stringify(res.data.reels));
        setReels(res.data.reels);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.error("Error fetching reels:", error);
      }
    };

    fetchReels();
  }, []);

  const isVideo = (url) => {
    return /\.(mp4|mov|webm|avi|m3u8)$/i.test(url);
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
            {item.videoUrl ? (
              isVideo(item.videoUrl) ? (
                <>
                  <Video
                    source={{ uri: base.BASE_URL + '/' + item.videoUrl }}
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
                <>
                </>
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
                source={{ uri: item?.userInfo?.image || 'https://via.placeholder.com/150' }}
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
            keyExtractor={(item) => item._id}
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
