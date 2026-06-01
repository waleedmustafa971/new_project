import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const SubCategories = ({ item, isSelected, onPress } : any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.item,
        isSelected && styles.selectedItem,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSelected && styles.selectedText,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

export default SubCategories;

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10, marginLeft: 5,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
  },
  selectedItem: {
    backgroundColor: "#000",
  },
  text: {
    fontSize: 14,
    color: "#333",
  },
  selectedText: {
    color: "#fff",
    fontWeight: "600",
  },
});
