import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../component/api";
import * as base from "../../../component/global";

/* ================= TYPES ================= */

export interface Gift {
  _id: string;
  name: string;
  icon?: string;
  coinCost: number;
}

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
  onRecharge?: () => void;
  sending?: boolean;
}

/*
  The gifts people can actually send.

  This list used to be seventeen emoji hardcoded in this file, with prices that
  existed nowhere else. Sending one emitted a socket event and nothing was ever
  charged, so "100 coins" was decoration — the wallet never moved and the host
  was never credited. The catalogue lives on the server, which is also what the
  spend endpoint prices against, so what is shown here and what is charged
  cannot drift apart.

  Balance is read alongside it so a gift you cannot afford is visibly out of
  reach before you tap it, rather than after the server refuses.
*/

const GiftModal: React.FC<GiftModalProps> = ({
  visible,
  onClose,
  onSendGift,
  onRecharge,
  sending = false,
}) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem("userdata");
      const userId = raw ? JSON.parse(raw)?._id : null;

      const [cat, wallet] = await Promise.all([
        api.get("/apis/live/gifts"),
        userId
          ? api.get("/apis/monetisation/wallet", { params: { userId } })
          : Promise.resolve({ data: {} }),
      ]);

      setGifts(cat.data?.gifts || cat.data?.data || []);
      setCoins(
        typeof wallet.data?.coins === "number" ? wallet.data.coins : null
      );
    } catch {
      setGifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  /* The seeded catalogue points at icon files that were never uploaded, so a
     missing image has to be an expected state rather than a broken tile. */
  const iconUri = (icon?: string) => {
    if (!icon) return null;
    if (/^(https?:|file:|data:)/.test(icon)) return icon;
    return `${base.BASE_URL}/${String(icon).replace(/^[/]+/, "")}`;
  };

  const renderItem = ({ item }: { item: Gift }) => {
    const affordable = coins === null || coins >= item.coinCost;
    const uri = iconUri(item.icon);

    return (
      <TouchableOpacity
        style={[styles.giftItem, !affordable && styles.giftItemLocked]}
        onPress={() => affordable && !sending && onSendGift(item)}
        disabled={!affordable || sending}
        activeOpacity={0.8}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.giftIcon} resizeMode="contain" />
        ) : (
          <Ionicons name="gift" size={26} color="#E91E63" />
        )}
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.coins}>{item.coinCost} coins</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Send a gift</Text>
              <View style={styles.balancePill}>
                <Ionicons name="logo-bitcoin" size={13} color="#FFD700" />
                <Text style={styles.balanceText}>
                  {coins === null ? "—" : coins}
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color="#E91E63" />
            ) : gifts.length === 0 ? (
              <Text style={styles.empty}>No gifts are available right now.</Text>
            ) : (
              <FlatList
                data={gifts}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderItem}
                numColumns={4}
                contentContainerStyle={styles.grid}
              />
            )}
          </View>

          {onRecharge && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.rechargeButton}
                onPress={onRecharge}
              >
                <Text style={styles.rechargeButtonText}>Get coins</Text>
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
  /* A gift you cannot afford stays visible but reads as out of reach, so the
     reason a tap does nothing is on screen before the tap. */
  giftItemLocked: { opacity: 0.4 },
  giftIcon: { width: 28, height: 28 },
  name: {
    marginTop: 4,
    fontSize: 12.5,
  },
  coins: {
    fontSize: 11.5,
    color: "gray",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1F2937",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  balanceText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },
  empty: {
    textAlign: "center",
    color: "#8A8F98",
    fontSize: 13,
    paddingVertical: 30,
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
