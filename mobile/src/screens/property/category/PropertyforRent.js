import {
    View, Text, TouchableOpacity,
    FlatList, Image, StyleSheet, Dimensions,
    TextInput, Keyboard
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'
import { useNavigation } from '@react-navigation/native';
const PAGE_LIMIT = 10;
const { width } = Dimensions.get("window");
import { useRoute } from "@react-navigation/native";
import api from '../../../component/api';


const PropertyforRent = () => {
    const [favorites, setFavorites] = useState([]);
    const navigation = useNavigation()
    const [categorydata, setCategorydata] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState(null);
    const route = useRoute()
    console.log('...params...', route.params);
    const { type } = route.params;
    const { filters } = route.params;

    const toggleFavorite = (id) => {
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        );
    };
    const handleSearchPress = () => {
        Keyboard.dismiss();
        onSearch(query);
        console.log('...query....', query)
    };

    const onSearch = () => {

    }

    const handleBack = () => {
        if (navigation?.canGoBack()) navigation.goBack();
        else navigation.navigate?.('Home'); // fallback if desired
    };

    useEffect(() => {
        fetchCategory();
    }, []);
    const addParamIfValid = (params, key, value) => {
    if (
        value !== undefined &&
        value !== null &&
        value !== ""
    ) {
        params[key] = value;
    }
    };

    const fetchCategory = async () => {
        if (loading || page > totalPages) return;
        setLoading(true);
        try {
            const params = {
                page,
                limit: PAGE_LIMIT,
                add_post: 'Property'
            };
            if (filters.type) params.propertyType = filters.type;
            if (filters.categoryId) params.Category = filters.categoryId;
            if (filters.subCategoryId) params.subCategory = filters.subCategoryId;

            if (filters.bedrooms) params.bedrooms = filters.bedrooms;
            if (filters.bathrooms) params.bathrooms = filters.bathrooms;
            if (filters.rentPaid) params.rentispaid = filters.rentPaid;

            if (filters.location) params.location = filters.location;

             if (filters.priceRange?.min !== undefined)
                params.minPrice = filters.priceRange.min;

            if (filters.priceRange?.max !== undefined)
                params.maxPrice = filters.priceRange.max;

            if (filters.areaSize?.min !== undefined)
                params.minSize = filters.areaSize.min;

            if (filters.areaSize?.max !== undefined)
                params.maxSize = filters.areaSize.max; 
 
            console.log('....params.prperty for rent.. ', params)

            try {
                const { data } = await api.get('/apis/property/propertyfilter/live', { params });
                setCategorydata(data.users);
                console.log('room for rent', JSON.stringify(data.users));
            } catch (error) {
                console.error("Error fetching:", error);
                setLoading(false)
            }

        } catch (error) {
            console.error("Error fetching:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const isFavorite = favorites.includes(item.id);

        return (
            <TouchableOpacity
                style={styles.card} key={item._id}
                onPress={() => navigation.navigate("PropertyDetails", { itemdetails: item })}
            >
                {/* Property Image */}
                <Image
                    source={{ uri: base.BASE_URL + item.images[0]?.image }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Price Tag */}
                {item.price && (
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>
                            {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'AED',
                                maximumFractionDigits: 0,
                            }).format(Number(item.price))}
                        </Text>
                    </View>
                )}

                {/* Favorite */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(item.id)}
                >
                    <Icon
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={22}
                        color={isFavorite ? "red" : "#000"}
                    />
                </TouchableOpacity>

                {/* Play */}
                {/*   <View style={styles.playButton}>
          <Icon name="play" size={20} color="black" />
        </View> */}

                {/* Bottom Details */}
                <View style={styles.detailsBox}>
                    <Text style={styles.title} numberOfLines={1}>{item.shortTitle}</Text>
                    <Text style={styles.location}>{item.location}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.containerHeader}>
                {/* Left: Back button */}
                <View style={styles.left}>
                    <TouchableOpacity
                        onPress={handleBack}
                        activeOpacity={0.7}
                        accessibilityLabel="Go back"
                        style={styles.iconButton}
                    >
                        <Icon name="arrow-left" size={22} color="#111" />
                    </TouchableOpacity>
                </View>

                {/* Center: Search input with search button */}
                <View style={styles.center}>
                    <View style={styles.searchBox}>
                        <Icon name="magnify" size={18} color="#888" style={styles.searchIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Search Area"
                            placeholderTextColor="#999"
                            value={query}
                            onChangeText={setQuery}
                            returnKeyType="search"
                            onSubmitEditing={handleSearchPress}
                            underlineColorAndroid="transparent"
                            accessibilityLabel="Search input"
                        />
                        <TouchableOpacity
                            onPress={handleSearchPress}
                            style={styles.searchBtn}
                            activeOpacity={0.8}
                            accessibilityLabel="Search"
                        >
                            <Text>Search</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Right: Filter / More */}
                <View style={styles.right}>
                    <TouchableOpacity
                        //  onPress={onOpenFilters}
                        activeOpacity={0.7}
                        style={styles.iconButton}
                        accessibilityLabel="Open filters"
                    >
                        <Icon name="filter-variant" size={20} color="#111" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* End Header */}
            <FlatList
                data={categorydata}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12 }}
                showsVerticalScrollIndicator={false}
                numColumns={1}
            />
        </View>
    );
};

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
        overflow: "hidden"
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
        color: "#000"
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: 4,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        // iOS Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        // Android Elevation
        elevation: 4,
    },
    playButton: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "#fff",
        width: 35,
        height: 35,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center"
    },
    detailsBox: {
        padding: 10,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: "#000"
    },
    location: {
        fontSize: 13,
        color: "#555",
        marginTop: 2,
    },
    containerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        // subtle bottom border
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e6e6e6',
    },

    left: {
        width: 44, // keeps consistent spacing
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    right: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },

    iconButton: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        padding: 6,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // elevation / shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconPlaceholder: {
        width: 32,
        height: 32,
    },

    center: {
        flex: 1,
        paddingHorizontal: 8,
    },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f7f8',
        borderRadius: 30,
        paddingVertical: Platform.OS === 'ios' ? 8 : 6,
        paddingLeft: 10,
        paddingRight: 6,
        // subtle shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
            },
            android: {
                elevation: 1,
            },
        }),
    },

    searchIcon: {
        marginRight: 8,
    },

    input: {
        flex: 1,
        fontSize: 14,
        color: '#111',
        paddingVertical: 0, // keep it vertically centered
    },

    searchBtn: {
        backgroundColor: '#f2f2f2', // primary color — change to your brand color
        width: 60,
        height: 36,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
        // shadow for button
        ...Platform.select({
            ios: {
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
});

export default PropertyforRent;
