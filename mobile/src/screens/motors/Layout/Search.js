import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SearchBar = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
      {/* Search Box */}
      <View style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 2,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 10
      }}>
        <Icon name="magnify" size={20} color="#aaa" />
        <TextInput
          placeholder="Search"
          style={{ flex: 1, marginLeft: 5 }}
        />
        <TouchableOpacity>
          {/* Voice Record Icon */}
          <Icon name="microphone" size={20} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* More Filter Button */}
      <TouchableOpacity
        style={{
          marginLeft: 10,
          backgroundColor: '#f0f0f0',
          padding: 10,
          borderRadius: 10,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <Icon name="tune" size={20} color="black" />
        <Text style={{ marginLeft: 5 }}>More Filter</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SearchBar;
