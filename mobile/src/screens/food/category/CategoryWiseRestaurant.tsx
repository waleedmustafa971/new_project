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
  StatusBar, TextInput
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


const CategoryWiseRestaurant = ({ route }: { route: any }) => {
  const initialCategoryId = route.params?.category_id;
  const latitude = route.params?.latitude;
  const longitude = route.params?.longitude;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showsearch, setShowsearch] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 2. Fetch Restaurants with Pagination
  // 2. Update Restaurant Fetch
  const fetchRestaurants = useCallback(async (pageNum: number, categoryId: string, isRefresh: boolean = false,
    latitude: string, longitude: string
  ) => {
    try {
      if (isRefresh) setLoading(true);
      else setLoadingMore(true);
      console.log(`/api/food/get-items-by-categories?category_id=${categoryId}&page=${pageNum}&limit=10&lat=${latitude}&lng=${longitude}`)
      const res = await api.get(`/api/food/get-items-by-categories?category_id=${categoryId}&page=${pageNum}&limit=10&lat=${latitude}&lng=${longitude}`);
      const responseData = res.data;
      const newList = responseData.data || [];
      const category = responseData.all_category || [];
      setCategories(category)
      if (isRefresh) {
        setRestaurants(newList);
      } else {
        setRestaurants(prev => [...prev, ...newList]);
      }
      setTotalPages(responseData.total_pages);
    } catch (error) {
      console.log("Restaurant Fetch Error", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Re-fetch when category changes
  useEffect(() => {
    if (selectedCategory) {
      setPage(1);
      fetchRestaurants(1, selectedCategory, true, latitude, longitude);
    }
  }, [selectedCategory, fetchRestaurants]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRestaurants(nextPage, selectedCategory);
    }
  };

  // UI Renders
  const renderCategoryItem = ({ item }: any) => {
    const isSelected = selectedCategory === item._id;
    return (
      <TouchableOpacity
        style={styles.catItem}
        onPress={() => setSelectedCategory(item._id)}
      >
        <View style={[styles.catImageWrapper, isSelected && styles.catSelectedWrapper]}>
          <Image source={{ uri: `${BASE_URL}${item.category_image}` }} style={styles.catImage} />
        </View>
        <Text style={[styles.catName, isSelected && styles.catNameActive]}>{item.category_name}</Text>
        {isSelected && <View style={styles.activeUnderline} />}
      </TouchableOpacity>
    );
  };

  const renderRestaurantItem = ({ item }: any) => {
    const isClosed = item.restaurant_id.is_closed; // Adjust based on your API
    return (
      <TouchableOpacity style={styles.resCard}
        onPress={() => {
          console.log('restaurant_id....', item._id)
          navigation.navigate("RestaurantScreen", {
            "restaurant_id": item?.restaurant_id?._id
          })
        }}>
        <View style={styles.resImageContainer}>
          <Image source={{ uri: `${BASE_URL}${item.restaurant_id.restaurant_image}` }} style={styles.resImage} />
          {isClosed && (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>

        <View style={styles.resInfo}>
          <Text style={styles.resTitle} numberOfLines={1}>{item.restaurant_id.restaurant_name}</Text>
          <View style={styles.tagRow}>
            <Text style={styles.resSubText}>{item?.item_name} </Text>
            {/*   <Text style={styles.ramadanTag}>Ramadan</Text> */}
          </View>

          <View style={styles.deliveryRow}>
            {/*  <Text style={styles.freeText}>Free</Text> */}
            <Text style={styles.deliveryStats}> {item?.delivery_time_driving_min} mint • {item?.distance_driving_text}</Text>
          </View>

          <View style={styles.offerBadgeRow}>
            <View style={[styles.badge, { backgroundColor: '#fff9c4' }]}>
              {
                item?.restaurant_id?.offerpercent > 0 ?
                  <>
                    <Text style={[styles.badgeText, { color: '#fbc02d' }]}>
                      {item?.restaurant_id?.offerpercent} off select items</Text>
                  </> : null
              }

            </View>
            {/*  <View style={[styles.badge, { backgroundColor: '#e0f7fa' }]}>
              <Text style={[styles.badgeText, { color: '#00acc1' }]}>Free delivery</Text>
            </View> */}
          </View>

          {isClosed && <Text style={styles.closingText}>Opens at 12:00</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All restaurants</Text>
        <TouchableOpacity onPress={() => {
          setShowsearch(true)
        }}>
          <Ionicons name="search-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>
      <View style={styles.catListContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item._id}
          renderItem={renderCategoryItem}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        />
      </View>
      {
        showsearch ?
          <>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                placeholder="Search restaurants..."
                placeholderTextColor="#999"
                style={styles.input}
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity onPress={() => {
                setSearch("");
              }}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            </View>
          </> : null
      }
      <FlatList
        data={restaurants}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        renderItem={renderRestaurantItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        /*   ListHeaderComponent={() => (
            <View style={styles.promoBanner}>
              <Text style={styles.promoText}>🧡 50% off on all  |  Free delivery · Unlimited</Text>
            </View>
          )} */
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
  input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#000',
    },
  // Category Styles
  catListContainer: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  catItem: { alignItems: 'center', width: 75, marginTop: 10 },
  catImageWrapper: { width: 55, height: 55, borderRadius: 27, padding: 2, backgroundColor: '#f9f9f9' },
  catSelectedWrapper: { borderWidth: 2, borderColor: '#000' },
  catImage: { width: '100%', height: '100%', borderRadius: 25 },
  catName: { fontSize: 12, marginTop: 5, color: '#666' },
  catNameActive: { fontWeight: 'bold', color: '#000' },
  activeUnderline: { width: 20, height: 3, backgroundColor: '#FFD700', marginTop: 4, borderRadius: 2 },
searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 10,
        paddingHorizontal: 12,
        height: 42,
        backgroundColor: '#f7f7f7',
        borderRadius: 12,
    },
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
  resImageContainer: { width: 110, height: 80, borderRadius: 12, overflow: 'hidden' },
  resImage: { width: '100%', height: '100%' },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#fff', fontWeight: 'bold' },
  resInfo: { flex: 1, marginLeft: 12 },
  resTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
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

export default CategoryWiseRestaurant;