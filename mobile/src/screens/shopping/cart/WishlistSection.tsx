import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../component/constants/color/color";

const WishlistSection = ({ items, onAddToCart, onDelete }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>From Your Wishlist</Text>

      {items.map((item: any) => (
        <View key={item.id} style={styles.item}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={styles.detailsRow}>
                <Text style={styles.qtyText}>{item.color}</Text>
                <Text style={styles.qtyText}>{item.size}</Text>
              </View>
              <TouchableOpacity onPress={() => onAddToCart(item)}>
                <Feather name="shopping-cart" size={20} color={Colors.purple} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={20} color="#FF5C5C" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

export default WishlistSection;

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  image: {
    width: 120,
    height: 120,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 10,
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "400",
  },
  price: {
    marginVertical: 10,
    fontWeight: "800",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 5,
  },
  meta: {
    fontSize: 12,
    color: "#555",
  },
  qtyBtn: {
    borderWidth: 2,
    borderColor: Colors.purple,
    borderRadius: 18,
    padding: 1,
  },
  qtyText: {
    fontWeight: "600",
    backgroundColor: Colors.lightPurple,
    padding: 5,
    paddingHorizontal: 13,
    borderRadius: 6,
  },
  deleteBtn: {
    position: "absolute",
    top: 90,
    left: 20,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
});
