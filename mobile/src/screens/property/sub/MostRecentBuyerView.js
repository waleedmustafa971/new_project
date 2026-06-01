import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'
import { useNavigation } from '@react-navigation/native';

const recommendedData = [
  {
    id: '1',
    title: 'Apartments for rent in Dubai,DAMAC Hills,Carson,Carson A',
    amount: 'AED 35,000',
    City: "Dubai",
    model: '2024',
    image: base.BASE_URL + '/uploads/property_temp/14722261-17c91o.webp',
    views: '260 Views',
  }
];

const MostRecentBuyerView = () => {
  const [favorites, setFavorites] = useState([]);
  const navigation = useNavigation()
  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((item) => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const renderItem = ({ item }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity style={styles.card} onPress={() => {
        navigation.navigate("PropertyDetails")
      }}>
        {/* Background Image */}
        <Image source={{ uri: item.image }} style={styles.image} />

        {/* Top Left Views */}
        <View style={styles.viewLabel}>
          <Text style={styles.viewLabelText}>{item.amount}</Text>
        </View>

        {/* Top Right Favorite Icon */}
        {/* Product Details */}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{item.title}</Text>
        {/*   <Text style={styles.productPrice}>{item.amount}</Text> */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginTop: 0 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Most Recent View Ads</Text>
      </View>

      {/* Product List */}
      <FlatList
        data={recommendedData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: 15, 
    borderWidth: 0, 
    borderColor: 'red'
  },
  image: {
    height: 100,
    width: '100%',
    borderRadius: 10,
  },
  viewLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  viewLabelText: {
    fontSize: 12,
    color: '#000',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
  },
  productDetails: {
    flexDirection: 'row', position: 'absolute',
    bottom: 0, left: 0,
    justifyContent: 'space-between', height: 30
  },
  productTitle: {
    fontSize: 10, color: '#ffffff',
    backgroundColor: '#000'
  },
  productPrice: {
    fontSize: 13,
    color: 'green',
    marginTop: 2,
  },
  productModel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
});

export default MostRecentBuyerView;
