import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'

const recommendedData = [
  {
    id: '1',
    title: 'Apartments for rent in Dubai,DAMAC Hills,Carson,Carson A',
    amount: 'AED 35,000',
    City: "Dubai",
    model: '2024',
    image: base.BASE_URL + '/uploads/property_temp/14722261-17c91o.webp',
    views: '260 Views',
  },
  {
    id: '2',

    title: 'Dubai, Mudon, Mudon Al Ranim 1',
    amount: 'AED 42,000',
      City: "Abu Dhabi",
    model: '2023',
    image: base.BASE_URL + '/uploads/property_temp/property1.webp',
    views: '180 Views',
  },
  {
    id: '3',
    title: 'Dubai, Umm Suqeim, Madinat Jumeirah Living',
    amount: 'AED 55,000',
      City: "Dubai",
    model: '2024',
    image: base.BASE_URL + '/uploads/property_temp/14722261-1abbfo.webp',
    views: '320 Views',
  },
  {
    id: '4',
    title: 'Dubai, Dubai Land, La Tilia',
    amount: 'AED 55,000',
      City: "Dubai",
    model: '2024',
    image: base.BASE_URL + '/uploads/property_temp/studio1bath.webp',
    views: '320 Views',
  }
];

const ExploreUae = () => {
  const [favorites, setFavorites] = useState([]);

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
      <View style={styles.card}>
        {/* Background Image */}
        <Image source={{ uri: item.image }} style={styles.image} />

        {/* Top Left Views */}
        <View style={styles.viewLabel}>
          <Text style={styles.viewLabelText}>{item.amount}</Text>
        </View>

        {/* Top Right Favorite Icon */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? 'red' : 'black'}
          />
        </TouchableOpacity>

        {/* Bottom Left Play Icon */}
        <TouchableOpacity style={styles.playButton}>
          <Icon name="play" size={20} color="black" />
        </TouchableOpacity>

        {/* Product Details */}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>{item.title}</Text>
        {/*   <Text style={styles.productPrice}>{item.amount}</Text> */}
        </View>
      </View>
    );
  };

  return (
    <View style={{ marginTop: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Explore new projects in the UAE</Text>
        <TouchableOpacity><Text>See More</Text></TouchableOpacity>
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
    height: 231,
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
  playButton: {
    position: 'absolute',
    bottom: 35,
    left: 10,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
  },
  productDetails: {
    marginTop: 0, flexDirection: 'row',
    justifyContent: 'space-between'
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
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

export default ExploreUae;
