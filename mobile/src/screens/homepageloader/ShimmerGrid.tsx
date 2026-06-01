import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";

const ShimmerProductCard = () => (
  <View style={styles.card}>
    <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.image} />

    <View style={styles.info}>
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.title} />
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.price} />
      <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.small} />
    </View>
  </View>
);

const ShimmerHorizontal4 = () => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: 10 }}
    >
      {[1, 2, 3, 4].map((_, index) => (
        <View key={index} style={{ marginRight: 14 }}>
          <ShimmerProductCard />
        </View>
      ))}
    </ScrollView>
  );
};

export default ShimmerHorizontal4;

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9ECF4",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 130,
    borderRadius: 12,
    marginBottom: 12,
  },

  info: {
    width: "100%",
  },

  title: {
    width: "85%",
    height: 14,
    borderRadius: 5,
    marginBottom: 8,
  },

  price: {
    width: "50%",
    height: 14,
    borderRadius: 5,
    marginBottom: 8,
  },

  small: {
    width: "40%",
    height: 12,
    borderRadius: 5,
  },
});
