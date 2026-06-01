// components/ProductList.js
import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity } from 'react-native';

const ProductList = ({ products }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity className="m-2 bg-white rounded-2xl shadow p-2 w-40">
      <Image source={{ uri: item.image }} style={{ width: '100%', height: 100, borderRadius: 10 }} />
      <Text className="mt-2 text-sm font-semibold">{item.name}</Text>
      <Text className="text-red-500 font-bold">${item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={products}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ paddingHorizontal: 10 }}
    />
  );
};

export default ProductList;
