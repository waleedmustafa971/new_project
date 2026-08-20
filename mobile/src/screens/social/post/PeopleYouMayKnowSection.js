import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
import { useDispatch, useSelector } from "react-redux";
import { followUserAsync } from "../../../store/slice/userSlice";
import api from "../../../component/api";

const PeopleYouMayKnowSection = ({ navigation }) => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [userid, setUserid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [followedUsers, setFollowedUsers] = useState([]);

  useEffect(() => {
    loadUser();
    fetchUsers(1);
  }, []);

  const loadUser = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
    }
  };

  const fetchUsers = async (pageNum) => {
    if (isLoading || pageNum > totalPages) return;
    setIsLoading(true);
    try {
      const jsonValue = await AsyncStorage.getItem("userdata");
      const userData = JSON.parse(jsonValue);

      const res = await api.get(`/apis/auth/notInfriends`, {
        params: {
          userId: userData._id,
          page: pageNum,
          limit: 10,
        },
      });

      const { users, totalPages } = res.data;

      /*
        Merge by id, never by concatenation.

        notInfriends excludes people you already follow, so the result set
        shrinks the moment you follow someone from this very list. Offset
        pagination then slides: the window for page 2 overlaps page 1 and hands
        back somebody already on screen. React saw two children with the same
        key and warned that one of them may be dropped — which is exactly the
        run of "Encountered two children with the same key" in the log, always
        straight after a successful follow.
      */
      setProducts((prev) => {
        const merged = pageNum === 1 ? users : [...prev, ...users];
        const seen = new Set();
        return merged.filter((u) => {
          const id = String(u?._id ?? "");
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = (followId) => {
    if (!userid) return;
    dispatch(followUserAsync({ userId: userid, followId }));
    // Guard against a double tap adding the same id twice.
    setFollowedUsers((prev) => (prev.includes(followId) ? prev : [...prev, followId]));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={
          item.image ? { uri: base.BASE_URL + '/' +item.image } : require("../../../assets/user.png")
        }
        style={styles.avatar}
      />
      <Text style={styles.name} numberOfLines={1}>
        {item.name} 
      </Text>
      <Text style={styles.mutual}>People you may know</Text>
      <TouchableOpacity
        style={[
          styles.addButton,
          followedUsers.includes(item._id) && styles.followingButton,
        ]}
        onPress={() => handleFollow(item._id)}
        disabled={followedUsers.includes(item._id)}
      >
        <Text style={styles.addText}>
          {followedUsers.includes(item._id) ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      {/*   <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity> */}
        <Text style={styles.title}>People You May Know</Text>
      {/*   <TouchableOpacity>
          <Ionicons name="search" size={24} />
        </TouchableOpacity> */}
      </View>

      <FlatList
        data={products}
        horizontal
        keyExtractor={(item, index) => String(item?._id ?? `row-${index}`)}
        renderItem={renderItem}
        onEndReached={() => fetchUsers(page + 1)}
        onEndReachedThreshold={0.5}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        ListFooterComponent={
          isLoading ? <ActivityIndicator size="small" color="#888" /> : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", 
    paddingTop: 10, marginBottom: 5 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginRight: 12, marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    textAlign: "center",
  },
  mutual: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  followingButton: {
    backgroundColor: "#aaa",
  },
});

export default PeopleYouMayKnowSection;
