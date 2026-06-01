import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Colors from "../../../component/constants/color/color";
import { shippingOptions } from "./cartData";
import VoucherModal from "./VoucherModal";
import * as base from '../../../component/global'
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";
import api from "../../../component/api";
import AsyncStorage from '@react-native-async-storage/async-storage';


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


const emptyPromo: Promo = {
  promo_code: "",
  message: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  no_of_users: 0,
  minimum_order_amount: 0,
  discount: 0,
  discount_type: "amount",
  max_discount_amount: undefined,
  repeat_usage: false,
  no_of_repeat_usage: 0,
  image: "",
  status: true,
  is_cashback: false,
  list_promocode: false,
};


type RootStackParamList = {
  CategoryShowmore: { data: any[] };
  SingleProduct: { productData: object };
};

interface PaymentItemsSectionProps {
  items: object;  // Array of cart items
  total: number;
   onTotalChange?: (finalTotal: number) => void; // new callback
   onTotalDiscount?: (discountAmount: number) => void; // new callback
   onChangeVoucher?: (voucher: any) => void; // ✅ function callback
}

const PaymentItemsSectionFood: React.FC<PaymentItemsSectionProps> = ({ 
  items, total,
  onTotalChange,
  onTotalDiscount, onChangeVoucher
 }) => {
  //console.log('payment items' + JSON.stringify(items))
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedShipping, setSelectedShipping] = useState(shippingOptions[0]);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  // ✅ Subtotal
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  // ✅ Quantity
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // ✅ Apply discount if voucher used
  const discountAmount = selectedVoucher
    ? (total * selectedVoucher.discount) / 100
    : 0;
  console.log('...discount.amount..' + selectedVoucher + '....subtotal....' + subtotal)

  // ✅ Final total = subtotal - discount + shipping
  const finalTotal = total - discountAmount + selectedShipping.cost;


   useEffect(() => {
    if (onTotalChange) {
      onTotalChange(finalTotal);
    //  onTotalDiscount(discountAmount);
    }
     // 👉 Save to AsyncStorage when values change
      saveTotalsToStorage(discountAmount, finalTotal);
  }, [finalTotal, onTotalChange, onTotalDiscount]);

  // Save discount & total to storage
const saveTotalsToStorage = async (discount: number, total: number) => {
  try {
    await AsyncStorage.setItem(
      "checkout_totals",
      JSON.stringify({
        discountAmount: discount,
        finalTotal: total,
      })
    );
  } catch (error) {
    console.log("Error saving totals", error);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.totalContainer}>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={[styles.totalLabel, { fontSize: 12 }]}>Total</Text>
          <Text
            style={[styles.totalValue, { fontSize: 12, color: Colors.purple }]}
          >
             {base.currency} {finalTotal.toFixed(2)}
          </Text>
        </View>
      </View>    
    </View>
  );
};

export default PaymentItemsSectionFood;

const styles = StyleSheet.create({
  container: { marginTop: 0, borderWidth: 0,
    borderColor: 'black'
   },
  quantity: {
    backgroundColor: Colors.lightPurple,
    paddingHorizontal: 5,
    borderRadius: 50,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    top: -4,
    left: 37,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title1: { fontWeight: "700", fontSize: 14, marginBottom: 10 },
  title: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontWeight: "700", fontSize: 14 },
  count: {
    backgroundColor: Colors.lightPurple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  countText: { color: Colors.purple, fontWeight: "600" },
  voucherBtn: {
    borderWidth: 1,
    borderColor: Colors.purple,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  voucherText: { color: Colors.purple, fontWeight: "500" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    gap: 10,
    position: "relative",
  },
  image: {
    width: 55,
    height: 55,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: "#fff",
    borderColor: "#eeecec",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  quantityBadge: {
    position: "absolute",
    left: 40,
    top: -4,
    backgroundColor: Colors.lightPurple,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 50,
    paddingHorizontal: 6,
  },
  quantityText: { fontSize: 12, fontWeight: "700", color: Colors.purple },
  itemTitle: { fontWeight: "600", margin: 5, fontSize: 14, color: "#666" },
  price: { fontWeight: "700", fontSize: 14 },

  shippingContainer: { marginTop: 10 },
  shippingLabel: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  shippingBtn: {
    borderWidth: 1,
    borderColor: Colors.purple,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectedShipping: {
    backgroundColor: Colors.purple,
  },
  shippingText: { fontWeight: "600", color: Colors.purple },
  durationText: { fontSize: 12, color: "#666" },
  selectedText: { color: "#fff" },

  totalContainer: { marginTop: 0 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  totalLabel: { fontSize: 13, color: "#444" },
  totalValue: { fontSize: 13 },
  totalRow: {
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 8,
    marginTop: 10,
  },
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
  optionTitle: { fontWeight: "500" },
  optionSub: { color: "#666", fontSize: 12 },
  optionRight: { fontWeight: "500" },
});
