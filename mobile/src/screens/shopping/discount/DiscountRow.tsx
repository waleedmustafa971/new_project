import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

interface Props {
  price: number;        // original price
  discount: number;     // discounted price
  oldPrice: number;
  finalPrice: number;
  currency : string;

}

const DiscountRow: React.FC<Props> = ({ finalPrice, discount, currency, oldPrice }) => {
 // const percentage = Math.round(((price - discount) / price) * 100);
  return (
    <TouchableOpacity style={styles.container}>
      {/* LEFT PRICE SECTION */}
      <View style={styles.leftSection}>
        <Text style={styles.discountPrice}>{currency} {finalPrice}</Text>
        {
          discount > 0 ?  <Text style={styles.originalPrice}>{oldPrice}</Text> : null

        }
       
        {
          discount > 0 ?
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>-{discount}%</Text>
        </View> : null
        }


      </View>
    </TouchableOpacity>
  );
};

export default DiscountRow;

const styles = StyleSheet.create({
  container: {
    height: 30,
    backgroundColor: "#F4F6FF",
    borderRadius: 5,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#DCE3FF",
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  discountPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DE2E14",
  },

  originalPrice: {
    fontSize: 12,
    color: "#888",
    textDecorationLine: "line-through",
  },

  percentBadge: {
    backgroundColor: "#FF3D3D",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  percentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
