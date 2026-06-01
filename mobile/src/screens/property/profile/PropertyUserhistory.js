import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as base from '../../../component/global'
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_LIMIT = 10;

export default function PropertyUserhistory() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [userid, setUserid] = useState(null);

  //6858084f41cc71c9c697da79

  const fetchData = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
    const userData = JSON.parse(jsonValue);
    console.log("user id....." + userData._id);
    setUserid(userData._id);
//////
    if (loading || page > totalPages) return;
    setLoading(true);
    try {
      const res = await fetch(
        base.BASE_URL + `/apis/property/draft/${userData._id}/draft?page=${page}&limit=${PAGE_LIMIT}`
      );
      const json = await res.json();
      setData((prev) => [...prev, ...json.users]);
      setTotalPages(json.totalPages);
    } catch (error) {
      console.error("Error fetching:", error);
    } finally {
      setLoading(false);
    }

////
    } else {
    console.log("No user data found");
    }
    
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: base.BASE_URL + `${item.images?.[0]?.image}` }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.shortTitle}</Text>
        <Text
          style={[
            styles.status,
            {
              backgroundColor: item.status === "draft" ? "#FFB74D" : "#81C784",
            },
          ]}
        >
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  const loadMore = () => {
    if (!loading && page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading && <ActivityIndicator size="large" color="#000" />}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  image: {
    width: "100%",
    height: 180,
  },
  textContainer: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  status: {
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    fontWeight: "bold",
    fontSize: 12,
  },
});
