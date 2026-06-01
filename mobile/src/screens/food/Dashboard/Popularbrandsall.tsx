import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { RouteProp, useNavigation, NavigationProp } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from "../../../component/api";
import { BASE_URL } from "../../../component/global";

// 1. Define the screens and their params
type RootStackParamList = {
  Home: undefined;
  brandlistcreen: { restaurant_id: string }; // Define that this screen needs a string ID
  RestaurantScreen: {   restaurant_id: string,
                prepTime: string,
                deliveryTime: string,
                totalTime: string }
  // Add other screens here...
};


const Popularbrandsall = ({ route }: { route: any }) => {
  const lat = route.params?.lat;
  const lng = route.params?.long;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // ✅ States
  const [brandlist, setbrandlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  // ✅ Fetch API
  const fetchbrandlist = useCallback(
    async (pageNum: number, isRefresh: boolean = false) => {
      try {
        if (isRefresh) setLoading(true);
        else setLoadingMore(true);
        console.log('...api...text...',`/api/food/list-of-brand?lat=${lat}&lng=${lng}&page=${pageNum}&limit=10`)
        const res = await api.get(
          `/api/food/list-of-brand?lat=${lat}&lng=${lng}&page=${pageNum}&limit=10`
        );
        const responseData = res.data;
        const newList = responseData.brand || [];
        console.log('....newList', newList)
        if (isRefresh) {
          setbrandlist(newList);
        } else {
          setbrandlist(prev => [...prev, ...newList]);
        }

      } catch (error) {
        console.log("brandlist Fetch Error", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lat, lng]
  );

  // ✅ Initial Load
  useEffect(() => {
    if (!lat || !lng) return;

    setPage(1);
    fetchbrandlist(1, true);
  }, [lat, lng, fetchbrandlist]);

  // ✅ Pagination
  const handleLoadMore = () => {
    if (!loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchbrandlist(nextPage);
    }
  };

  // ✅ Render Item
  const renderBrandItem = ({ item }: any) => {
    return (
      <TouchableOpacity
        style={styles.resCard}
        onPress={() => {
          navigation.navigate("brandlistcreen", {
            restaurant_id: item._id,
          });
        }}
      >
        <TouchableOpacity style={styles.resImageContainer} onPress={() => {
              navigation.navigate("RestaurantScreen", {
                "restaurant_id": item.restaurant_id?._id,
                "prepTime": prepTime,
                "deliveryTime": deliveryTime,
                "totalTime": totalTime
              })
            }}>
            <Image
                source={{ uri: BASE_URL + item?.restaurant_id?.restaurant_image }}
                style={styles.resImage}
                        />
        </TouchableOpacity>

        <View style={styles.resInfo}>
          <Text style={styles.resTitle} numberOfLines={1}>
            {item?.restaurant_id?.restaurant_name}
          </Text>
          <Text style={styles.resTitle} numberOfLines={1}>
            {item?.brand_name.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ Loader UI
  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Popular Brands</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <FlatList
        data={brandlist}
        keyExtractor={(item) => item._id}
        renderItem={renderBrandItem}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ margin: 20 }} />
          ) : (
            <View style={{ height: 50 }} />
          )
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No brands found</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  headerTitle: { fontSize: 12, fontWeight: '700' },

  // Category Styles
  catListContainer: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  catItem: { alignItems: 'center', width: 75, marginTop: 10 },
  catImageWrapper: { width: 55, height: 55, borderRadius: 27, padding: 2, backgroundColor: '#f9f9f9' },
  catSelectedWrapper: { borderWidth: 2, borderColor: '#000' },
  catImage: { width: '100%', height: '100%', borderRadius: 25 },
  catName: { fontSize: 12, marginTop: 5, color: '#666' },
  catNameActive: { fontWeight: 'bold', color: '#000' },
  activeUnderline: { width: 20, height: 3, backgroundColor: '#FFD700', marginTop: 4, borderRadius: 2 },

  // Promo Banner
  promoBanner: {
    backgroundColor: '#FFF5F5',
    margin: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEBEB'
  },
  promoText: { color: '#FF7675', fontSize: 12, fontWeight: '600' },

  // Restaurant Card Styles
  resCard: { flexDirection: 'row', padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f2f2f2'
   },
  resImageContainer: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden' },
  resImage: { width: '100%', height: '100%' },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: 'bold' },
  resInfo: { flex: 1, marginLeft: 12 },
  resTitle: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  resSubText: { color: '#777', fontSize: 13 },
  ramadanTag: { color: '#00B894', fontSize: 13, fontWeight: 'bold' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  freeText: { color: '#00B894', fontWeight: 'bold', fontSize: 14 },
  deliveryStats: { color: '#777', fontSize: 13 },
  offerBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  closingText: { color: '#FF7675', fontSize: 12, marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default Popularbrandsall;