import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Colors from "../../../component/constants/color/color";
import * as base from "../../../component/global";

/* ---------------- Navigation Types ---------------- */
type RootStackParamList = {
  PaymentItemsSection: {
    total: string | number;
    email: string;
    mobile: string;
    selectedAddress: string;
    voucherlist: object;
  };
};

/* ---------------- Props ---------------- */
type PaymentBottomBarProps = {
  total: string | number;
  email: string;
  mobile: string;
  selectedAddress: string;
  voucherlist: object;
};

/* ---------------- Component ---------------- */
const PaymentBottomBar = ({ total, email, mobile, selectedAddress, voucherlist }: PaymentBottomBarProps) => {
  console.log(total, email, mobile, selectedAddress, JSON.stringify(voucherlist))
  
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, "PaymentItemsSection">
    >();

  return (
    <View style={styles.container}>
      <Text style={styles.totalText}>
        Total {base.currency} {total} {email} {mobile}
      </Text>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() =>
          navigation.navigate("PaymentItemsSection", {
            total,
            email,
            mobile,
            selectedAddress, voucherlist
          })
        }
      >
        <Text style={styles.payText}>Pay</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PaymentBottomBar;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  totalText: {
    fontWeight: "700",
    fontSize: 16,
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
