// components/Header.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

export default function Header() {
  const navigation = useNavigation();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity>
        <Icon name="qrcode-scan" size={30} color="#333" style={{ 
          marginLeft: 3
         }}/>
      </TouchableOpacity>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: 10,
          backgroundColor: '#f0f0f0',
          borderRadius: 10,
          paddingHorizontal: 10,
        }}
      >
        <Icon name="magnify" size={20} color="#aaa" />

        <TouchableOpacity
          style={{ flex: 1, marginLeft: 5, padding: 7 }}
          onPress={() => navigation.navigate('ShoppingSearchscreen')}
        >
          <Text style={{ color: '#888' }}>Search</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity>
        <Icon name="bell-outline" size={20} color="#333"  style={{ 
          marginRight: 7
         }}/>
      </TouchableOpacity>
    </View>
  );
}
