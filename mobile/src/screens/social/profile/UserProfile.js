import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import ProfileTab from "./ProfileTab";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import api from "../../../component/api";
import { useUser } from "../../../screens/context/UserContext";

const UserProfile = () => {
  const navigation = useNavigation()
  const { user, setUserData, logout } = useUser();
  const route = useRoute()
  console.log('...params...', route.params);
  console.log('...user context...', user);
  const { userid, name, email, image } = route.params;

  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  // const [email, setEmail] = useState(route.params.email);
  // const [name, setName] = useState(route.params.name);
  // const [image, setImage] = useState(route.params.image); //userid
  // const [userid, setUserid] = useState(route.params.userid); //
  const [loading, setLoading] = useState(false);
  const [fullname, SetFullname] = useState(null);
  const [follower, setFollower] = useState(null);
  const [following, setFollowing] = useState(null);
  const [userdata, setUserdata] = useState(null);
  const [pagestatus, setPagestatus] = useState('Reels');

  useFocusEffect(
    React.useCallback(() => {
      ProfileData();
    }, [])
  );


  const ProfileData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("userdata");
      if (!jsonValue) return;
      const userData = JSON.parse(jsonValue);
      const response = await api.get(
        `/apis/auth/getProfile`,
        {
          params: { id: userData._id },
        }
      );
      // Axios automatically parses JSON
      const { user } = response.data;
      console.log('..data... ', response.data)
      setUserdata(user);
      SetFullname(user.name);
      //setEmail(user.email);
      setFollower(user.followersCount);
      setFollowing(user.followingCount);
      // setImage(user.image);

    } catch (error) {
      console.log("error profile", error?.response || error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: 'white', flex: 1 }}>
      <ScrollView>
        {/* Profile Container */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={{
                marginTop: 10,
                marginLeft: 20,
              }}
              onPress={() =>
                navigation.navigate('EditProfile', {
                  userdata: userdata,
                })
              }
            >
              <Image
                source={image ? { uri: base.BASE_URL + '/' +image } : require('../../../assets/user.png')}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 10,
                  marginTop: 7,
                }}
              />
            </TouchableOpacity>

            <View style={{ marginTop: 20, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
                <Text style={{ fontSize: 16 }}>{fullname || route.params.name}</Text>
                {userdata?.verifiedBadge ? (
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                ) : null}
              </View>
              <Text style={{ fontSize: 12, marginTop: 10 }}>
                {follower} followers {following} following
              </Text>
            </View>
          </View>
        </View>

        {/* Follow & Message Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: 'white' }}>Follow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#22C55E',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
              marginLeft: 8,
            }} onPress={() => {
              /*
                This referenced `item` and `me`, neither of which exists on this
                screen — there is no list here, so there is no item. Tapping
                Message threw "Property 'item' doesn't exist" and took the app
                down. The person being viewed comes from the route params, and
                the person viewing comes from the user context.
              */
              const partnerId = userid;
              const myId = user?._id;
              if (!partnerId || !myId) return;

              const convo = {
                _id: partnerId, // no conversation yet; the id stands in for one
                type: "private",
                partner: {
                  _id: partnerId,
                  name: fullname || name || "",
                  image: image || "",
                },
                lastMsg: null,
              };
              navigation.navigate("ChatDetails", { me: myId, partner: partnerId, userinfo: convo });
            }}
          >
            <Text style={{ fontSize: 14, color: 'white' }}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{
          flex: 1, flexDirection: 'row',
          justifyContent: 'center', padding: 8,
          flexWrap: 'wrap', width: '100%'
        }}>
          <ProfileTab userid={userid} />
        </View>

        {/* Page Content (Example) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 8 }}>
          {/* Example Conditional Rendering
          {pagestatus === 'Reels' && <ViewUserReels email={route.params.email} />}
          {pagestatus === 'Following' && <ViewUserFollowing userid={route.params.userid} />}
          */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  container: {
    flexDirection: "row", // Aligns children horizontally
    justifyContent: "space-between", // Space out the left, center, and right items
    alignItems: "center", // Centers items vertically
    paddingHorizontal: 15,
    height: 60, // Header height
    backgroundColor: "#f5f5f5", // Background color
    borderBottomWidth: 1, // Adds a line at the bottom of the header
    borderBottomColor: "#ddd",
  },
  backgroundImage: {
    flex: 1,
    height: 300,

    // This ensures the background image takes up the entire screen
    /*       justifyContent: 'center', 
          alignItems: 'center',  */
  },
  overlayContainer: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
    padding: 20,
    borderRadius: 10,
    marginTop: 40,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileContainer: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
    padding: 10,
    borderRadius: 10,

    marginTop: 25,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hoursachlangContainer: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
    padding: 20,
    borderRadius: 10,
    marginTop: 5,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#f2f2f2",
    height: 115,
  },
  FollowContainer: {
    padding: 20,
    borderRadius: 10,
    marginTop: 5,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#000",
    height: 80,
  },
  dashboardContainer: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
    padding: 20,
    borderRadius: 10,
    marginTop: 2,
    display: "flex",
  },
  myaccountContainer: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
    padding: 20,
    borderRadius: 10,
    marginTop: 2,
    display: "flex",
  },
  text: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
  },
  iconContainer: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1, // Ensures the text is centered
    textAlign: "center",
  },
});
