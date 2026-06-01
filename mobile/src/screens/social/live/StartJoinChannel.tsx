import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable, 
  ActivityIndicator,
  Dimensions
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 🚨 Import Safe Area Hook

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onOk: () => void;
  loading: boolean;
}

// Adjust the base animation height based on typical content
const BASE_SHEET_HEIGHT = 220; 

const StartJoinChannel: React.FC<Props> = ({
  visible,
  title,
  message,
  onClose,
  onOk,
  loading, // Use the loading prop passed from the parent
}) => {
  const insets = useSafeAreaInsets(); // Get safe area dimensions
  const finalSheetHeight = BASE_SHEET_HEIGHT + insets.bottom; // Add bottom inset for safety

  // Initialize Animated.Value with the calculated final height
  const slideAnim = useRef(new Animated.Value(finalSheetHeight)).current;
  
  // Use the loading prop for button state
  const isActionLoading = loading;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0, // Slide up to position 0 (bottom of screen)
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: finalSheetHeight, // Slide down completely
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, finalSheetHeight]); // Depend on finalSheetHeight to re-calculate animation

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none">
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} disabled={isActionLoading} />

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] },
          { paddingBottom: insets.bottom + 20 } // Add bottom padding for content + safe area
        ]}
      >
        {/* TOP CONTENT ROW (Icon, Title, Close Button) */}
        <View style={styles.headerRow}>
            <View style={styles.iconWrapper}>
                <Icon name="videocam" size={28} color="#EF4444" />
            </View>
            <View style={styles.textWrapper}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isActionLoading}>
              <Icon name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
            style={styles.okBtn} 
            onPress={onOk} 
            disabled={isActionLoading}
        >
            {
                isActionLoading ? 
                <ActivityIndicator color="#fff" /> : 
                <Text style={styles.okText}>Start Streaming</Text>
            }         
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export default StartJoinChannel;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", // Slightly darker overlay
  },

  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    // Note: paddingBottom is set dynamically using insets in component
    alignItems: "center",
  },
  
  // --- Header/Content Layout ---
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  
  iconWrapper: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: '#FEE2E2', // Light red background for icon
    marginRight: 15,
  },
  
  textWrapper: {
    flex: 1,
    paddingRight: 10, // Space before the close button
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  message: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  
  closeBtn: {
    padding: 5,
    borderRadius: 15, // Make the tap area clear
  },

  // --- Action Button ---
  okBtn: {
    backgroundColor: "#EF4444", // Red color
    width: "90%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center", 
    justifyContent: 'center',
  },

  okText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});