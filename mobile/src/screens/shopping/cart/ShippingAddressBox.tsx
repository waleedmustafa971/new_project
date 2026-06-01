import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../component/constants/color/color";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const ShippingAddress = ({ onToggleModal, address: addr, onAddressLoaded }: any) => {
  const [address, setAddress] = useState(addr);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (addr) {
      setAddress(addr);

      // ✅ keep parent updated
      if (onAddressLoaded) {
        onAddressLoaded(addr);
      }
    }
  }, [addr]);

  /* const loadUser = async () => {
    const value = await AsyncStorage.getItem("USER_LOCATION");
    if (value) {
      const locationData = JSON.parse(value);
      setAddress(locationData?.address);
    }
  }; */

  const loadUser = async () => {
    const value = await AsyncStorage.getItem("USER_LOCATION");
    if (value) {
      const locationData = JSON.parse(value);
      const addr = locationData?.address;

      setAddress(addr);

      // ✅ send to parent
      if (onAddressLoaded) {
        onAddressLoaded(addr);
      }
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* LEFT SIDE */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Delivery Location</Text>
          <Text numberOfLines={2} style={styles.address}>
            {address || "Select your address"}
          </Text>
        </View>

        {/* RIGHT ICON */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onToggleModal(true)}
        >
          <Feather name="map-pin" size={20} color="#E91E63" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ShippingAddress;

const styles = StyleSheet.create({
  card: {
    //  backgroundColor: "#FFF",
    //  padding: isTablet ? 20 : 14,
    //  marginHorizontal: isTablet ? 30 : 5,
    //   marginVertical: 3,
    //  borderRadius: 10,
    //  elevation: 1,
    //  shadowColor: "#000",
    //  shadowOpacity: 0.08,
    //shadowRadius: 6, 
    marginTop: 9
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  label: {
    fontSize: isTablet ? 16 : 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },

  address: {
    fontSize: isTablet ? 15 : 12,
    color: "#666",
    lineHeight: 18,
  },

  iconBtn: {
    marginLeft: 10,
    backgroundColor: "#FCE4EC",
    padding: 10,
    borderRadius: 30,
  },
});