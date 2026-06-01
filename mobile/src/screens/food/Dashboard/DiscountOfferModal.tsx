import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator,
    StyleSheet, SafeAreaView, StatusBar, TextInput
} from "react-native";
import { RouteProp, useNavigation, NavigationProp } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from "../../../component/api";
import { BASE_URL } from "../../../component/global";

// 1. Define the screens and their params
type RootStackParamList = {
    Home: undefined;
    RestaurantScreen: { restaurant_id: string }; 
};

const DiscountOfferModal = ({ route }: { route: any }) => {
    const lat = route.params?.latitude;
    const lng = route.params?.longitude;
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");

    const fetchRestaurants = useCallback(
        async (pageNum: number, isRefresh: boolean = false, search: string, lat: number, lng: number) => {
            try {
                if (isRefresh) setLoading(true);
                else setLoadingMore(true);
                const res = await api.get(
                    `/api/food/discount-nearby-restaurants?lat=${lat}&lng=${lng}&page=${pageNum}&limit=10&restaurant_name=${search}`
                );
                const responseData = res.data;
                const newList = responseData.resturant || [];
                if (isRefresh) {
                    setRestaurants(newList);
                } else {
                    setRestaurants(prev => [...prev, ...newList]);
                }
                const totalPagesCalc = Math.ceil(responseData.count / 10);
                setTotalPages(totalPagesCalc);
            } catch (error) {
                console.log("Restaurant Fetch Error", error);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        []
    );
    useEffect(() => {
        setPage(1);
        fetchRestaurants(1, true, search, lat, lng);
    }, [fetchRestaurants, search]);

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchRestaurants(nextPage, selectedCategory, true, search);
        }
    };

    const renderRestaurantItem = ({ item }: any) => {
        const isClosed = item?.is_open == 1; // Adjust based on your API
        return (
            <TouchableOpacity style={styles.resCard}
                onPress={() => {
                   // console.log('restaurant_id....', item._id)
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
                       {/*  <Text style={styles.freeText}>Free</Text> */}
                        <Text style={styles.deliveryStats}> {item?.distance_text} • {item?.delivery_time_text}</Text>
                    </View>
                    {
                        item?.offerpercent > 0 ?
                            <>
                                <View style={styles.offerBadgeRow}>
                                    <View style={[styles.badge, { backgroundColor: '#fff9c4' }]}>
                                        <Text style={[styles.badgeText, { color: '#fbc02d' }]}>{item?.offerpercent} % off any items</Text>
                                    </View>
                                   {/*  <View style={[styles.badge, { backgroundColor: '#e0f7fa' }]}>
                                        <Text style={[styles.badgeText, { color: '#00acc1' }]}>Free delivery</Text>
                                    </View> */}
                                </View>
                            </>
                            : null
                    }


                    {isClosed && <Text style={styles.closingText}>Opens at 12:00</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    const onSearch = (search: string, lat: string, lng: string) => {
        setPage(1);
        fetchRestaurants(1, selectedCategory, true, search, lat, lng);
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Restaurants</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="search-outline" size={20} color="#000" />
                </TouchableOpacity>
            </View>
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
    resTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    resSubText: { color: '#777', fontSize: 11 },
    ramadanTag: { color: '#00B894', fontSize: 12, fontWeight: 'bold' },
    deliveryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    freeText: { color: '#00B894', fontWeight: 'bold', fontSize: 14 },
    deliveryStats: { color: '#777', fontSize: 12 },
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
    clearBtn: {
        marginHorizontal: 8,
        fontSize: 16,
        color: 'gray',
    },
    searchBtn: {
        color: '#ff6600',
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2',
    },

    headerTitle: {
        fontSize: 12, // 🔥 bigger = more premium
        fontWeight: '700',
        color: '#111',
    },

    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 0,
        paddingHorizontal: 12,
        height: 42,
        backgroundColor: '#f7f7f7',
        borderRadius: 12,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#000',
    },
});

export default DiscountOfferModal;