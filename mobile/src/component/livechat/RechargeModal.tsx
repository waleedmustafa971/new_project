import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import api from "../api";

interface Gift {
  _id: string;
  groupname: string;
  name: string;
  icon: string;
  coinCost: string;
  xtime: string;
}

interface GiftModalProps {
  show: boolean;
  onHide: () => void;
  onSendGift: (giftId: string) => void;
}

const RechargeModal: React.FC<GiftModalProps> = ({
  show,
  onHide,
  onSendGift,
}) => {
  const [giftsData, setGiftsData] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      getGiftData();
    }
  }, [show]);

  const getGiftData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/apis/live/get-gifts");
      setGiftsData(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendGift = (giftId: string) => {
    onSendGift(giftId);
    onHide(); // optional: close modal after sending
  };

  const renderGift = ({ item }: { item: Gift }) => (
    <TouchableOpacity
      style={styles.giftItem}
      onPress={() => sendGift(item._id)}
      activeOpacity={0.8}
    >
      <Text style={styles.giftName}>{item.name}</Text>
      <Text style={styles.coinText}>🪙 {item.coinCost}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={show}
      transparent
      animationType="slide"
      onRequestClose={onHide}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send a Gift</Text>
            <TouchableOpacity onPress={onHide}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <ActivityIndicator color="#FACC15" size="large" />
          ) : (
            <FlatList
              data={giftsData}
              keyExtractor={(item) => item._id}
              numColumns={3}
              contentContainerStyle={styles.giftGrid}
              renderItem={renderGift}
            />
          )}

          {/* Footer */}
          <TouchableOpacity style={styles.rechargeBtn}>
            <Text style={styles.rechargeText}>Recharge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default RechargeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "70%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  closeText: {
    color: "#ffffff",
    fontSize: 18,
  },

  giftGrid: {
    paddingVertical: 10,
  },

  giftItem: {
    flex: 1,
    backgroundColor: "#1F2933",
    margin: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  giftName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },

  coinText: {
    color: "#FACC15",
    fontSize: 12,
  },

  rechargeBtn: {
    marginTop: 12,
    backgroundColor: "#FACC15",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
  },

  rechargeText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },
});
