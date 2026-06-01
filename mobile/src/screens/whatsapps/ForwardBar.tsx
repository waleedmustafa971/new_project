import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';

const ForwardBar = ({ forwardMessage, onShare, onForward, onClose } : any) => {
  return (
    <View style={styles.container}>

      {/* Forward Icon */}
      <TouchableOpacity style={styles.iconButton} onPress={onForward}>
        <Text style={styles.icon}>
            <Icon name="arrow-redo-outline" size={22} color="#333" />
        </Text>
      </TouchableOpacity>

      {/* Message Preview */}
      <View style={styles.preview}>
        <Text numberOfLines={1} style={styles.previewText}>
          {forwardMessage?.text || "Media message"}
        </Text>
      </View>

      {/* Share Icon */}
      <TouchableOpacity style={styles.iconButton} 
      onPress={() => onShare(forwardMessage)}
      >
        <Text style={styles.icon}>
            <Icon name="share-social" size={18} color="#333" />
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={onClose}>
        <Text style={styles.icon}>
            <Icon name="close" size={22} color="#333" />
        </Text>
      </TouchableOpacity>

    </View>
  );
};

export default ForwardBar;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 42,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  preview: {
    flex: 1,
    marginHorizontal: 10,
  },

  previewText: {
    fontSize: 14,
    color: "#444",
  },

  iconButton: {
    padding: 8,
  },

  icon: {
    fontSize: 22,
  },
});