import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, Alert
 } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
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
  const [buying, setBuying] = useState(false);
  const navigation = useNavigation()
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  /*
    Buying coins, the way the server expects it.

    The old path asked the client for the amount: it posted a price to
    /apis/live/createPayment and then told /apis/live/add-transaction the
    payment was "approved", so the wallet was credited on the app's say-so.
    Here the app never names a price. It sends a packageId; the server reads
    that package's price, creates the PaymentIntent, and on confirm re-checks
    with Stripe that the payment succeeded, that the intent belongs to this
    user, and that the amount matches the package — then credits the coins
    once, guarded by a unique index on the intent id so a retry cannot
    double-credit.
  */
  const buyCoins = async () => {
    if (!selectedPackage || buying) return;

    setBuying(true);
    try {
      const raw = await AsyncStorage.getItem('userdata');
      const userId = raw ? JSON.parse(raw)?._id : null;
      if (!userId) throw new Error('Please sign in again');

      const { data } = await api.post('/apis/monetisation/purchase/intent', {
        userId,
        packageId: selectedPackage._id,
      });
      if (!data?.clientSecret) throw new Error(data?.message || 'Could not start the payment');

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Max',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: { name: usersData?.name },
      });
      if (initError) throw new Error(initError.message);

      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError) {
        /* Backing out of the sheet is a decision, not a failure — saying
           "payment failed" to someone who chose not to pay is just noise. */
        if (sheetError.code === 'Canceled') return;
        throw new Error(sheetError.message);
      }

      const confirmed = await api.post('/apis/monetisation/purchase/confirm', {
        userId,
        paymentIntentId: data.paymentIntentId,
      });

      setSelectedPackage(null);
      await getGiftData();
      Alert.alert(
        'Coins added',
        `${confirmed.data?.coinsAdded ?? selectedPackage.coins} coins are in your wallet. You now have ${confirmed.data?.coins ?? ''}.`.trim()
      );
    } catch (e: any) {
      /*
        The card has already been charged by the time confirm runs, so a failure
        there must not read as "payment failed" — the money moved. It says what
        the server said and tells them the coins will follow, because confirm is
        replayable: the same intent id credits exactly once whenever it lands.
      */
      const serverMessage = e?.response?.data?.message;
      Alert.alert(
        'Could not complete that',
        serverMessage || e?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setBuying(false);
    }
  };

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
    } catch (error: any) {
      console.warn("Could not load coin packages:", error?.response?.data?.message || error?.message);
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
        {/* The "Custom Coins" tile is gone. It set the selection to the string
            "custom", which had no price and no package behind it, and the
            server only sells a package by id — there was nothing it could ever
            have bought. */}
      </View>

      {giftsData.length === 0 && !loading && (
        <Text style={styles.emptyNote}>
          No coin packages are on sale right now.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.buyBtn, (!selectedPackage || buying) && styles.buyBtnDisabled]}
        onPress={buyCoins}
        disabled={!selectedPackage || buying}
        activeOpacity={0.85}
      >
        {buying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyBtnText}>
            {selectedPackage
              ? `Buy ${selectedPackage.coins} coins · AED ${selectedPackage.priceAED}`
              : 'Choose a package'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.payNote}>
        Card payments are handled by Stripe. Your card details never reach this app.
      </Text>
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
  emptyNote: {
    fontSize: 13,
    color: '#8A8F98',
    textAlign: 'center',
    paddingVertical: 20,
  },
  buyBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  buyBtnDisabled: { backgroundColor: '#E9C6D2' },
  buyBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  payNote: {
    fontSize: 11.5,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 28,
    lineHeight: 16,
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
