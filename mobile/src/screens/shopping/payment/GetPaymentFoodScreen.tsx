import React, { useState, useEffect } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Alert,
    ActivityIndicator
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Feather from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../../../component/api";

type RootStackParamList = {
    GetPaymentFoodScreen: {
        total: number | string,
        email: string, mobile: string,
        selectedAddress: string,
        voucherlist: object
    };
    ViewOrder: { orderid: string, orderdata: object }
};

type Props = NativeStackScreenProps<RootStackParamList, "GetPaymentFoodScreen">;

type PaymentMethod = "card" | "gpay" | "paypal" | "cod" | "cash on delivery";
import { getCartListApi } from "../context/cartApi";


const GetPaymentFoodScreen: React.FC<Props> = ({ route, navigation }) => {

    const [userid, setUserid] = useState("")
    const [loading, setLoading] = useState(false)
    const { total, email, mobile, selectedAddress, voucherlist } = route.params;
    const totalAmount = Number(total) || 0;
    console.log('get payment ', total, email, mobile, selectedAddress)
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);


    const handlePayment = async () => {
        try {
            setLoading(true)
            if (!selectedMethod) {
                setLoading(false)
                Alert.alert("Select Payment Method", "Please choose a payment method.");
                return;
            }
            // 1️⃣ Build payment message
            const messages = {
                card: `Proceed with Visa/MasterCard payment of $${totalAmount.toFixed(2)}`,
                gpay: `Proceed with Google Pay payment of $${totalAmount.toFixed(2)}`,
                paypal: `Proceed with PayPal payment of $${totalAmount.toFixed(2)}`,
                cod: `Cash on Delivery selected. Amount: $${totalAmount.toFixed(2)}`
            };
            // Save to storage (optional)
            await AsyncStorage.setItem(
                "payment_method",
                JSON.stringify({
                    paymentmethod: messages[selectedMethod]
                })
            );
            // 2️⃣ Fetch cart list
            const cartRes = await getCartListApi(userid);

            if (!cartRes?.data?.data) {
                setLoading(false)
                Alert.alert("Error", "Cart is empty!");
                return;
            }

            const cartItems = cartRes.data.data;   // <-- THIS is your cart

            console.log("Cart Items:", cartItems);

            // 3️⃣ Build the ORDER BODY to send to backend
            const orderBody = {
                orderdate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                ordertime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                products: cartItems,                      // Send as object (not JSON string unless backend wants string)
                promocode: voucherlist._id,
                payment: {
                    method: selectedMethod,
                    message: messages[selectedMethod],
                    amount: totalAmount
                },
                address: {
                    currentAddress: selectedAddress,  //currentAddress
                    shippingAddress: selectedAddress, //shippingAddress,
                    mobile: mobile,
                    email: email
                },
                deliveryfee: 50,
                vendorid: '',
                userid: userid,
            };

            console.log("ORDER BODY = ", orderBody);
            // 4️⃣ Post order to API (your global api.post)
            const response = await api.post(
                "/api/order/add",
                orderBody
            );
            console.log("ORDER SUCCESS:", response.data.data.orderid);
            setLoading(false)
            navigation.navigate("ViewOrder", {
                orderid: response.data.data.orderid,
                orderdata: response.data
            })
            //  Alert.alert("Order Successful", "Your order has been placed!");
        } catch (error) {
            console.error("❌ handlePayment ERROR:", error);
            setLoading(false)
            Alert.alert("Error", "Something went wrong while processing payment.");
        }
    };

    useEffect(() => {
        checkUser()

    }, [])

    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem('userdata');
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            // fetchCartData()
        } else {
            console.log('No user data found');
        }
    };

    return (
        <View style={styles.container}>

            {/* ---------- HEADER ---------- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={24} color="#4F46E5" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Payment</Text>
                {/*   <Text>{JSON.stringify(voucherlist)}</Text> */}
                {/*   <Text>Email {email + '----' + mobile}</Text> */}

                <View style={{ width: 24 }} />
            </View>

            {/* ---------- TOTAL ---------- */}
            <Text style={styles.total}>Total Amount: {totalAmount.toFixed(2)}</Text>

            {/* ---------- PAYMENT METHODS ---------- */}
            <TouchableOpacity
                style={[styles.option, selectedMethod === "card" && styles.selected]}
                onPress={() => setSelectedMethod("card")}
            >
                <View style={styles.row}>
                    <FontAwesome name="credit-card" size={20} color="#000" />
                    <Text style={styles.optionText}>Visa / MasterCard</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.option, selectedMethod === "gpay" && styles.selected]}
                onPress={() => setSelectedMethod("gpay")}
            >
                <View style={styles.row}>
                    <FontAwesome name="google" size={20} color="#000" />
                    <Text style={styles.optionText}>Google Pay</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.option, selectedMethod === "cash on delivery" && styles.selected]}
                onPress={() => setSelectedMethod("cash on delivery")}
            >
                <View style={styles.row}>
                    <Feather name="package" size={20} color="#000" />
                    <Text style={styles.optionText}>Cash on Delivery</Text>
                </View>
            </TouchableOpacity>

            {/* ---------- PAY NOW BUTTON ---------- */}
            <TouchableOpacity style={styles.payButton} onPress={handlePayment}
                disabled={loading}>
                {
                    loading ? <ActivityIndicator /> : <Text style={styles.payText}>Pay Now</Text>
                }

            </TouchableOpacity>

        </View>
    );
};

export default GetPaymentFoodScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: "#fff" },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 25,
    },
    headerTitle: { fontSize: 18, fontWeight: "bold" },

    total: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 20,
        textAlign: "center",
    },

    option: {
        borderWidth: 1,
        borderColor: "#888",
        borderRadius: 10,
        padding: 15,
        marginVertical: 8,
    },
    selected: {
        borderColor: "#4F46E5",
        backgroundColor: "#EEF2FF",
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    optionText: { fontSize: 12, fontWeight: "500" },

    payButton: {
        backgroundColor: "#000",
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        alignItems: "center",
    },
    payText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
