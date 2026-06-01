import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator
 } from 'react-native';
//import Icon from 'react-native-vector-icons/Ionicons';
import PaymentMethodSelector from './PaymentMethodSelector';
import api from '../../../component/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from '../../../component/global'
import Icon from "react-native-vector-icons/Entypo";
import { useNavigation } from '@react-navigation/native';

interface User {
  _id: string;
  name: string;
  image: string;
  coins: number;
  referralCode: string;
}

interface Gift {
  coins: number;
  priceAED: number;
  _id: string;
  xtime: string;
  referralCode: string;
}

interface GiftModalProps {
  show: boolean;
  onHide: () => void;
  onSendGift: (giftId: string) => void;
}
interface Price {
  _id: string;
  priceAED: number;
}
const GetCoins = () => {

  const [selectedPackage, setSelectedPackage] = useState<Gift | null>(null);
  const [giftsData, setGiftsData] = useState<Gift[]>([]);
  const [usersData, setUsersData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation()

  useEffect(() => {
    getGiftData();
  }, []);


  const getGiftData = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return;
    const userData = JSON.parse(jsonValue);
    try {
      setLoading(true);
      const res = await api.get("/apis/live/list-Depost?userid=" + userData._id);
      setGiftsData(res.data?.data || []);
      setUsersData(res.data?.userdata || null);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#E91E63" />
    </View>
  );
}

  return (
    <ScrollView style={styles.container}>
      {/* First Row */}
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ display: 'flex',
          flexDirection: 'row'
         }}>
        <Icon name="chevron-left" size={22} color="#000" />
        <Text style={styles.headerText}>Get Coins</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Coins {usersData?.coins} </Text>
      </View>

      {/* Second Row */}
      <View style={styles.userCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.userName}>{usersData?.name}
            </Text>
            <Text style={styles.userBalance}>Balance: {usersData?.coins}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.inviteText}>Invite & Get Rewards</Text>
          <Text style={styles.codeText}>Code: {usersData?.referralCode}</Text>
        </View>
      </View>

      {/* Third Row - Coin Packages */}
      <View style={styles.packagesContainer}>
        {giftsData?.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={[
              styles.packageItem,
              selectedPackage?._id === item._id && styles.selectedPackage,
            ]}
             onPress={() => {
              setSelectedPackage(item)
              console.log('....payment....', item)
            }}
          >
            <View style={{ width: '50%' }}>
                <Icon name="wallet" color="#000" size={24} />
            </View>
            <View>
            <Text style={styles.packageCoins}>Coins {item?.coins}</Text>
            <Text style={styles.packagePrice}>AED {item?.priceAED}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
            style={[
              styles.packageItem
            ]}
             onPress={() => setSelectedPackage('custom')}
          >
            <View style={{ width: '40%' }}>
                <Icon name="wallet" color="#000" size={24} />
            </View>
            <View style={{ width: '60%' }}>
            <Text style={styles.packageCoins}>Custom Coins</Text>
            <Text style={styles.packagePrice}>Large Amount</Text>
            </View>
          </TouchableOpacity>
      </View>
      <PaymentMethodSelector selectedPackage={selectedPackage}  onChangevalue={(value) => {
       getGiftData()
      console.log('Payment status changed:', value);
      }}/>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold', marginLeft: 7, marginTop: 3
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userBalance: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  inviteText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  codeText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'right',
  },
  packagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  packageItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd', display: 'flex', flexDirection: 'row'
  },
  selectedPackage: {
    borderColor: '#007bff',
    backgroundColor: '#e6f0ff',
  },
  packageCoins: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  packagePrice: {
    fontSize: 11,
    color: '#555',
  },
  rechargeInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
    elevation: 2,
  },
  rechargeTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  inviteCode: {
    fontSize: 14,
    color: '#555',
  },
  editCode: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // optional
  },
});


export default GetCoins;
