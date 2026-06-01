import React, {useState} from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../component/constants/color/color";

const PaymentMethodSection = () => {
  const [selectedMethod, setSelectedMethod] = useState("Visa/Master Card");
  const paymentMethods = ["Visa/Master Card", "Paypal", "bkash"];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Payment Method</Text>
      </View>

      <View style={styles.row1}>
        {paymentMethods?.map((method) => {
          const isSelected = selectedMethod === method;
          return (
            <TouchableOpacity
              key={method}
              style={[
                styles.cardBox,
                isSelected && styles.cardBoxSelected
              ]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text
                style={[
                  styles.cardText,
                  isSelected && styles.cardTextSelected
                ]}
              >
                {method}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default PaymentMethodSection;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, marginTop: 5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row1: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  title: { fontSize: 14 },

  cardBox: {
    backgroundColor: Colors.lightPurple,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },

  // Highlight when selected
  cardBoxSelected: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },

  cardText: {
    color: "#333",
  },

  cardTextSelected: {
    color: "white",
    fontWeight: "600",
  },
});
