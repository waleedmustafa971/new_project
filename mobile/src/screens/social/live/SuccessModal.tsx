import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onOk: () => void;
}

const SuccessModal: React.FC<Props> = ({
  visible,
  title,
  message,
  onClose,
  onOk,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ❌ Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* ✅ Icon */}
          <View style={styles.iconWrapper}>
            <Icon name="checkmark-circle" size={60} color="#22C55E" />
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* OK Button */}
          <TouchableOpacity style={styles.okBtn} onPress={onOk}>
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SuccessModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },

  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 6,
  },

  iconWrapper: {
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },

  okBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
  },

  okText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
