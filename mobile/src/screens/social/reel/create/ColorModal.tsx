import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

const { height } = Dimensions.get("window");

const COLORS = [
    "#FF6F91", "#FFC75F", "#F9F871",
  "#F28B82",
  "#FBBC04",
  "#FFF475",
  "#CCFF90",
  "#A7FFEB",
  "#CBF0F8",
  "#AECBFA",
  "#D7AEFB",
  "#FDCFE8",
  "#E6C9A8",
  "#E8EAED","#74EBD5", "#ACB6E5", "#9FACE6"
];

const ColorModal = ({ visible, onClose, onSelect } : any) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Background color</Text>
          </View>

          {/* Color Grid */}
          <View style={styles.grid}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorBox, { backgroundColor: color }]}
                onPress={() => {
                  onSelect(color);
                  onClose();
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ColorModal;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  container: {
    height: height * 0.3,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  colorBox: {
    width: "22%",
    height: 50,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
});
