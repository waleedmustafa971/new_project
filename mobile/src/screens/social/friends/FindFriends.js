import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
//import StoryScreen from "../../screen/inbox/StoryScreen";
import * as base from "../../../component/global";
import { Provider, useDispatch, useSelector } from "react-redux";
//import store from "../../store/store";
//import { followUserAsync } from "../../store/slice/userSlice";
import { followUserAsync } from "../../../store/slice/userSlice";
import { getUserData } from "../../../store/slice/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";

const FindFriends = ({ navigation }) => {
  const dispatch = useDispatch();
  const { followedUsers, loading, error } = useSelector((state) => state.users);
  const { getUserData } = useSelector((state) => state.auth);
  const [friends, setFriends] = useState([]);
  const [userlist, setUserlist] = useState([]);
  const [userid, setUserid] = useState("");
  const [currentuserid, setCurrentuserid] = useState("");
  //const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [textfollow, setTextfollow] = useState("Follow");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState([]);
  const [followedUsersing, setFollowedUsersing] = useState([]);

  //console.log('..fetch FindFriends...' + JSON.stringify(getUserData))

  useEffect(() => {
    _loadname();

    //fetchUserlist();
    fetchProducts(1);
    return () => {
      // fetchUserlist();
      fetchProducts();
    };
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchProducts(page);
    }
  }, [page]);

  const handleLoad = () => {
    console.log("current page.....with scroll", page);
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const _loadname = async () => {
    const username = await AsyncStorage.getItem("username");
    const userinfo = await AsyncStorage.getItem("userinfo");

    const jsonValue = await AsyncStorage.getItem("userdata");
    console.log(
      ".....USER Data....." +
        JSON.stringify(await AsyncStorage.getItem("userdata"))
    );

    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      console.log("user id....." + userData._id);
      const name = userData.name;
      const userid = userData._id;
      const email = userData.email;
      setUserid(userData._id);
      setCurrentuserid(userData._id);
      // fetchFriends(userData._id);
      // fetchUserlist()
      console.log("Name:", name);
      console.log("Email:", email);

      // You can return or set this to state if needed
      return { name, email };
    } else {
      console.log("No user data found");
    }
  };

  const fetchProducts = async (currentPage) => {
    console.log("Fetching page:", currentPage);
  
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      setCurrentuserid(userData._id);
      setIsloading(true);
  
      try {
        const response = await axios.get(
          base.BASE_URL + `/apis/auth/notInfriends`,
          {
            params: {
              userId: userData._id,
              page: currentPage,
              limit: 10,
            },
          }
        );
        const { users, totalPages } = response.data;
  
        setProducts((prevProducts) =>
          currentPage === 1 ? users : [...prevProducts, ...users]
        );
        setTotalPages(totalPages);
      } catch (error) {
        console.error(
          "Error fetching products:",
          error.response?.data || error.message
        );
      } finally {
        setIsloading(false);
      }
    }
  };


  const fetchFriends = async (user) => {
    console.log(
      ".....solution...." +
        `${base.BASE_URL}/apis/auth/suggestions?userId=${currentuserid}&page=${page}&limit=10`
    );

    if (!hasMore || loading) return;
    //  setLoading(true);
    try {
      const response = await axios.get(
        `${base.BASE_URL}/apis/auth/suggestions?userId=${currentuserid}&page=${page}&limit=10`
      );
      if (response.data.suggestions.length > 0) {
        setFriends((prev) => [...prev, ...response.data.suggestions]);
        setPage(page + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      // setLoading(false);
      console.error("Error fetching friends:", error);
    }
    // setLoading(false);
  };

  const handleFollow = (followId) => {
    const userId = userid; //67dc057dd0c338e049d45603
    console.log("current user id....." + userid);
    dispatch(followUserAsync({ userId, followId }));
    //  setTextfollow('following')

    // Add followId to followed list
    setFollowedUsersing((prev) => [...prev, followId]);
  };

  const renderItemusers = ({ item }) => (
    <View style={styles.friendContainer}>
      {item.image == null ? (
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../../assets/user.png")
          }
          style={{
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 2,
            marginTop: 3,
            width: 80,
            height: 80,
            borderRadius: 50,
            marginRight: 10,
          }}
        />
      ) : (
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../../assets/user.png")
          }
          style={styles.avatar}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.subname}>People you may know</Text>
      </View>
      <TouchableOpacity
        //style={styles.addButton}
        style={[
          styles.addButton,
          followedUsersing.includes(item._id) && styles.followingButton,
        ]}
        onPress={() => handleFollow(item._id)}
        disabled={followedUsersing.includes(item._id)}
      >
        <Text style={styles.addText}>
          {followedUsersing.includes(item._id) ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  /*   if (loading) return <ActivityIndicator size="large" />;
  if (error) return <Text>Error: {error}</Text>; */

  return (
    <SafeAreaProvider>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.leftIcon}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Find Friends</Text>
        <TouchableOpacity
          onPress={() => alert("Search Clicked")}
          style={styles.rightIcon}
        >
          <Ionicons name="search" size={24} color="black" />
        </TouchableOpacity>
      </View>
      {/*   <StoryScreen data={friends} /> */}

      {/*   <Text className="text-xl">User List</Text> */}
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderItemusers}
        onEndReached={handleLoad}
        onEndReachedThreshold={0.5} // Trigger load more when 50% of the list is visible
        numColumns={1}
        ListFooterComponent={
          isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
        }
      />
    </View>
    </SafeAreaProvider>
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
  title: { flex: 3, textAlign: "center", fontSize: 18, fontWeight: "bold" },
  rightIcon: { flex: 1, alignItems: "flex-end" },
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  friendContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  avatar: { width: 80, height: 80, borderRadius: 50, marginRight: 10 },
  name: { fontSize: 16 },
  subname: { fontSize: 13 },
  addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
  addText: { color: "#fff", fontSize: 13 },
  followingButton: {
    backgroundColor: "#aaa", // or green, your choice
  },

  followingText: {
    color: "#fff", // or slightly dimmed if you want
  },
};

export default FindFriends;
