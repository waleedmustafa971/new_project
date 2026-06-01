import {
  View, Text, ScrollView,
  StyleSheet,
  TouchableOpacity, Alert,
  ActivityIndicator
} from 'react-native'
import React, { useEffect, useState } from 'react'
import Feather from "react-native-vector-icons/Feather";
import ShippingAddress from '../cart/ShippingAddressBox'
import PaymentHeaderFood from './PaymentHeaderFood';
import FoodDeliveryAddress from './FoodDeliveryAddress';
import PaymentItemsSectionFood from './PaymentItemsSectionFood';
import UserAddressModal from '../cart/UserAddressModal';
import { Dimensions } from "react-native";
import Colors from '../../../component/constants/color/color';
import FontAwesome from "react-native-vector-icons/FontAwesome";
import api from '../../../component/api';
import * as base from '../../../component/global';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getCartListApi } from '../context/foodcartApi';
import { useCart } from '../context/CartContextFood';

const { width } = Dimensions.get("window");
const isTablet = width >= 768;
interface Props {
  route: {
    params: {
      cartItems: object;
      total: number;
      selectedaddress: string;
    };
  };
}
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
  ViewOrder: {
    orderid: string;
    orderdata: string;
    modulename: string;
  }
  // ...other screens
};

type PaymentMethod = "card" | "gpay" | "cash on delivery";
type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "PaymentScreenFood">;

const PaymentScreenFood: React.FC<Props> = ({ route }) => {
  const { cartItems, total, selectedaddress, promocode, deliveryfees } = route.params;
  const navigation = useNavigation<ViewCartScreenProp>();
  const { clearCart, fetchCart } = useCart();
  const [totalAmount, setTotalAmount] = useState(0);
  const [totaldiscount, setTotaldiscount] = useState(0);
  // const [selectedAddress, setSelectedAddress] = useState(selectedaddress);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [voucherlist, setVoucherlist] = useState<any>([])
  const [addressviewmodal, setAddressviewmodal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [userid, setUserid] = useState("")

  useEffect(() => {
    loadUser()
  }, []);

  const loadUser = async () => {
    const value = await AsyncStorage.getItem("USER_LOCATION");
    if (value) {
      const locationData = JSON.parse(value);
      setAddress(locationData?.address);
    }
  };

  const handlePayment = async () => {
    if (!address) {
      setLoading(false)
      Toast.show({
        type: 'error', // or 'success', 'info'
        text1: 'Select Delivery Address',
        text2: 'required'
      });
      return;
    }
    if (!selectedMethod) {
      setLoading(false)
      Toast.show({
        type: 'error', // or 'success', 'info'
        text1: 'Select Payment Method',
        text2: 'Please choose a payment method.'
      });
      return;
    }
    const jsonValue = await AsyncStorage.getItem('userdata');
    if (jsonValue) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      console.log('userid: ', userData._id);
      if (selectedMethod === "card") {

      }
      else if (selectedMethod === "gpay") {

      }
      else if (selectedMethod === "cash on delivery") {
        CashonDelivery(userData._id)
      }
      else {
        Toast.show({
          type: 'error', // or 'success', 'info'
          text1: 'Select Payment Method',
          text2: 'Please choose a payment method.'
        });
        return
      }
      {/* gpay  cash on delivery*/ }
    }
  };

  const CashonDelivery = async (userid: string) => {
  //  Alert.alert("Cash on delivery")
    try {
      setLoading(true)
      if (!selectedMethod) {
        setLoading(false)
        Toast.show({
          type: 'error', // or 'success', 'info'
          text1: 'Select Payment Method',
          text2: 'Please choose a payment method.'
        });
        return;
      }
      // 1️⃣ Build payment message
      const messages: any = {
        paymenttype: `Proceed with ${selectedMethod} payment of $${totalAmount.toFixed(2)}`
      };
      // Save to storage (optional)
      await AsyncStorage.setItem(
        "payment_method",
        JSON.stringify({
          paymentmethod: messages[selectedMethod]
        })
      );
      // 2️⃣ Fetch cart list
      const cartRes = await getCartListApi(userid); //getCartListApi

      if (!cartRes?.data?.data) {
        setLoading(false)
        Toast.show({
          type: 'error', // or 'success', 'info'
          text1: 'Cart is empty!'
        });
        return;
      }
      const cartItems = cartRes.data.data;   // <-- THIS is your cart
      console.log(" Cart Items: ", cartItems);
      // 3️⃣ Build the ORDER BODY to send to backend
      const orderBody = {
        orderdate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
        ordertime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        products: cartItems,                      // Send as object (not JSON string unless backend wants string)
        promocode: promocode,
        payment: {
          method: selectedMethod,
          message: messages[selectedMethod],
          amount: totalAmount
        },
        address: {
          currentAddress: address,  //currentAddress
          shippingAddress: address, //shippingAddress,
          mobile: mobile,
          email: email,
          leaveatdoor: leaveAtDoor
        },
        deliveryfee: deliveryfees?.cost, // per kilo
        vendorid: '',
        userid: userid
      };
      console.log("ORDER BODY = ", orderBody);
      // 4️⃣ Post order to API (your global api.post)
      const response = await api.post(
        "/api/order/food-add",
        orderBody
      );
      console.log("ORDER SUCCESS:", response.data.data.orderid);
    await clearCart();   // ✅ clears UI instantly
    await fetchCart();   // ✅ sync with backend (optional but good)
      setLoading(false)
      navigation.navigate("ViewOrder", {
        orderid: response.data.data.orderid,
        orderdata: response.data, modulename: "food"
      })
      //  Alert.alert("Order Successful", "Your order has been placed!");
    } catch (error) {
      console.error("❌ handlePayment ERROR:", error);
      setLoading(false)
      Alert.alert("Error", "Something went wrong while processing payment.");
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={{
        borderWidth: 0,
        borderColor: 'red'
      }}>
        <PaymentHeaderFood />
        <View style={{ flex: 1 }}>
          <ShippingAddress
            onAddressLoaded={(addr: any) => setSelectedAddress(addr)}
            address={address}
            onToggleModal={(val: any) => setAddressviewmodal(val)}
          />

          <FoodDeliveryAddress
            onContactChange={(data: any) => {
              setMobile(data.mobile);
              setEmail(data.email);
            }}
          />
          {/*   <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              // padding: 13
            }}
            onPress={() => setLeaveAtDoor(!leaveAtDoor)}>
            <Text style={{ fontSize: 12 }}>
              Leave at the Door
            </Text>
            <View
              style={{
                marginLeft: 10,
                backgroundColor: "#FCE4EC",
                padding: 10, width: 40, height: 40,
                borderRadius: 30, 
              }}
            >
              {leaveAtDoor && (
                <View
                  style={{
                    height: 35,
                    width: 35,
                    borderRadius: 10, marginLeft: 10,
                    backgroundColor: "#E91E63",padding: 10, 
                  }}
                />
              )}
            </View>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 10,
            }}
            onPress={() => setLeaveAtDoor(!leaveAtDoor)}
          >
            <Text style={{ fontSize: 12 }}>
              Leave at the Door
            </Text>

            <View
              style={{
                width: 40,
                height: 28,
                borderRadius: 20,
                backgroundColor: leaveAtDoor ? "#E91E63" : "#ccc",
                justifyContent: "center",
                padding: 3,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#fff",
                  alignSelf: leaveAtDoor ? "flex-end" : "flex-start",
                }}
              />
            </View>
          </TouchableOpacity>

        </View>
        <PaymentItemsSectionFood items={cartItems}
          total={cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)}
          onTotalChange={(amount) => setTotalAmount(amount)}
          onTotalDiscount={(totaldiscount) => setTotaldiscount(totaldiscount)}
          onChangeVoucher={(voucher) => setVoucherlist(voucher)} // ✅ pass the voucher object
        />
        <View style={{
          flex: 1, marginTop: 7
          // padding: 10
        }}>
          <Text style={{ fontSize: 12 }}>Payment Method</Text>
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

        </View>
      </ScrollView>
      <View style={{
        position: 'absolute', bottom: 0,
        flexDirection: 'row', width: '100%', justifyContent: 'space-between',
        padding: 15, borderTopWidth: 2, borderTopColor: '#f2f2f2'
      }}>
        <Text style={styles.totalText}>
          Total {base.currency} {total}
        </Text>

        <TouchableOpacity
          style={styles.payBtn} onPress={handlePayment}
          disabled={loading}>
          {
            loading ? <ActivityIndicator /> : <Text style={styles.payText}>Place Order</Text>
          }

        </TouchableOpacity>
      </View>
      {/*  <PaymentFoodBottomBar total={totalAmount.toFixed(2)} email={email} mobile={mobile} selectedAddress={selectedaddress}
        voucherlist={voucherlist} /> */}
      {
        addressviewmodal ? <>
          <UserAddressModal
            visible={addressviewmodal}
            onClose={() => setAddressviewmodal(false)}
            onApply={(selectedAddress: any) => {
              console.log('...parents.....', selectedAddress.location)
              setAddress(selectedAddress.location);
              // i want when it will get new address selectedAddress.location it will affect into Shippingaddress
              setAddressviewmodal(false);
            }}
          />

        </> : null
      }

    </View>
  )
}

export default PaymentScreenFood


const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: "#fff", borderWidth: 0,
    borderColor: 'red', padding: 10
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: -4,
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

  optionText: { fontSize: 12 },
  totalText: {
    fontSize: 12,
  },
  payBtn: {
    backgroundColor: Colors.purple,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  payText: {
    color: "#fff",
    fontWeight: "600",
  },
});
