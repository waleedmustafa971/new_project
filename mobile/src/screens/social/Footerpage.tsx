import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import React, { useState } from 'react';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import ModalFooter from './ModalFooter';

const { width } = Dimensions.get("window");

const Footerpage = ({ navigation }: any) => {

  const [modalVisable, setModalVisable] = useState(false);

  return (
    <View style={{ flex: 1 }}>

      {/* 🔥 DROPDOWN LAYER (OUTSIDE FOOTER) */}
      {modalVisable && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={() => setModalVisable(false)} // 🔥 close on outside click
        >
          <ModalFooter
            navigation={navigation}
            onClose={() => setModalVisable(false)}
          />
        </TouchableOpacity>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Feather name="home" size={18} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate("ShowReel", { reel: [] })}
        >
          <Ionicons name="videocam-outline" size={22} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => setModalVisable(prev => !prev)} 
        >
          <AntDesign name="pluscircleo" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate("MarketPlace")}
        >
          <Ionicons name="storefront-outline" size={18} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate("MyProfile")}
        >
          <MaterialIcons name="menu" size={20} color="black" />
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default Footerpage;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    height: 50,
  },

  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end", // 🔥 makes dropdown appear above footer
    alignItems: "center",
    zIndex: 999,
  },
});