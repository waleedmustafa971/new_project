import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import * as base from "../../component/global";

type Props = {
  product: any;
};

const ChatHeader = ({ product }: Props) => {
  if (!product) return null;

  return (
    <View style={styles.header}>
      <Image
        source={{ uri: base.BASE_URL + product.images?.[0]?.image }}
        style={styles.image}
      />

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {product.shortTitle}
        </Text>
        <Text style={styles.price}>
          {product.currency} {product.price?.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

export default ChatHeader;
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  image: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 2,
  },
});
