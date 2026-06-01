import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator, TextInput
} from "react-native";
import React, { useEffect, useState } from 'react'
import Colors from "../../../component/constants/color/color";
import Feather from "react-native-vector-icons/Feather";
import FoodCartItem from "./FoodCartItem";
import api from "../../../component/api";
import * as base from '../../../component/global'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
    increaseQtyApi,
    decreaseQtyApi,
    deleteCartApi, getCartListApi
} from "../../../screens/shopping/context/foodcartApi"; // same api using ecommerce
import { Item } from "react-native-paper/lib/typescript/components/Drawer/Drawer";
import VoucherModal from "../../shopping/payment/VoucherModal";
import VoucherModalFood from "../../shopping/payment/VoucherModalFood";
//import ShippingAddress from "./ShippingAddressBox";
//import { shippingOptions } from "./cartData";
import { foodshippingOptions } from "../../shopping/payment/cartData";

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
    FoodViewCart: undefined; // <-- Add this
    PaymentScreenFood: {
        cartItems: CartItemType[];
        total: number;
        selectedaddress: string;
        promocode: object;
        deliveryfees: object;
    };
    // ...other screens
};

type Promo = {
    _id?: string;
    promo_code: string;
    message?: string;
    start_date: string; // yyyy-mm-dd
    end_date: string;
    no_of_users?: number;
    minimum_order_amount?: number;
    discount: number;
    discount_type: "percentage" | "amount";
    max_discount_amount?: number;
    repeat_usage?: boolean;
    no_of_repeat_usage?: number;
    image?: string;
    status?: boolean;
    is_cashback?: boolean;
    list_promocode?: boolean;
};


type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "FoodViewCart">;

const FoodViewcart: React.FC = () => {
    const [cartItems, setCartItems] = useState<CartItemType[]>([]);
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true)
    const [addedFromWishlist, setAddedFromWishlist] = useState<any[]>([]);
    const [userid, setUserid] = useState("")
    //const navigation = useNavigation();
    const [selectedAddress, setSelectedAddress] = useState("");
    const navigation = useNavigation<ViewCartScreenProp>();
    const [deliveryfees, setDeliveryfees] = useState<object>([]);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [promos, setPromos] = useState<Promo[]>([]);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [voucherModalVisible, setVoucherModalVisible] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
    const [selectedVoucheramount, setSelectedVoucheramount] = useState<any>(null);
    const [selectedShipping, setSelectedShipping] = useState(foodshippingOptions[0]);

    const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
    );
    const shippingCost = selectedShipping?.cost || 0;
    const total = subtotal + shippingCost - selectedVoucheramount;

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
        navigation.navigate("PaymentScreenFood", {
            cartItems: cartItems,
            total: total,
            selectedaddress: selectedAddress,
            promocode: selectedVoucher, // object
            deliveryfees: selectedShipping // this is object
        });
    }
    const fetchPromos = async (p = 1) => {
        try {
            setLoading(true);
            const res = await api.get('/apis/promo/list', { params: { page: p, limit } });
            if (res.data && res.data.success !== false) {
                setPromos(res.data.data || []);
                setPage(res.data.page || p);
                setTotalPages(res.data.totalPages || 1);
            } else {
                setPromos([]);
            }
        } catch (err) {
            console.error(err);
            // optional: toast
        } finally {
            setLoading(false);
        }
    };

    const handleApplyVoucher = (voucher: any) => {
        setSelectedVoucher(voucher);
        setSelectedVoucheramount(voucher?.discount)
        console.log('...discount...' + JSON.stringify(voucher))
        setVoucherModalVisible(false);
        //how to reload this calculation subtotal and total 
    };


    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}>
                        <Feather name="arrow-left" size={17} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.title}>CheckOut</Text>
                </View>
                {/*  <ShippingAddress onAddressLoaded={setSelectedAddress}/> */}
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
                                        <FoodCartItem
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

                        </View>
                    </>
                )}
            </ScrollView>
            <View style={styles.bottomBar}>
                {/* Subtotal Section */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Sub Total</Text>
                        <Text style={styles.value}>
                            {base.currency} {subtotal.toFixed(2)}
                        </Text>
                    </View>
                </View>
                <View style={styles.section_delivery}>
                    <Text style={styles.title1}>Delivery Options</Text>
                    {foodshippingOptions?.map((option: any) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.option,
                                selectedShipping.id === option.id && styles.active,
                            ]}
                            onPress={() => setSelectedShipping(option)}
                        >
                            <View style={styles.option1}>
                                <Text style={styles.optionTitle}>{option.type}</Text>
                                <Text style={styles.optionSub}>{option.duration}</Text>
                                <Text style={styles.optionRight}>
                                    {base.currency} {option.cost.toFixed(2)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.voucherContainer}>
                    <Text style={{ fontSize: 12 }}>
                        {
                            selectedVoucheramount > 0 ? <>
                                Voucher Amount : {base.currency} {selectedVoucheramount}
                            </>
                                : "No yet selected any voucher"
                        }
                    </Text>
                    <TouchableOpacity style={styles.applyBtn} onPress={() => {
                        fetchPromos()
                        setVoucherModalVisible(true)
                    }}>
                        <Text style={styles.applyText}>Discount Voucher</Text>
                    </TouchableOpacity>
                </View>

                {/* Total Section */}
                <View style={styles.section_total}>
                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Total (Incl. fees & tax)</Text>
                        <Text style={styles.totalValue}>
                            {base.currency} {total.toFixed(2)}
                        </Text>
                    </View>

                    <Text style={styles.summaryText}>
                        See summary: {base.currency} {total.toFixed(2)}
                    </Text>
                </View>

                {/* Checkout Button */}
                <TouchableOpacity
                    style={[
                        styles.checkoutBtn,
                        total === 0 && { backgroundColor: Colors.lightPurple },
                    ]}
                    onPress={() => {
                        if (total > 0) paymentPage();
                    }}
                    disabled={total === 0}
                >
                    <Text
                        style={[
                            styles.checkoutText,
                            total === 0 && { color: Colors.purple },
                        ]}
                    >
                       Checkout
                    </Text>
                </TouchableOpacity>
            </View>
            <VoucherModalFood
                visible={voucherModalVisible} promo={promos}
                onClose={() => setVoucherModalVisible(false)}
                onApply={handleApplyVoucher}
            />

        </View>

    )
}

export default FoodViewcart

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
        // padding: ,
    },
    addText: {
        fontWeight: "700",
        fontSize: 12,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    emptyIcon: {
        padding: 15,
    },
    row: {
        backgroundColor: "#fff",
        padding: 1,
        marginRight: 10,
        flexDirection: 'row', justifyContent: 'space-between'
    },
    row_fee: {
        backgroundColor: "#fff",
        padding: 1,
        marginRight: 10,
        flexDirection: 'row', justifyContent: 'space-between'
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
        fontSize: 12,
        color: Colors.black,
    },
    value_fee: {
        fontSize: 12,
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
        fontSize: 12,
        fontWeight: "500",
    },
    bottomBar: {
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: "#eee", position: 'absolute', bottom: 0,
        width: '100%'
    },

    totalText: {
        fontSize: 12,
        fontWeight: "700",
    },
    cartTitle: {
        fontSize: 12,
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
        fontSize: 12,
        marginLeft: 10,
        flex: 1, // pushes the cart count to the right
    },
    section_total: {
        marginBottom: 10,
    },

    section: {
        marginBottom: 5,
    },
    section_fee: {
        marginBottom: 12,
    },
    section_delivery: {
        backgroundColor: '#f2f2f2', padding: 13,
        borderRadius: 10, marginBottom: 2
    },

    labeldeliveryfee: {
        fontSize: 12,
        color: "#666",
    },
    label: {
        fontSize: 14,
        color: "#666",
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: "600",
    },

    totalValue: {
        fontSize: 11,
        color: Colors.black,
    },

    summaryText: {
        marginTop: 4,
        fontSize: 13,
        color: "#888",
    },

    voucherContainer: {
        flexDirection: "row",
        marginBottom: 12, justifyContent: 'space-between', marginTop: 5
    },

    voucherInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginRight: 8,
    },

    applyBtn: {
        backgroundColor: Colors.resturantprimarybutton,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: 8, height: 40
    },

    applyText: {
        color: "#fff",
        fontSize: 12
    },

    checkoutBtn: {
        backgroundColor: Colors.resturantprimarybutton,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },

    checkoutText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    title1: { fontSize: 12, marginBottom: 10 },
    option: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        marginBottom: 10,
    },
    option1: {

        borderRadius: 12,
        padding: 15,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    active: { borderColor: Colors.purple, backgroundColor: Colors.lightPurple },
    optionTitle: { fontSize: 12 },
    optionSub: { color: "#666", fontSize: 10 },
    optionRight: { fontSize: 12 },


});
