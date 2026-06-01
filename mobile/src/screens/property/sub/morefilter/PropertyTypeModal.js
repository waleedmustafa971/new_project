// FilterModal.js
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity, StyleSheet
} from "react-native";

export default function PropertyTypeModal({ visible, onClose, data }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        
        <View style={styles.modalBox}>

          <Text style={styles.title}>Filter Options</Text>

          {data?.map((item) => (
            <Text key={item} style={styles.option}>
              {item}
            </Text>
          ))}

        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalBox: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
    color: "#222",
    textAlign: "center",
  },

  option: {
    fontSize: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    color: "#333",
  },
});

