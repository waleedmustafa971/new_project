import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from "react-redux";
import { followUserAsync } from "../../../../store/slice/userSlice";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from "../../../../component/global";
import { Video } from "react-native-video";


const ViewReels = ({ userid }) => {

  const dispatch = useDispatch();
  const navigation = useNavigation();

  // const [userid, setUserid] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState(false);
  const [followedUsersing, setFollowedUsersing] = useState([]);

  useEffect(() => {
    fetchMyFollowers(1);
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchMyFollowers(page);
    }
  }, [page]);

  useEffect(() => {
    // Fetch new search results when search input changes
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchMyFollowers(1);
    }, 500); // Debounce to reduce API calls

    return () => clearTimeout(delayDebounce);
  }, []);

  const handleLoad = () => {
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const fetchMyFollowers = async (currentPage, searchQuery) => {
    try {
      const response = await axios.get(
        base.BASE_URL + `/apis/reel/userreels`,
        {
          params: {
            userid: userid,
            page: currentPage,
            limit: 10,
            search: searchQuery, // search parameter sent to API
          },
        }
      );

      const { reels, totalReels } = response.data;
    //  console.log('...reels...' + JSON.stringify(response.data))
      if (currentPage === 1) {
        setProducts(reels);
      } else {
        setProducts((prevProducts) => [...prevProducts, ...reels]);
      }
      setTotalPages(totalReels);
    } catch (error) {
      console.error("Error fetching reels:", error.response?.data || error.message);
    } finally {
      setIsloading(false);
    }

  };

  const handleFollow = (followId) => {
    dispatch(followUserAsync({ userId: userid, followId }));
    setFollowedUsersing((prev) => [...prev, followId]);
  };

const renderItemUsers = ({ item }) => (
  <View style={styles.itemContainer}>
    <TouchableOpacity>
      <Video
        source={{ uri: item.videoUrl }}
        style={styles.video}
        resizeMode="cover"
        repeat={true}
        muted={true}
      />
    </TouchableOpacity>
    <View style={styles.overlay}>
      <Text style={styles.viewCount}>{item.likes || 0} Likes</Text>
      <Text style={styles.viewCount}>{item.likes || 0} View</Text>
      <Text style={styles.viewCount}>{item.comments || 0} Comments</Text>
    </View>
  </View>
);


  return (
    <SafeAreaView style={styles.container}>
      {/* No ScrollView around this list.

          It used to sit in one, which raised "VirtualizedLists should never be
          nested inside plain ScrollViews" and disabled the pagination below:
          a nested list receives no scroll events of its own, so onEndReached
          never fired and the list never grew past its first page. The list is
          the scroller now, and the search box above it stays put rather than
          scrolling away. */}
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderItemUsers}
          onEndReached={handleLoad}
          onEndReachedThreshold={0.5}
          numColumns={4}
          ListFooterComponent={
            isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
          }
        />
    </SafeAreaView>
  );
};

const styles = {
itemContainer: {
    flex: 1, // Required for grid layout in FlatList with numColumns
    aspectRatio: 1, // Makes it square
    margin: 5,
    backgroundColor: '#000', // Optional, helps to see the space
    borderRadius: 8,
    overflow: 'hidden', // Keeps video within the border
  },
  video: {
    width: '100%',
    height: '100%',
  },
 overlay: {
  width: '100%',
  position: 'absolute',
  flexDirection: 'row',
  justifyContent: 'space-between',
  bottom: 5,
  left: 5,
  width: '90%', // Add width
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: 5,
  borderRadius: 4,
},

  viewCount: {
    color: 'white',
    fontSize: 12,
  },  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  leftIcon: { flex: 1 },
  title: { flex: 3, textAlign: "center", fontSize: 14, fontWeight: "bold" },
  rightIcon: { flex: 1, alignItems: "flex-end" },
  container: { flex: 1, backgroundColor: "#ffffff" },
  friendContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    paddingHorizontal: 10,
    margin: 10,
    height: 45,
    /* shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, */
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#333',
  },
  avatar: { width: 40, height: 40, borderRadius: 50, marginRight: 10 },
  name: { fontSize: 14 },
  subname: { fontSize: 13 },
  addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
  addText: { color: "#fff", fontSize: 12 },
  followingButton: {
    backgroundColor: "#aaa",
  },
};

export default ViewReels;
