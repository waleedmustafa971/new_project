import React from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Colors from "../../../component/constants/color/color";
//import { vouchers } from "./cartData";
import Icon from "react-native-vector-icons/FontAwesome5";
type Promo = {
  promo_code: string;
  message?: string;
  discount: number;
  discount_type: "percentage" | "amount";
  min_order_amount?: number;
  max_discount_amount?: number;
};

interface VoucherModalProps {
  visible: boolean;
  promo: Promo;
  onClose: () => void;
  onApply: (promo: Promo) => void;
}

const VoucherModalFood: React.FC<VoucherModalProps> = ({ visible, promo, onClose, onApply }) => {
  if (!promo) return null;
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Active Vouchers</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={promo}
            keyExtractor={(item) => item._id.toString()}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View style={styles.row1}>
                    <Text style={styles.voucherLabel}>
                      Min Order  {item.minimum_order_amount ?? "-"} 
                      ´ Discount ´ {item.discount}
                  {item.discount_type === "percentage" ? "%" : " AED"}
                  {item.discount_type === "percentage" && item.max_discount_amount ? ` (max ${item.max_discount_amount})` : null}
                    </Text>
                    <View style={styles.row}>
                      <Text style={styles.valid}>
                        Valid Until   {item.start_date?.slice(0, 10)} → {item.end_date?.slice(0, 10)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.row1}>
                    <View>
                      <View style={styles.row2}>
                        <Icon
                          name={item.icon}
                          size={18}
                          color={Colors.purple}
                        />
                        <Text style={styles.title}>Promo Code : {item.promo_code}</Text>
                      </View>
                      <Text style={styles.desc}>{item.message}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.applyBtn}
                      onPress={() => onApply(item)}
                    >
                      <Text style={styles.applyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export default VoucherModalFood;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingVertical: 5,
  },
  row: {
    backgroundColor: Colors.lightPink,
    borderRadius: 5,
  },
  row1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: { fontSize: 12 },
  close: { fontSize: 18, color: "#333" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: Colors.purple,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  voucherLabel: { color: Colors.purple, fontSize: 12, fontWeight: "600" },
  title: { fontSize: 12, marginVertical: 3 },
  desc: { fontSize: 13, color: "#666" },
  valid: { fontSize: 12, color: Colors.accentPink, marginTop: 2 },
  applyBtn: {
    backgroundColor: Colors.purple,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 25,
  },
  applyText: { color: "#fff", fontWeight: "700" },
});
