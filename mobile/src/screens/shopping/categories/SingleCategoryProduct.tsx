import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    ScrollView,
    StyleSheet,
    ActivityIndicator, TextInput, Dimensions
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import axios from "axios";
import * as base from "../../../component/global";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ShimmerCard from "../loader/SimCard";
import DiscountRow from "../discount/DiscountRow";

type RootStackParamList = {
    CategoryShowmore: { data: any[] };
    SingleProduct: { productData: object };
};

interface Props {
    route: {
        params: {
            categoryid: string;
            categoryname: string;
        };
    };
}

const SingleCategoryProduct: React.FC<Props> = ({ route }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { categoryid, categoryname } = route.params;
    const [loading, setLoading] = useState(true);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
    const [categoryNamefilter, setCategoryNamefilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]); // What user sees

    // ------------------------- API Call -----------------------
    const fetchCategoryWise = async (reset = false) => {
        try {
            setLoading(true);
            const res = await axios.get(
                base.BASE_URL + `/api/product/categorywiseproduct`,
                {
                    params: {
                        categoryId: categoryid,
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
            setSubcategories(res.data.subcategories);
            setTotal(res.data.total);
        } catch (error) {
            console.log("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCategoryNamefilter(categoryname)
        fetchCategoryWise(true);
    }, [page]);

    // ----------------------------------------------------------
    const loadMore = () => {
        if (products.length < total) {
            setPage(prev => prev + 1);
        }
    };

    // FILTER by Subcategory
    const filterBySubcat = async(id: string, reset = false) => {
        setProducts([]);
        setLoading(true);
        setSelectedSubcat(id);
       // const filtered = products.filter(p => p.sucategoryId?._id === id);
               try {
            setLoading(true);
            const res = await axios.get(
                base.BASE_URL + `/api/product/categorywiseproduct`,
                {
                    params: {
                        categoryId: categoryid,
                        sucategoryId: id,
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
            setSubcategories(res.data.subcategories);
            setTotal(res.data.total);
        } catch (error) {
            console.log("Fetch Error:", error);
        } finally {
            setLoading(false);
        }

    };

    // ---------------------- RENDER PRODUCT CARD ----------------
    const renderProduct = ({ item }: any) => {
        // -----------------------------
        // FIXED: Use item, NOT product
        // -----------------------------
        const price = item?.sizes?.[0]?.price || item.price || 0;

        const discount = item?.specialDiscount?.value || 0;
        const isDiscounted = item?.specialDiscount?.isDiscounted || false;

        // Final Price Calculation
        const finalPrice = isDiscounted
            ? price - (price * discount) / 100
            : price;

        return (
            <TouchableOpacity style={styles.productCard} onPress={() => {
                navigation.navigate("SingleProduct", {
                    productData: item
                })
            }}>
                <Image
                    source={{ uri: base.BASE_URL + base.productpath + item.images?.[0] }}
                    style={styles.productImg}
                />
                <View style={{
                    height: 40, borderWidth: 0,
                    borderColor: 'red'
                }}>
                    <Text numberOfLines={2} style={styles.productName}>
                        {item.productname}
                    </Text>
                </View>
                <DiscountRow finalPrice={finalPrice} oldPrice={price} currency={base.currency} discount={discount} />
            </TouchableOpacity>
        )
    }


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Icon name="search" size={20} color="#777" style={{ marginRight: 8 }} />

                    <TextInput
                        placeholder="Search products..."
                        placeholderTextColor="#999"
                        style={styles.input}
                        value={categoryNamefilter}
                        onChangeText={setCategoryNamefilter}
                    />

                    {categoryNamefilter?.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setCategoryNamefilter("")}
                            style={styles.clearButton}
                        >
                            <Icon name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Action Button */}
                <TouchableOpacity style={styles.searchBtn}>
                    <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
            </View>

            {/* ------------------- SUBCATEGORY HORIZONTAL LIST ------------------- */}
            {products.length === 0 && loading ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                    {[...Array(18)].map((_, index) => (
                        <ShimmerCard key={index} />
                    ))}
                </View>
            ) : (
                <>
                    <View style={{ height: 113 }}>
                        {
                            subcategories.length > 0
                                ?
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{
                                        marginVertical: 10
                                    }}
                                >
                                    {subcategories.map(sub => (
                                        <TouchableOpacity
                                            key={sub._id}
                                            style={[
                                                styles.subcatCard,
                                                selectedSubcat === sub._id && styles.subcatActive
                                            ]}
                                            onPress={() => filterBySubcat(sub._id)}
                                        >
                                            <Image
                                                source={{ uri: base.BASE_URL + sub.image }}
                                                style={styles.subcatImg}
                                            />
                                            <Text style={styles.subcatText}>{sub.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView> : null
                        }
                    </View>
                    <View style={{
                        height: 20,
                        borderWidth: 0, borderColor: 'red',
                        alignContent: 'center', alignSelf: 'center',
                        alignItems: 'center', marginBottom: 5
                    }}>
                        <View style={{
                            alignItems: 'center', flexDirection: 'row',
                            justifyContent: 'space-between', width: '100%'
                        }}>
                            <Text style={{ fontSize: 12 }}>All Items</Text>
                            <TouchableOpacity>
                                <Icon name="options-outline" size={20} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* ------------------- PRODUCTS GRID ------------------- */}

                    <FlatList
                        data={products}
                        numColumns={3}
                        renderItem={renderProduct}
                        keyExtractor={(item, index) => index.toString()}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.6}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={
                            loading ? <ActivityIndicator size="small" color="blue" /> : null
                        }
                        contentContainerStyle={{ paddingBottom: 150 }}
                    />
                </>
            )}
        </View>
    );
};

export default SingleCategoryProduct;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 12
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff"
    },
    backButton: {
        padding: 8,
        marginRight: 10,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        backgroundColor: "#F3F5F9",
        borderRadius: 12,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginRight: 10,
        borderWidth: 1,
        borderColor: "#E1E5EE",
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: "#000",
    },
    clearButton: {
        padding: 4,
    },
    searchBtn: {
        backgroundColor: "#000",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10, height: 40,
        shadowColor: "#0057FF",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 4, justifyContent: 'center',
        alignSelf: 'center'
    },

    searchBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
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
        padding: 10, height: 90,
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
        marginBottom: 5, resizeMode: "stretch",
         backgroundColor: '#f3f4f6', // gray-100
    },
    subcatText: {
        fontSize: 12
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
    card: {
        //   width: 180,
        width: Dimensions.get("window").width * 0.30,
        borderRadius: 12,
        backgroundColor: "#f7f7f7",
        padding: 8,
    },

});

