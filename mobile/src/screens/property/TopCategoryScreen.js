// TopCategoryScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import * as base from '../../component/global'

export default function TopCategoryScreen({ navigation }) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Array of categories: [{ _id: "Residential", properties: [...] }, ...]
  const [categories, setCategories] = useState([]);

  const fetchPage = useCallback(async (pageToLoad = 1, isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    console.log('...' + `${base.BASE_URL}/apis/property/gettopcategory?page=${pageToLoad}&limit=10`)
    try {
      const res = await fetch(`${base.BASE_URL}/apis/property/gettopcategory?page=${pageToLoad}&limit=10`);
      const json = await res.json();

      // Defensive: ensure data shape
      const incoming = Array.isArray(json?.data) ? json.data : [];

      setTotalPages(Number(json?.totalPages || 1));

      setCategories(prev => {
        if (isRefresh || pageToLoad === 1) {
          return incoming;
        }
        // Merge pages by category _id to avoid duplicates
        const map = new Map(prev.map(c => [c._id, c]));
        incoming.forEach(c => {
          if (!map.has(c._id)) {
            map.set(c._id, c);
          } else {
            // If the same category appears again (rare), you could merge properties here
            const merged = map.get(c._id);
            const byId = new Map(merged.properties.map(p => [String(p._id), p]));
            c.properties.forEach(p => byId.set(String(p._id), p));
            merged.properties = Array.from(byId.values());
            map.set(c._id, merged);
          }
        });
        return Array.from(map.values());
      });

      setPage(pageToLoad);
       setLoading(false)
    } catch (e) {
      console.error("gettopcategory fetch error:", e);
      setLoading(false)
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const onEndReached = () => {
    if (!loading && page < totalPages) {
      fetchPage(page + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPage(1, true);
  };

  const renderProperty = ({ item, index }) => {
    const imgUrl = item?.images?.[0]?.image
      ? `${item.images[0].image}` // adjust if your image paths are absolute
      : undefined;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8} 
        onPress={() => {
            navigation.navigate("PropertyDetails",{
          itemdetails: item
        })
        }} key={index}
      >
        {imgUrl ? (
          <Image source={{ uri: base.BASE_URL + imgUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.imgPlaceholder]} />
        )}
        <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
          {item?.shortTitle || "Untitled"}
        </Text>
        <Text style={styles.cardMeta}>
          {item?.city ? `${item.city}, ${item.country || ""}` : (item?.country || "")}
        </Text>
        {typeof item?.price !== "undefined" && (
          <Text style={styles.cardPrice}>{item.price}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategory = ({ item, index }) => {
    return (
      <View style={styles.categoryBlock} key={index}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle} numberOfLines={1} ellipsizeMode="tail">
            {item?._id || "Unknown"}
          </Text>
          {/* Optional: "View All" per category */}
          {/*
           <TouchableOpacity onPress={() => navigation?.navigate('Category', { name: item._id })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity> */}
        </View>

        <FlatList
          data={item?.properties || []}
          keyExtractor={(p) => String(p._id)}
          renderItem={renderProperty}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hListContent}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(c) => String(c._id)}
        renderItem={renderCategory}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        contentContainerStyle={styles.vListContent}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "#fff", marginBottom: 50 },
  vListContent: { paddingVertical: 12 },
  categoryBlock: { paddingHorizontal: 12 },
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingHorizontal: 4 },
  categoryTitle: { fontSize: 18, fontWeight: "700", maxWidth: "80%" },
  viewAll: { fontSize: 14, fontWeight: "600" },

  hListContent: { paddingHorizontal: 4 },

  card: {
    width: 180,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    padding: 8,
  },
  cardImage: { width: "100%", height: 110, borderRadius: 10, backgroundColor: "#eaeaea" },
  imgPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 8, fontSize: 14, fontWeight: "700" },
  cardMeta: { marginTop: 2, fontSize: 12, opacity: 0.7 },
  cardPrice: { marginTop: 6, fontSize: 14, fontWeight: "700" },
};
