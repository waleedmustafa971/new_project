import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import React, { useState, useEffect } from 'react';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
//import ModalFooter from './ModalFooter';

const { width } = Dimensions.get("window");

const FooterJob = ({ navigation }: { navigation: any }) => {

  const [modalVisable, setModalVisable] = useState(false)

  // Example inbox count
  const inboxCount = 2; // Change this dynamically based on messages

  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("HomeScreen")}>
        <Feather name="home" size={18} color="black" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        //onPress={() => navigation.navigate("ShowReel")}
        onPress={() => navigation.navigate("ShowReel", {
          reel: []
        })}

      >
        <Ionicons name="videocam-outline" size={22} color="black" />
      </TouchableOpacity>

     {/*  <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("FindFriends")}>
        <View style={styles.iconContainer}>

          <Feather name="user-plus" size={18} color="black" />
          {inboxCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{inboxCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>  */}
 
      <TouchableOpacity style={styles.footerItem}
        //onPress={() => navigation.navigate("ListReels")}
        onPress={() => {
          setModalVisable(true)
        }}
      >
        <AntDesign name="pluscircleo" size={24} color="black" />
      </TouchableOpacity>

    {/*   <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("MessageList")}>
        <View style={styles.iconContainer}>
          <AntDesign name="inbox" size={18} color="black" />
          {inboxCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{inboxCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity> */}

      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("MarketPlace")}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="storefront-outline" size={18} color="black" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("MyProfile")}>
        <MaterialIcons name="menu" size={20} color="black" />
      </TouchableOpacity>
      {/* {
        modalVisable ?
          <ModalFooter visible={modalVisable} navigation={navigation}
            onClose={() => setModalVisable(false)}
          />
          : ''

      } */}
    </View>
  );
};

export default FooterJob;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 0,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    height: 50,
  },
  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
