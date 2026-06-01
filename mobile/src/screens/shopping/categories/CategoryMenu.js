// components/CategoryMenu.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const categories = [
  { name: 'Discount', icon: 'tag' },
  { name: 'Win Gift', icon: 'gift' },
  { name: 'Affiliate', icon: 'account-multiple'},
  { name: 'Recharge', icon: 'cellphone' },
  { name: 'Delivery', icon: 'truck' },
  { name: 'Beauty', icon: 'lipstick' },
  { name: 'New Arrivals', icon: 'new-box' },
];

export default function CategoryMenu() {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => (
        <TouchableOpacity style={{ alignItems: 'center', margin: 10 }}>
          <Icon name={item.icon} size={30} color="#ff6600" />
          <Text style={{ marginTop: 5 }}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
