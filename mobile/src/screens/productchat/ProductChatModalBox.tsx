import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import ProductChatBox from "./ProductChatBox";
//import ChatScreen from "./ChatScreen";

type Props = {
  visible: boolean;
  onClose: () => void;
  productId: string;
  userId: string;
  otherUserId: string;
  productuser: object;
};

export default function ProductChatModalBox({
  visible,
  onClose,
  productId,
  userId,
  otherUserId, productuser
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{productuser?.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Body */}
           <ProductChatBox
            productId={productId}
            userId={userId}
            otherUserId={otherUserId}
          /> 
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "50%", // 🔥 50% screen height
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  header: {
    height: 50,
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  close: {
    fontSize: 20,
  },
});
