import React from "react";
import { View, StyleSheet } from "react-native";
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";

const ShimmerCard = () => {
  return (
    <View style={styles.card}>
      {/* IMAGE SHIMMER */}
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.image}
      />
      {/* CONTENT AREA */}
      <View style={styles.content}>
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.title}
        />

        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.subtitle}
        />

        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.price}
        />

        {/* BUTTON / BADGE SHIMMER */}
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.button}
        />
      </View>
    </View>
  );
};

export default ShimmerCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E9ECF4",

    // Soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },

  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  title: {
    width: "70%",
    height: 16,
    borderRadius: 6,
    marginBottom: 10,
  },

  subtitle: {
    width: "50%",
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },

  price: {
    width: "40%",
    height: 14,
    borderRadius: 6,
    marginBottom: 14,
  },

  button: {
    width: 80,
    height: 26,
    borderRadius: 20,
  },
});
