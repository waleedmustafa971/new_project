import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const isTablet = width > 768;

const JobTitleSection = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Find Your Dream Job Easily on Max</Text>
      <Text style={styles.subtitle}>
        Explore top opportunities that fit your skills and ambition.
      </Text>
    </View>
  );
};

export default JobTitleSection;

const styles = StyleSheet.create({
  container: {
    paddingVertical: isTablet ? 50 : 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: isTablet ? 22 : 16,
    fontWeight: "600",
    color: "#000", // dark neutral text
    textAlign: "center",
    marginBottom: 2,
  },
  brand: {
    fontSize: isTablet ? 38 : 30,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: isTablet ? 18 : 12,
    color: "#000",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
});
