import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from 'react'
import Colors from "../../../component/constants/color/color";
import Feather from "react-native-vector-icons/Feather";
import CartItem from "../../../component/cart/CartItem";
import api from "../../../component/api";
import * as base from '../../../component/global'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
    increaseQtyApi,
    decreaseQtyApi,
    deleteCartApi, getCartListApi
} from "../context/cartApi";
import { Item } from "react-native-paper/lib/typescript/components/Drawer/Drawer";
import ShippingAddress from "./ShippingAddressBox";

interface CartItemType {
    _id: string;
    productId: string;
    productname: string;
    qty: number;
    price: number;
    images?: string[];
    sizes?: { size: string; price: number; stock: number; _id: string }[];
}
type RootStackParamList = {
  ViewCart: undefined; // <-- Add this
  PaymentScreen: {
    cartItems: CartItemType[];
    total: number;
    selectedaddress: string;
    promocode: string;
  };
  // ...other screens
};

type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "ViewCart">;

const ViewCart: React.FC = () => {
    const [cartItems, setCartItems] = useState<CartItemType[]>([]);
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true)
    const [addedFromWishlist, setAddedFromWishlist] = useState<any[]>([]);
    const [userid, setUserid] = useState("")
    //const navigation = useNavigation();
    const [selectedAddress, setSelectedAddress] = useState("");
    const navigation = useNavigation<ViewCartScreenProp>();
    
    const total = cartItems.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
    );
    const handleAdd = async (item: CartItemType) => {
        try {
            await increaseQtyApi(item._id);
            fetchCartData();
        } catch (err) {
            console.log("Add qty error:", err);
        }
    };

    const handleRemove = async (item: CartItemType) => {
        try {
            if (item.qty <= 1) return handleDelete(item);

            await decreaseQtyApi(item._id);
            fetchCartData();
        } catch (err) {
            console.log("Remove qty error:", err);
        }
    };

    const handleDelete = async (item: CartItemType) => {
        try {
            await deleteCartApi(item._id);
            fetchCartData();
        } catch (err) {
            console.log("Delete error:", err);
        }
    };

    const fetchCartData = async () => {
        setLoading(true);
        try {
            const res = await getCartListApi(userid);   // <-- WAIT FOR RESPONSE
            if (res?.data?.data) {
                setCartItems(res.data.data);              // <-- UPDATE STATE
            } else {
                setCartItems([]);                         // fallback
            }
            setLoading(false)
        } catch (err) {
             setLoading(false)
            console.error("❌ Fetch Cart Error:", err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem('userdata');
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            console.log('....userid...', userData._id)
            setUserid(userData._id);
            fetchCartData()
        } else {
            console.log('No user data found');
        }
    };

    const paymentPage = () => {
        console.log('...address.... ', selectedAddress)
        navigation.navigate("PaymentScreen", {
        cartItems : cartItems,
        total: total,
        selectedaddress: selectedAddress,
        promocode : ""
        });
    }
    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}>
                        <Feather name="arrow-left" size={25} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Cart</Text>
                </View>
                <ShippingAddress onAddressLoaded={setSelectedAddress}/>
                {
                    loading ? 
                    <View>
                        <ActivityIndicator />
                    </View>
                    : null
                }
                {cartItems.length === 0 && addedFromWishlist.length === 0 ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <View style={styles.emptyContainer}>
                            <View style={styles.row}>
                                <Feather
                                    name="shopping-cart"
                                    size={30}
                                    color={Colors.purple}
                                    style={styles.emptyIcon}
                                />
                            </View>
                            <Text style={styles.emptyText}>Your Cart is Empty</Text>
                        </View>
                        {/*  <WishlistSection items={wishlist} onAddToCart={handleAddToCart} /> */}
                    </View>
                ) : (
                    <>
                        <View style={{ paddingHorizontal: 16 }}>
                            {cartItems.length > 0 && (
                                <>
                                    {cartItems.map((item) => (
                                        <CartItem
                                            key={item._id}
                                            item={item}
                                            url={base.BASE_URL}
                                            onAdd={() => handleAdd(item)}
                                            onRemove={() => handleRemove(item)}
                                            onDelete={() => handleDelete(item)}
                                        />
                                    ))}
                                </>
                            )}
                            {addedFromWishlist.length > 0 && (
                                <>
                                    <Text style={styles.cartTitle}>Added from Wishlist</Text>
                                    {addedFromWishlist.map((item) => (
                                        <CartItem
                                            key={item.id}
                                            item={item}
                                            onAdd={() => handleAdd(item.id)}
                                            onRemove={() => handleRemove(item.id)}
                                            onDelete={() => handleDelete(item.id)}
                                        />
                                    ))}
                                </>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
            <View style={styles.bottomBar}>
                <Text style={styles.totalText}>Total: {base.currency} {total.toFixed(2)} </Text>
                <TouchableOpacity
                    style={[
                        styles.checkoutBtn,
                        total === 0 && { backgroundColor: Colors.lightPurple }, // lighter color when total=0
                    ]}
                    onPress={() => {
                        if (total > 0) {
                          paymentPage()

                        }
                    }}
                    disabled={total === 0} // optional: disables button press
                >
                    <Text
                        style={[
                            styles.checkoutText,
                            total === 0 && { color: Colors.purple }, // dim text color when disabled
                        ]}
                    >
                        Checkout
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

    )
}

export default ViewCart

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
        // padding: ,
    },
    addText: {
        fontWeight: "700",
        fontSize: 25,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    emptyIcon: {
        padding: 15,
    },
    row: {
        borderRadius: 100,
        backgroundColor: "#fff",
        padding: 1,
        marginRight: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
    },
    row1: {
        backgroundColor: Colors.lightPurple,
        padding: 5,
        marginTop: 10,
        paddingHorizontal: 12,
        marginLeft: -10,
        alignSelf: "center",
        borderRadius: 50,
    },
    value: {
        fontSize: 20,
        color: Colors.purple,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 100,
    },
    emptyText: {
        marginTop: 10,
        color: Colors.purple,
        fontSize: 16,
        fontWeight: "500",
    },
    bottomBar: {
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
    totalText: {
        fontSize: 16,
        fontWeight: "700",
    },
    checkoutBtn: {
        backgroundColor: Colors.primary || "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    checkoutText: {
        color: "#fff",
        fontWeight: "600",
    },
    cartTitle: {
        fontSize: 15,
        marginVertical: 10,
    },
    backBtn: {
  padding: 10,
  marginLeft: 10,
},
header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingHorizontal: 10,
  paddingTop: 10,
},
title: {
  fontWeight: "700",
  fontSize: 25,
  marginLeft: 10,
  flex: 1, // pushes the cart count to the right
},

});
