import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Pressable, StyleSheet
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Video from "react-native-video";
import { useNavigation } from "@react-navigation/native";
import api from "../../../component/api";
import * as base from "../../../component/global";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 2;

type Reel = {
  _id: string;
  videoUrl: string;
  likes?: any[];
  videoTitle?: string;
};

const SavedReelsScreen = () => {
  const navigation = useNavigation();

  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [posttype, setPosttype] = useState("Reel");
  const [userId, setUserId] = useState("");

  
/*   const fetchData = async (type: string, reset = false, user : string) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/apis/reel/get-save-data-timeline/${user}?page=${reset ? 1 : page
        }&limit=10&type=${type}`
      );
      const reels = res.data.data.map((item: any) => item.data);

      if (reset) {
        setData(reels);
        setPage(2);
      } else {
        setData((prev) => [...prev, ...reels]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.log(error);
    }

    setLoading(false);
  };
 */
  
  
  const fetchData = async (type: string, reset = false, user: string) => {
  if (loading) return;

  setLoading(true);

  try {
    const res = await api.get(
      `/apis/reel/get-save-data-timeline/${user}?page=${
        reset ? 1 : page
      }&limit=10&type=${type}`
    );

    // ✅ FIX HERE
    const reels = res.data.data;

    if (reset) {
      setData(reels);
      setPage(2);
    } else {
      setData((prev) => [...prev, ...reels]);
      setPage((prev) => prev + 1);
    }

  } catch (error) {
    console.log(error);
  }

  setLoading(false);
};
  
  // initial load + tab change
  useEffect(() => {
    userData()
   
  }, [posttype]);

   const userData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("userdata");
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
         setUserId(userData._id);
         fetchData(posttype, true, userData._id);
      }
    }
     catch (error) {
      // Error retrieving data
    }
  }

  const handleOption = (type: string) => {
    setPosttype(type);
  };

const renderItem = ({ item }: any) => {
  return (
    <View style={{ flex: 0.5, padding: 5 }}>
      <View
        style={{
          height: ITEM_SIZE,
          backgroundColor: "black",
          borderRadius: 10,
          overflow: "hidden",
          position: "relative", // Container for absolute children
        }}
      >
        {/* 1. BACKGROUND VIDEO */}
        <Video
          source={{ uri: base.BASE_URL + item?.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          paused={true}
          pointerEvents="none" // Important: touches pass through this layer
        />

        {/* 2. OVERLAY LAYER (Center Play Button) */}
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { justifyContent: "center", alignItems: "center" }
          ]}
          pointerEvents="box-none" // Allows children (button) to be clicked but background is transparent to touches
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              console.log("PLAY BUTTON CLICKED ✅", JSON.stringify(item), '...userId....', userId);
               navigation.navigate("SingleReel", { reel: [item],  userid: userId })
            }}
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: 10,
              borderRadius: 50,
            }}
          >
            <Ionicons name="play" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* 3. BOTTOM INFO LAYER */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="heart" size={14} color="white" />
            <Text style={{ color: "white", marginLeft: 4, fontSize: 12 }}>
              {item.likes?.length || 0}
            </Text>
          </View>
        </View>
      </View>
      
      {/* TITLE BELOW VIDEO */}
      <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12 }}>
        {item?.videoTitle}
      </Text>
    </View>
  );
};

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 15,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f2f2f2",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <Text style={{ fontSize: 14, fontWeight: "bold" }}>Saved</Text>

        <Ionicons name="search" size={24} color="black" />
      </View>

      {/* TABS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity onPress={() => handleOption("all")}>
          <Text style={{ color: posttype === "all" ? "black" : "gray" }}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleOption("Reel")}>
          <Text style={{ color: posttype === "Reel" ? "black" : "gray" }}>
            Reels
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleOption("Post")}>
          <Text style={{ color: posttype === "Post" ? "black" : "gray" }}>
            Posts
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {/* GRID */}
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          // This ensures the columns are distributed evenly
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 20 }}
          onEndReached={() => fetchData(posttype)}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled" // Changed from 'always' to 'handled' for better scroll behavior
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({

  flexFull: {
    width: "100%",
    height: "100%",
  },
})

export default SavedReelsScreen;
