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
  RestaurantScreen: { restaurant_id: string }; // Define that this screen needs a string ID
  // Add other screens here...
};


const ShowAAllresturant = ({ route }: { route: any }) => {
  const lat = route.params?.lat;
  const long = route.params?.long;
  const type = route.params?.type;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  // States
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  const fetchRestaurants = useCallback(
    async (lat: number, lng: number, pageNum: number, isRefresh: boolean = false) => {
      try {
        if (isRefresh) setLoading(true);
        else setLoadingMore(true);
        console.log('popuplar list ', `/api/food/nearby-restaurants?lat=${lat}&lng=${lng}&page=${pageNum}&limit=10`)
        const res = await api.get(
          `/api/food/nearby-restaurants?lat=${lat}&lng=${lng}&page=${pageNum}&limit=10`
        );

        const responseData = res.data;

        // ✅ FIXED
        const newList = responseData.resturant || [];

        if (isRefresh) {
          setRestaurants(newList);
        } else {
          setRestaurants(prev => [...prev, ...newList]);
        }

        // ✅ FIXED
        setTotalPages(responseData.totalPages || 1);

      } catch (error) {
        console.log("Restaurant Fetch Error", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Re-fetch when category changes
  useEffect(() => {
    if (!lat || !long) return;
    if (type == "popular") {
      setPage(1);
      fetchRestaurants(lat, long, 1, true);
    }
    else {
      // if offer 
      setPage(1);
      fetchRestaurants(lat, long, 1, true);
    }

  }, [lat, long]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);

      // ✅ FIXED order
      fetchRestaurants(lat, long, nextPage);
    }
  };

  const renderRestaurantItem = ({ item }: any) => {
    const isClosed = item.is_open === 1;
    return (
      <TouchableOpacity
        style={styles.resCard}
        onPress={() => {
          navigation.navigate("RestaurantScreen", {
            restaurant_id: item._id,
          });
        }}
      >
        <View style={styles.resImageContainer}>
          <Image
            source={{ uri: `${BASE_URL}${item.restaurant_image}` }}
            style={styles.resImage}
          />

          {isClosed && (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>

        <View style={styles.resInfo}>
          <Text style={styles.resTitle} numberOfLines={1}>
            {item.restaurant_name}
          </Text>

          <View style={styles.deliveryRow}>
            <Text style={styles.deliveryStats}>
              {item?.driving_distance_text}
            </Text>
            {
              item?.driving_duration_text ?
              <Text style={styles.deliveryStats}>
              { " "} Duration : {item?.driving_duration_text}
              </Text> : null
            }
          </View>

          <View style={styles.offerBadgeRow}>
            {item.offerpercent > 0 && (
              <View style={[styles.badge, { backgroundColor: '#fff9c4' }]}>
                <Text style={[styles.badgeText, { color: '#fbc02d' }]}>
                  {item.offerpercent}% OFF
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        {/*   <Text style={styles.headerTitle}>Near By all Resturant</Text> */}
        {/*   <Ionicons name="search-outline" size={22} color="#000" /> */}
      </View>

      {/* Main Restaurant List */}
      <FlatList
        data={restaurants}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        renderItem={renderRestaurantItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : <View style={{ height: 50 }} />
        )}
        ListEmptyComponent={() => !loading && <Text style={styles.emptyText}>No restaurants found</Text>}
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
  resCard: { flexDirection: 'row', padding: 16, backgroundColor: '#fff' },
  resImageContainer: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden' },
  resImage: { width: '100%', height: '100%' },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: 'bold' },
  resInfo: { flex: 1, marginLeft: 12 },
  resTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
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

export default ShowAAllresturant;