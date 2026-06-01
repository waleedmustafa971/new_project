import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    ScrollView,
    StyleSheet,
    ActivityIndicator, TextInput
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import axios from "axios";
import * as base from "../../../component/global";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Loaderscreen from "../../../component/loader/Loaderscreen";

type RootStackParamList = {
    CategoryShowmore: { data: any[] };
    SingleProduct: { productData: object };
};

interface Props {
    route: {
        params: {
            title: {
                showcasecategory: string;
            };
            showcasecategory: string; // if this is also needed
        };
    };
}

const GroupShopmore: React.FC<Props> = ({ route }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { title } = route.params;
    console.log(".....title here " + JSON.stringify(title));
    const [loading, setLoading] = useState(true);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
    const [categoryNamefilter, setCategoryNamefilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;


    // ------------------------- API Call -----------------------
    const fetchCategoryWise = async (reset = false) => {
        try {
            setLoading(true);
            const res = await axios.get(
                base.BASE_URL + `/api/product/showcasecategorywisereport`,
                {
                    params: {
                        showcasecategory: title.showcasecategory,
                        page,
                        limit
                    }
                }
            );
            if (reset) {
                setProducts(res.data.data);
            } else {
                setProducts(prev => [...prev, ...res.data.data]);
            }
            setSubcategories([]);
            setTotal(res.data.total);
        } catch (error) {
            console.log("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoryWise(true);
    }, [page]);

    // ----------------------------------------------------------
    const loadMore = () => {
        if (products.length < total) {
            setPage(prev => prev + 1);
        }
    };

    // FILTER by Subcategory
    const filterBySubcat = (id: string) => {
        setSelectedSubcat(id);
        const filtered = products.filter(p => p.sucategoryId?._id === id);
        setProducts(filtered);
    };

    // ---------------------- RENDER PRODUCT CARD ----------------
    const renderProduct = ({ item }: any) => (
        <TouchableOpacity style={styles.productCard} onPress={() => {
            navigation.navigate("SingleProduct", {
                productData: item
            })
        }}>
            <Image
                source={{ uri: `${base.BASE_URL}/uploads/products/optimized/${item.images?.[0]}` }}
                style={styles.productImg}
            />
            {/* Discount Badge */}
            {item.specialDiscount?.isDiscounted && (
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                        {item.specialDiscount.value}% OFF
                    </Text>
                </View>
            )}

            <Text numberOfLines={2} style={styles.productName}>
                {item.productname}
            </Text>

            <Text style={styles.productPrice}>
                {item.sizes?.[0]?.price || item.price}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.leftIcon}
                >
                    <Icon name="arrow-back" size={20} color="#000" />
                </TouchableOpacity>
                <View style={styles.searchWrapper}>
                    <TextInput
                        placeholder="Search..."
                        placeholderTextColor="#888"
                        style={styles.searchInput}
                        value={categoryNamefilter}
                        onChangeText={(text) => setCategoryNamefilter(text)}
                    />
                    {categoryNamefilter.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearIcon}
                            onPress={() => setCategoryNamefilter("")}
                        >
                            <Icon name="close-circle" size={20} color="#888" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={{
                height: 27,
                borderWidth: 0, borderColor: 'red',
                alignContent: 'center', alignSelf: 'center',
                alignItems: 'center', marginBottom: 5
            }}>
                <View style={{
                    alignItems: 'center', flexDirection: 'row',
                    justifyContent: 'space-between', width: '100%',
                    marginBottom: 0
                }}>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold', marginLeft: 5
                    }}>All Items</Text>
                    <TouchableOpacity>
                        <Icon name="options-outline" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>


            {/* ------------------- PRODUCTS GRID ------------------- */}
            {loading && page === 1 ? (
                <>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                        {[...Array(18)].map((_, index) => (
                            <Loaderscreen key={index} />
                        ))}
                    </View>
                </>

            ) : (
                <FlatList
                    data={products}
                    numColumns={2}
                    renderItem={renderProduct}
                    keyExtractor={(item, index) => index.toString()}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.6}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loading ? <ActivityIndicator size="small" color="blue" /> : null
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyContainer}>
                                <Icon name="cube-outline" size={60} color="#888" />
                                <Text style={styles.emptyText}>No products available</Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ paddingBottom: 150 }}
                />
            )}
        </View>
    );
};

export default GroupShopmore;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 12
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 0,
        paddingVertical: 5, marginBottom: 3
    },
    clearIcon: {
        position: "absolute",
        right: 10,
        padding: 4,
    },
    leftIcon: {
        padding: 6,
        marginRight: 10
    },

    searchWrapper: {
        flex: 1,
        justifyContent: "center",
    },

    searchInput: {
        height: 40,
        borderWidth: 1,
        borderColor: "#E5EBFC",
        borderRadius: 16,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: "#E5EBFC",
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#000",
        flex: 1,
        textAlign: "center",
        marginRight: 10   // Keeps title centered even with search box
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f3f3f3",
        borderRadius: 10,
        paddingHorizontal: 2,
        paddingVertical: 5,
        width: '100%'
    },

    /* SUBCATEGORIES */
    subcatCard: {
        backgroundColor: "#FFF",
        padding: 10,
        borderRadius: 10,
        marginRight: 10,
        alignItems: "center",
        elevation: 2
    },
    subcatActive: {
        borderWidth: 2,
        borderColor: "#007AFF",
    },
    subcatImg: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginBottom: 5
    },
    subcatText: {
        fontSize: 12,
        fontWeight: "600"
    },

    /* PRODUCTS */
    productCard: {
        flex: 1,
        backgroundColor: "#FFF",
        borderRadius: 12,
        margin: 6,
        padding: 10,
        elevation: 2
    },
    productImg: {
        width: "100%",
        aspectRatio: 1,  // makes it perfectly square
        borderRadius: 8,
        resizeMode: "cover"   // or "contain"
    },

    productName: {
        marginTop: 6,
        fontSize: 12
    },
    productPrice: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: "700",
        color: "#000"
    },
    discountBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "red",
        padding: 3,
        borderRadius: 5
    },
    discountText: {
        fontSize: 10,
        color: "#FFF"
    },
      emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 50,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: "#555",
    },
});
