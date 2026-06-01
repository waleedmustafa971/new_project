import React from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

/* ================= TYPES ================= */

export interface Gift {
  name: string;
  emoji: string;
  coins: number;
}

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
  onRecharge?: () => void;
}

/* ================= DATA ================= */

const gifts: Gift[] = [
  { name: "Rose", emoji: "🌹", coins: 1 },
  { name: "Ice Cream Cone", emoji: "🍦", coins: 1 },
  { name: "Football", emoji: "🏈", coins: 1 },
  { name: "Mini Speaker", emoji: "🔊", coins: 1 },
  { name: "Tennis", emoji: "🎾", coins: 1 },
  { name: "Coffee", emoji: "☕", coins: 1 },
  { name: "Lightning Bolt", emoji: "⚡", coins: 1 },
  { name: "Finger Heart", emoji: "🤞", coins: 5 },
  { name: "Panda", emoji: "🐼", coins: 5 },
  { name: "Mic", emoji: "🎤", coins: 5 },
  { name: "Chic", emoji: "👠", coins: 5 },
  { name: "Lollipop", emoji: "🍭", coins: 10 },
  { name: "Cake", emoji: "🎂", coins: 20 },
  { name: "Hand Hearts", emoji: "🫶", coins: 100 },
  { name: "Flowers", emoji: "💐", coins: 100 },
  { name: "Confetti", emoji: "🎉", coins: 100 },
  { name: "Sunglasses", emoji: "😎", coins: 199 },
  { name: "Crown", emoji: "👑", coins: 199 },
  { name: "Disco Ball", emoji: "🪩", coins: 1000 },
  { name: "Shooting Stars", emoji: "🌠", coins: 1580 },
  { name: "TikTok Universe", emoji: "🌌", coins: 34999 },
];

/* ================= COMPONENT ================= */

const GiftModal: React.FC<GiftModalProps> = ({
  visible,
  onClose,
  onSendGift,
  onRecharge,
}) => {
  const renderItem = ({ item }: { item: Gift }) => (
    <TouchableOpacity
      style={styles.giftItem}
      onPress={() => onSendGift(item)}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.coins}>{item.coins} coins</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* Overlay */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalOverlay}
        onPress={onClose}
      >
        {/* Modal Box */}
        <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Select a Gift 🎁</Text>

            <FlatList
              data={gifts}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderItem}
              numColumns={4}
              contentContainerStyle={styles.grid}
            />
          </View>

          {/* Footer */}
          {onRecharge && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.rechargeButton}
                onPress={onRecharge}
              >
                <Text style={styles.rechargeButtonText}>Recharge</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default GiftModal;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: 300,
    overflow: "hidden",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  grid: {
    justifyContent: "center",
  },
  giftItem: {
    flex: 1,
    alignItems: "center",
    margin: 8,
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#ddd",
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    marginTop: 4,
    fontSize: 13,
  },
  coins: {
    fontSize: 12,
    color: "gray",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 10,
  },
  rechargeButton: {
    backgroundColor: "#ff2d55",
    padding: 10,
    borderRadius: 8,
  },
  rechargeButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
