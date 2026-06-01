import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import api from "../../component/api";
import * as base from "../../component/global";
import { useNavigation, NavigationProp } from "@react-navigation/native";

// 1. Define the screens and their params
type RootStackParamList = {
  Home: undefined;
  ClassifiedDetails: { itemdetails: object }; 
  SeeAllProduct: { category: string, subcategories: object, type: string }
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP * 2) / 3;
const CARD_HEIGHT = 190;

type Property = {
  _id: string;
  shortTitle?: string;
  city?: string;
  country?: string;
  currency?: string;
  price?: string | number;
  images?: { image: string }[];
};

type Category = {
  _id: string;
  categoryName?: string;  
  properties: Property[];
  subcategories: [];
};

export default function ShowClassifiedCategory() {
  //const navigation = useNavigation()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= FETCH ================= */

  const fetchPage = useCallback(
    async (pageToLoad = 1, refresh = false) => {
      if (loading) return;
      setLoading(true);

      try {
        const res = await api.get("/apis/property/gettopcategory", {
          params: {
            page: pageToLoad,
            limit: 10,
            add_post: "classified",
          },
        });

        const data = Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        setTotalPages(Number(res.data?.totalPages || 1));

        setCategories((prev) => {
          if (refresh || pageToLoad === 1) return data;

          const map = new Map(prev.map((c) => [c._id, c]));

          data.forEach((cat: Category) => {
            if (!map.has(cat._id)) {
              map.set(cat._id, cat);
            } else {
              const existing = map.get(cat._id)!;
              const propMap = new Map(
                existing.properties.map((p) => [p._id, p])
              );
              cat.properties.forEach((p) =>
                propMap.set(p._id, p)
              );
              existing.properties = Array.from(propMap.values());
            }
          });

          return Array.from(map.values());
        });

        setPage(pageToLoad);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    fetchPage(1, true);
  }, []);

  /* ================= EVENTS ================= */

  const onEndReached = () => {
    if (!loading && page < totalPages) {
      fetchPage(page + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPage(1, true);
  };

  /* ================= RENDER ================= */

  const PropertyCard = React.memo(({ item }: { item: Property }) => {
    const img =
      item.images?.[0]?.image
        ? base.BASE_URL + item.images[0].image
        : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("ClassifiedDetails", {
            itemdetails: item,
          })
        }
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}

        <Text numberOfLines={1} style={styles.title}>
          {item.shortTitle || "Untitled"}
        </Text>

        <Text numberOfLines={1} style={styles.meta}>
          {item.city || item.country || ""}
        </Text>

        <Text style={styles.price}>
          {item.currency} {item.price}
        </Text>
      </TouchableOpacity>
    );
  });

  const renderCategory = ({ item }: { item: Category }) => (
    <View style={styles.category} key={item._id}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
         {item.categoryName || item._id}
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("SeeAllProduct", {
              category: item._id,
              subcategories: item.subcategories,
              type: "classified"
            })
          }
        >
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* GRID */}
      <View style={styles.grid}>
        {item.properties.map((prop) => (
          <PropertyCard key={prop._id} item={prop} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        renderItem={renderCategory}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        removeClippedSubviews
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  category: {
    paddingHorizontal: 12,
    marginBottom: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },

  seeAll: {
    color: "#000",
    fontSize: 13,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    padding: 6,
  },

  image: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },

  imagePlaceholder: {
    backgroundColor: "#e0e0e0",
  },

  title: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },

  meta: {
    fontSize: 11,
    opacity: 0.7,
  },

  price: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
});
