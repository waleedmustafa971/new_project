import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCart } from "../../shopping/context/CartContext";
import { useNavigation, useIsFocused } from '@react-navigation/native';

const tabs = [
  { name: 'home-outline', activeName: 'home', label: 'Home' },
  { name: 'view-grid-outline', activeName: 'Categories', label: 'Categories' },
  { name: 'cart-outline', activeName: 'cart', label: 'Cart' },
  { name: 'account-outline', activeName: 'account', label: 'Account' },
];

const Footer = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const { fetchCart, cartCount } = useCart();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // 🔥 Refresh cart every time Footer becomes visible
  useEffect(() => {
    fetchCart();
  }, [isFocused]);

const onTabPress = async (label) => {
  setActiveTab(label);

  if (label === "Cart") {
    await fetchCart();
    navigation.navigate("ViewCart");

  } else if (label === "Categories") {
    navigation.navigate("ViewCategories");

  } else if (label === "Account") {
    navigation.navigate("ShoppingProfile");

  } else {
    navigation.navigate("HomeScreen");
  }
};

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const focused = activeTab === tab.label;

        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tabButton}
            onPress={() => onTabPress(tab.label)}
          >
            <View style={{
              justifyContent: 'center', alignItems: 'center'
            }}>
              <MaterialCommunityIcons
                name={focused ? tab.activeName : tab.name}
                size={25}
                color={focused ? '#007AFF' : '#8e8e93'}
              />
              <Text style={{ marginLeft: 0, fontSize: 12 }}>{tab.label}</Text>
              {/* ⭐ FIXED BADGE (Correct Label + Correct Count) */}
              {tab.label === "Cart" && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: 'red',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700'
  },
});

export default Footer;
