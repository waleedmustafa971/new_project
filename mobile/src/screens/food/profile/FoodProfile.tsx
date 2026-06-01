import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from "react-redux";
import { getSingleUser } from "../../../store/slice/userSlice";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../component/global';
import { center } from '@shopify/react-native-skia';

const FoodProfile = () => {
  const navigation: any = useNavigation();
  const [userid, setUserid] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  const dispatch = useDispatch();
  const { singleUser } = useSelector((state: any) => state.users);

  // 🟦 Menu Press Handler
  const handleMenuPress = (item: string) => {
    if (item === "Payment Details") {
      navigation.navigate("PaymentDetails");
    }
    else if (item === "Delivery Address") {
      navigation.navigate("DeliveryAddress");
    }
    else if (item === "My Reviews") {
      navigation.navigate("MyReviews");
    }
    else if (item === "Max food for business") {
      navigation.navigate("OpenBussiness");
    }
     else if (item === "Help Center") {
      navigation.navigate("HelpCenter");
    }
  };
  useEffect(() => {
    loadUser();
  }, []);
  const logout = async () => {
    try {
      await AsyncStorage.removeItem("username");
      await AsyncStorage.removeItem("userdata");
      await AsyncStorage.removeItem("userinfo");
      await AsyncStorage.removeItem("token"); //studentid
      await AsyncStorage.removeItem("studentid"); //studentid
      //  Alert.alert('Logout Success!');
      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log("AsyncStorage error: ");
    }
  }
  const loadUser = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return console.log("No user data found");
    const user = JSON.parse(jsonValue);
    setUserid(user._id);
    setEmail(user.email);
    setName(user.name);
    dispatch(getSingleUser(user._id));

  };

  const handlelogout = async () => {

  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileRow}>
        <View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={20} />
          </TouchableOpacity>
        </View>
        <View>
        <Image
          source={{
            uri: singleUser?.user?.image
              ? BASE_URL + '/' + singleUser.user.image
              : undefined
          }}
          style={styles.profileImage}
        />
        </View>
        <View style={styles.profileInfo}>
          {singleUser?.user?.length > 0 ? (
            <Text style={styles.profileName}>{name}</Text>
          ) :
            <Text>{name}</Text>
          }
          <View style={styles.profileStatsRow}>
            <Text style={styles.statText}>{singleUser?.user?.followersCount} followers</Text>
            <Text style={styles.statText}>{singleUser?.user?.followingCount} following</Text>
          </View>
        </View>
       {/*  <TouchableOpacity>
          <Icon name="settings" size={22} />
        </TouchableOpacity> */}
      </View>

      {/* === MY ORDERS === */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => {
          navigation.navigate("MyOrderfood")
        }}>
          <Text style={styles.viewAll}>View all orders</Text>
        </TouchableOpacity>
      </View>

    {/*   
      <View style={styles.orderRow}>
        {orderItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.orderItem}>
            <Icon name={item.icon} size={22} />
            <Text style={styles.orderText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View> */}

      {/* === SETTINGS MENU === */}
      {settingsItems?.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuItem}
          onPress={() => handleMenuPress(item)}
        >
          <Text style={styles.menuText}>{item}</Text>
          <Icon name="chevron-right" size={20} />
        </TouchableOpacity>
      ))}
       <TouchableOpacity
          style={styles.logout}
          onPress={() => handlelogout()}
        >
          <Text style={styles.menuText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.version}
          onPress={() => handlelogout()}
        >
          <Text style={styles.versionText}>v0.0.1</Text>
        </TouchableOpacity>
    </ScrollView>
  );
};

const orderItems = [
  { label: 'To Pay', icon: 'credit-card' },
  { label: 'To Ship', icon: 'truck' },
  { label: 'To Receive', icon: 'inbox' },
  { label: 'To Review', icon: 'message-circle' },
  { label: 'Returns', icon: 'rotate-ccw' },
];

const settingsItems = [
  'Vouchers',
  'Delivery Address',
  'Payment Details',
  'My Reviews',
  'Help Center',
  'Max food for business'
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#eee',
  },
  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },

  statText: {
    fontSize: 12,
    color: '#666',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
  },

  viewAll: {
    color: '#007AFF',
    fontSize: 12,
  },

  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    backgroundColor: '#fff',
  },

  orderItem: {
    alignItems: 'center',
    gap: 4,
  },

  orderText: {
    fontSize: 12,
  },

  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.7,
    borderColor: '#eee',
  },

  menuText: {
    fontSize: 12,
  },
   logout: {
    flexDirection: 'row',
    borderWidth: 2, borderColor: '#f2f2f2', borderRadius: 7,
    width: '95%', height: 40, marginTop: 10,
    justifyContent: 'center', alignItems: 'center',
    alignContent : 'center', textAlign: 'center',
    alignSelf: 'center'
  },
  version: {
    flexDirection: 'row', justifyContent: 'center',
    padding: 10
  },
  versionText : {
    fontSize: 12
  }
});

export default FoodProfile;
