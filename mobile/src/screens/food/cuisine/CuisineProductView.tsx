import React, { useEffect, useState, useCallback } from "react";
import {
    View,Text,FlatList,Image,TouchableOpacity,ActivityIndicator,
    StyleSheet,SafeAreaView,StatusBar,TextInput
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


const CuisineProductView = ({ route }: { route: any }) => {
    const initialCategoryId = route.params?.cuisine_id;
    const latitude = route.params?.latitude;
    const longitude = route.params?.longitude;
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");

    const fetchRestaurants = useCallback(async (pageNum: number, categoryId: string, isRefresh: boolean = false, search: string) => {
        try {
            if (isRefresh) setLoading(true);
            else setLoadingMore(true);
            const res = await api.get(
                `/api/food/get-items-by-cuisines?foodcuisine=${categoryId}&page=${pageNum}&limit=10&restaurant_name=${search}`
            );
            // CHANGE THIS: res.json() is for Fetch API. For Axios, use res.data
            const responseData = res.data;
            const newList = responseData.data || [];
            //  const category = responseData.all_category || [];
            //  setCategories(category)
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

    useEffect(() => {
        setPage(1);
        fetchRestaurants(1, selectedCategory, true, search);
    }, [fetchRestaurants, search]);

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchRestaurants(nextPage, selectedCategory, true, search);
        }
    };

    const renderRestaurantItem = ({ item }: any) => {
        const isClosed = item?.is_closed; // Adjust based on your API
        return (
            <TouchableOpacity style={styles.resCard}
                onPress={() => {
                    console.log('restaurant_id....', item._id)
                    navigation.navigate("RestaurantScreen", {
                        "restaurant_id": item?._id
                    })
                }}>
                <View style={styles.resImageContainer}>
                    <Image source={{ uri: `${BASE_URL}${item.restaurant_image}` }} style={styles.resImage} />
                    {isClosed && (
                        <View style={styles.closedOverlay}>
                            <Text style={styles.closedText}>Closed</Text>
                        </View>
                    )}
                </View>

                <View style={styles.resInfo}>
                    <Text style={styles.resTitle} numberOfLines={1}>{item.restaurant_name}</Text>
                    <View style={styles.tagRow}>
                        <Text style={styles.resSubText}>Fast Food, Pizza • </Text>
                        <Text style={styles.ramadanTag}>Ramadan</Text>
                    </View>

                    <View style={styles.deliveryRow}>
                        <Text style={styles.freeText}>Free</Text>
                        <Text style={styles.deliveryStats}> 3.9 • 30 min • 1.9 km</Text>
                    </View>

                    <View style={styles.offerBadgeRow}>
                        <View style={[styles.badge, { backgroundColor: '#fff9c4' }]}>
                            <Text style={[styles.badgeText, { color: '#fbc02d' }]}>50% off select items</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: '#e0f7fa' }]}>
                            <Text style={[styles.badgeText, { color: '#00acc1' }]}>Free delivery</Text>
                        </View>
                    </View>

                    {isClosed && <Text style={styles.closingText}>Opens at 12:00</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    const onSearch = (search: string) => {
        setPage(1);
        fetchRestaurants(1, selectedCategory, true, search);
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All restaurants</Text>
                <Ionicons name="search-outline" size={22} color="#000" />
            </View>
            {/* Main Restaurant List */}
            <FlatList
                data={restaurants}
                keyExtractor={(item, index) => `${item._id}-${index}`}
                renderItem={renderRestaurantItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={() => (
                    <View>
                        {/* Search Box */}
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Search restaurant name..."
                                placeholderTextColor="#f2f2f2"
                                value={search}
                                onChangeText={setSearch}
                            />
                            {/* Clear Button */}
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <Text style={styles.clearBtn}>✖</Text>
                                </TouchableOpacity>
                            )}
                            {/* Search Button */}
                            <TouchableOpacity onPress={() => {
                                console.log('Search:', search)
                                onSearch(search)
                            }}>
                                <Text style={styles.searchBtn}>Search</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    promoBanner: {
        backgroundColor: '#ffe4e1',
        padding: 10,
        alignItems: 'center',
    },
    promoText: {
        fontWeight: 'bold', fontSize: 12
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        margin: 5,
        borderRadius: 10,
        elevation: 2,
    },
    input: {
        flex: 1,
        padding: 3, fontSize: 12
    },
    clearBtn: {
        marginHorizontal: 8,
        fontSize: 16,
        color: 'gray',
    },
    searchBtn: {
        color: '#ff6600',
        fontWeight: 'bold',
    },
});

export default CuisineProductView;