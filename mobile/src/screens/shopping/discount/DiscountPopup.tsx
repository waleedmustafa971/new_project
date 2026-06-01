import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");

interface DiscountItem {
  title: string;
  offer: string;
  image: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: DiscountItem[];
}

const DiscountPopup: React.FC<Props> = ({ visible, onClose, data }) => {
  const popupWidth = width > 720 ? 400 : width * 0.9;
  const popupHeight = width > 720 ? 450 : 550;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.popupContainer, { width: popupWidth, height: popupHeight }]}>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.header}>Exclusive Deals</Text>

          <FlatList
            data={data}
            numColumns={2}
            keyExtractor={(_, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.image} />

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.offer}>{item.offer}</Text>

                <TouchableOpacity style={styles.ctaRow}>
                  <Text style={styles.ctaText}>Add to cart</Text>
                  <Icon name="chevron-right" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export default DiscountPopup;

// ===================== Styles ========================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },

  popupContainer: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 16,
    elevation: 10,
  },

  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 6,
    borderRadius: 50,
    zIndex: 10,
  },

  header: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    alignSelf: "center",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#f8f8f8",
    width: "48%",
    marginBottom: 15,
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  image: {
    width: "100%",
    height: 90,
    borderRadius: 12,
    resizeMode: "cover",
    marginBottom: 8,
  },

  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
  },

  offer: {
    fontSize: 12,
    color: "#FF3D3D",
    fontWeight: "600",
    marginTop: 2,
  },

  ctaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ctaText: {
    fontSize: 12,
    color: "#000",
  },
});
