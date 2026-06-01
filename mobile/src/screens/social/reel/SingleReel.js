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

const SingleReel = ({ route, navigation }) => {
  const reel = route?.params?.reel; //userid
  const userid = route?.params?.userid; //userid
  const [reels,setReels] = useState(reel);
  //const [reels, setReels] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);
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
      console.log('...got this....' + JSON.stringify(reels))
      if(reels.length > 0)
      {
        console.log('reel is started from dashboard' + JSON.stringify(reels))
        setReels(reels);
        setPage(0);
      }
      else 
      {
     // fetchReels();
      }
   }, []);

  const loadSecondReel = () => {
  if (hasNavigated) return;

  setHasNavigated(true);
  navigation.navigate("ShowReel");
};
 
const fetchMoreReels = async () => {
  console.log("fetch next row")
  if (loading || !hasMore) return;

  try {
    setLoading(true);

    const nextPage = page + 1;

    const res = await api.get("/apis/reel/getReelFeed", {
      params: {
        page: nextPage,
        limit: 10,
        userid: userid
      },
    });

    const newReels = res.data.reels;

    if (newReels.length === 0) {
      setHasMore(false);
    } else {
      setReels((prev) => [...prev, ...newReels]);
      setPage(nextPage);
    }

  } catch (error) {
    console.log("Error loading more reels:", error);
  } finally {
    setLoading(false);
  }
};

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
            isActive={index === activeIndex}
            navigation={navigation}
            onClose={() => navigation.goBack()}
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
