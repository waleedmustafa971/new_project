import {
  View, TouchableOpacity, StyleSheet,
  Dimensions, Text, Image
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  ChatScreen: { userid: string, userinfo: object };
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  Setting: undefined;
  CreateGroup: {userid: string , userinfo: object};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const { width } = Dimensions.get("window");
type FooterProps = {
  userid: string | undefined;
  userinfo: any;
};
const Footer = () => {
  
  const navigation = useNavigation<NavigationProp>();
  const [modalVisable, setModalVisable] = useState(null)
  const HomeIcon = require("../../assets/footer/Home.png"); // Adjust path as needed
  const ChatIcon = require("../../assets/footer/Chat.png"); // Adjust path as needed
  const ContactIcon = require("../../assets/footer/Contact.png"); // Adjust path as needed
  const GroupIcon = require("../../assets/footer/Group.png"); // Adjust path as needed
  const SettingIcon = require("../../assets/footer/Settings.png"); // Adjust path as needed
  const [userid, setUserid] = useState(null)
  const [userinfo,setUserinfo] = useState([])


  // Example inbox count
  const inboxCount = 2; // Change this dynamically based on messages

 useEffect(()=> {
       checkUser()
   },[])
 
   const checkUser = async() => {
      const jsonValue = await AsyncStorage.getItem("userdata");
         if (jsonValue != null) {
           const userData = JSON.parse(jsonValue);
           console.log("user id.... Footer whatsapps." + userData._id);
           setUserid(userData._id);
           setUserinfo(userData);
         } else {
           console.log("No user data found");
         } 
   }


  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("HomeScreen")}>
        <Image source={HomeIcon} style={{ width: 25, height: 25 }} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        onPress={() => {
            navigation.navigate("ChatScreen", { userid: userid, userinfo: userinfo });
        }}>
        <Image source={ChatIcon} style={{ width: 20, height: 20 }} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("HomeWhatsapp")}>
        <View style={styles.iconContainer}>

          <Image source={ContactIcon} style={{ width: 20, height: 20 }} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        onPress={() => navigation.navigate("CreateGroup", { userid: userid, userinfo: userinfo })}>
        <View style={styles.iconContainer}>

          <Image source={GroupIcon} style={{ width: 20, height: 20 }} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerItem}
        onPress={() =>  navigation.navigate("Setting", { userid: userid, userinfo: userinfo })}>
        <Image source={SettingIcon} style={{ width: 20, height: 20 }} />
      </TouchableOpacity>

    </View>
  );
};

export default Footer;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    position: "absolute",
    height: 60,
    bottom: 0,
    left: 0,
    right: 0,
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
