import React from 'react'
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import {
  View, ScrollView, StatusBar,
  Image, Text, TouchableOpacity, Animated,
  Dimensions, StyleSheet
} from 'react-native';


export default function Loaderscreen() {
  return (
          <View
            style={[
              styles.card,
              { backgroundColor: "#f0f0f0" },
            ]}
          >
            <ShimmerPlaceholder
              LinearGradient={LinearGradient}
              style={styles.listImage}
            />
            <View style={styles.productDetails}>
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "70%", height: 14, borderRadius: 5, marginBottom: 6 }} />
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "40%", height: 12, borderRadius: 5, marginBottom: 4 }} />
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "60%", height: 12, borderRadius: 5 }} />
            </View>
          </View>
    
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", marginBottom: 50 },
  vListContent: { paddingVertical: 12 },
  categoryBlock: { paddingHorizontal: 12 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoryTitle: { fontSize: 15, fontWeight: "700", maxWidth: "80%" },

  hListContent: { paddingHorizontal: 4 },

  card: {
    //   width: 180,
    width: Dimensions.get("window").width * 0.30,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    padding: 8,
  },
  cardImage: { width: "100%", height: 110, borderRadius: 10, backgroundColor: "#eaeaea" },
  imgPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 8, fontSize: 13, fontWeight: "700" },
  cardMeta: { marginTop: 2, fontSize: 12, opacity: 0.7 },
  cardPrice: { marginTop: 6, fontSize: 13, fontWeight: "700", marginRight: 5 },
  gridImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  productDetails: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  }
});

