import { useNavigation, NavigationProp } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
// Correct import for React Native CLI
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCart } from '../../screens/shopping/context/CartContextFood';
import AnimatedIcon from './AnimatedIcon';
// 1. Define the screens and their params
type RootStackParamList = {
  HomeScreen: undefined;
  FoodDashboard: undefined;
  FoodProfile: undefined;
  FoodViewcart: undefined;
  RestaurantScreen: { restaurant_id: string }; 
  DiscountOfferModal: { latitude: number, longitude: number }
};


const CustomTabBar = ({ latitude, longitude  } : any) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { cartCount } = useCart();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.bannerContainer} 
      onPress={() => {
         // onOpenDiscountModal(true) 
         navigation.navigate("DiscountOfferModal", {
          "latitude" : latitude,
          "longitude": longitude
         })
      }}>
        <View style={styles.leftSection}>
          {/* <Icon name="alarm" size={35} color="#E91E63" /> */}
          <AnimatedIcon />
          <View style={styles.textContainer}>
            <Text style={styles.saveText}>offer 25%</Text>
            <Text style={styles.subText}>Flash Deals: limited time offers</Text>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>44 </Text>
          </View>
          <Text style={styles.colon}>:</Text>
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>31</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton}>
          <Icon name="close" size={20} color="#333" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.navBar}>
        <NavItem icon="home" label="home" onPress={() => {
          navigation.navigate("HomeScreen");
        }} />
        <NavItem icon="silverware-fork-knife" label="Food" onPress={() => {
          navigation.navigate("FoodDashboard");
        }} active />
        {/*   <NavItem icon="storefront-outline" label="Grocery" /> */}
       {/*  <NavItem icon="magnify" label="Search" onPress={() => {
          navigation.navigate("ShoppingProfile");
        }} /> */}
        <NavItem icon="shopping-outline" label="Carts" 
         cartCount={cartCount}   // ✅ pass it here
        onPress={() => {
          navigation.navigate("FoodViewcart"); //how to add here cart
        }} />

        <NavItem icon="account-outline" label="Account" onPress={() => {
          navigation.navigate("FoodProfile");
        }} />

      </View>
    </SafeAreaView>
  );
};

// Helper Component for Nav Items
/* const NavItem = ({ icon, label, active = false, onPress, cartCount }: any) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <Icon name={icon} size={26} color={active ? '#E91E63' : '#757575'} />
    <Text style={[styles.navLabel, { color: active ? '#E91E63' : '#757575' }]}>
      {label}
    </Text>
      {cartCount > 0 && (
        <View
          style={{
            marginLeft: 4,
            backgroundColor: "#E91E63",
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10 }}>
            {cartCount}
          </Text>
        </View>
      )}
  </TouchableOpacity>
); */

const NavItem = ({ icon, label, active = false, onPress, cartCount }: any) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    
    <View>
      <Icon name={icon} size={26} color={active ? '#E91E63' : '#757575'} />

      {cartCount > 0 && (
        <View
          style={{
            position: "absolute",
            right: -6,
            top: -4,
            backgroundColor: "red",
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11 }}>
            {cartCount}
          </Text>
        </View>
      )}
    </View>

    <Text style={[styles.navLabel, { color: active ? '#E91E63' : '#757575' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFF',
  },
  bannerContainer: {
    backgroundColor: '#FFEDF2', // Soft pink
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
  },
  saveText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#222',
  },
  subText: {
    fontSize: 13,
    color: '#D81B60',
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  timeBox: {
    backgroundColor: '#B00058',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    minWidth: 30,
    alignItems: 'center',
  },
  timeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  colon: {
    marginHorizontal: 4,
    fontWeight: 'bold',
    color: '#B00058',
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  navBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
    paddingBottom: 5,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default CustomTabBar;