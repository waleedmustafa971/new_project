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
  ScrollView,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from "react-redux";
import { followUserAsync } from "../../../../store/slice/userSlice";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from "../../../../component/global";

const ViewFollowers = ({ userid }) => {

  const dispatch = useDispatch();
  const navigation = useNavigation();

  // const [userid, setUserid] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState(false);
  const [followedUsersing, setFollowedUsersing] = useState([]);
  const [search, setSearch] = useState('');
  const [searchShow, setSearchShow] = useState(true)
  useEffect(() => {
    fetchMyFollowers(1, search);
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchMyFollowers(page, search);
    }
  }, [page]);

  useEffect(() => {
    // Fetch new search results when search input changes
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchMyFollowers(1, search);
    }, 500); // Debounce to reduce API calls

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleLoad = () => {
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const fetchMyFollowers = async (currentPage, searchQuery) => {
    try {
      const response = await axios.get(
        base.BASE_URL + `/apis/reel/myFollowers`,
        {
          params: {
            userId: userid,
            page: currentPage,
            limit: 10,
            search: searchQuery, // search parameter sent to API
          },
        }
      );

      const { followers, totalPages } = response.data;

      if (currentPage === 1) {
        setProducts(followers);
      } else {
        setProducts((prevProducts) => [...prevProducts, ...followers]);
      }

      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching followers:", error.response?.data || error.message);
    } finally {
      setIsloading(false);
    }

  };

  const handleFollow = (followId) => {
    dispatch(followUserAsync({ userId: userid, followId }));
    setFollowedUsersing((prev) => [...prev, followId]);
  };

  const renderItemUsers = ({ item }) => (
    <View style={styles.friendContainer}>
      <Image
        source={item.image ? { uri: item.image } : require("../../../../assets/user.png")}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.subname}>People you may know</Text>
      </View>
     {/*  <TouchableOpacity
        style={[
          styles.addButton,
          followedUsersing.includes(item._id) && styles.followingButton,
        ]}
        onPress={() => handleFollow(item._id)}
        disabled={followedUsersing.includes(item._id)}
      >
        <Text style={styles.addText}>
          {followedUsersing.includes(item._id) ? "Following" : "Follow Back"}
        </Text>
      </TouchableOpacity> */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      {searchShow && (
        <View style={styles.searchBox}>
          {/* Search Icon */}
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={{ paddingHorizontal: 8 }}
          />

          {/* Search Input */}
          <TextInput
            placeholder="Search by Name..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />

          {/* Clear Button */}
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons
                name="close-circle"
                size={22}
                color="#888"
                style={{ paddingHorizontal: 8 }}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderItemUsers}
        onEndReached={handleLoad}
        onEndReachedThreshold={0.5}
        numColumns={1}
        ListFooterComponent={
          isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
        }
      />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
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

export default ViewFollowers;
