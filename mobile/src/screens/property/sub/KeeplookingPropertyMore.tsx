import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../../../component/api";
import * as base from "../../../component/global";

const { width } = Dimensions.get("window");
const PAGE_LIMIT = 10;

const KeeplookingPropertyMore = () => {
  const navigation = useNavigation();
  const [categorydata, setCategorydata] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* ---------------- FAVORITE TOGGLE ---------------- */
  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  /* ---------------- FETCH VIEW HISTORY ---------------- */
  const fetchKeep = async () => {
    if (loading || page > totalPages) return;

    setLoading(true);

    try {
      let uid = userId;

      if (!uid) {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (!jsonValue) return;

        const userData = JSON.parse(jsonValue);
        uid = userData._id;
        setUserId(uid);
      }

      const res = await api.get("/apis/property/viewuserviewhistory", {
        params: {
          userId: uid,
          page: page,
          limit: PAGE_LIMIT,
          addpost: "Property",
        },
      });

      const response = res.data;
      console.log('...keep....', JSON.stringify(response))

      setCategorydata((prev) => [...prev, ...response.data]);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      console.error("Pagination error:", error?.response || error?.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- INITIAL & PAGINATION LOAD ---------------- */
  useEffect(() => {
    fetchKeep();
  }, [page]);

  /* ---------------- LOAD NEXT PAGE ---------------- */
  const loadMore = () => {
    if (!loading && page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  /* ---------------- RENDER ITEM ---------------- */
  const renderItem = ({ item }: any) => {
    const isFavorite = favorites.includes(item._id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("PropertyDetails" as never, {
            itemdetails: item,
          } as never)
        }
      >
        <Image
          source={{ uri: base.BASE_URL + item.images?.[0]?.image }}
          style={styles.image}
          resizeMode="cover"
        />

        {item.price && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "AED",
                maximumFractionDigits: 0,
              }).format(Number(item.price))}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item._id)}
        >
          <Icon
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? "red" : "#000"}
          />
        </TouchableOpacity>

        <View style={styles.detailsBox}>
          <Text style={styles.title} numberOfLines={1}>
            {item.shortTitle}
          </Text>
          <Text style={styles.location}>{item.location}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.mainContainer}>
      <FlatList
        data={categorydata}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" /> : null
        }
      />
    </View>
  );
};

export default KeeplookingPropertyMore;

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  card: {
    width: width - 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    overflow: "hidden",
  },
  image: {
    height: 220,
    width: "100%",
  },
  priceBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  favoriteButton: {
    position: "absolute",
    top: 14,
    right: 12,
    backgroundColor: "#fff",
    width: 30,
    height: 30,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsBox: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  location: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
});
