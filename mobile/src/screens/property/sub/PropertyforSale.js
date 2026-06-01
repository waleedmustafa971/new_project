import {
  View, Text, TouchableOpacity,
  FlatList, Image, StyleSheet, Dimensions
} from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'
import { useNavigation } from '@react-navigation/native';


const PropertyforSale = ({ propertysalesdata }) => {
  const [favorites, setFavorites] = useState([]);
  const navigation = useNavigation()

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((item) => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const truncateText = (text, maxLength = 33) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + '...';
  };

  const renderItem = ({ item, index }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity style={styles.card} onPress={() => {
        navigation.navigate("PropertyDetails", {
          itemdetails: item
        })
      }} key={index}>
        {/* Background Image */}
        <Image source={{ uri: base.BASE_URL + item.images[0].image }} style={styles.image} />
        {/* Top Left Views */}
        <View style={styles.viewLabel}>
          <Text style={styles.viewLabelText}>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'AED',
              maximumFractionDigits: 0, // optional: removes decimal if not needed
            }).format(Number(item.price))}
          </Text>
        </View>

        {/* Top Right Favorite Icon */}
        {/*  <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? 'red' : 'black'}
          />
        </TouchableOpacity> */}

        {/* Product Details */}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.shortTitle}
          </Text>
          <Text style={styles.productPrice} numberOfLines={1} ellipsizeMode="tail">
            {item.location}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginTop: 10 }}>
      {/* Header */}
    {/* Header */}
      <View style={{ flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', paddingHorizontal: 10,
        marginBottom: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Property for Sale</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("RecommandPropertyMore",{
            "type": "Property for Sale"
          })}
          style={{
            backgroundColor: '#f0f0f0',
            borderRadius: 20,
            padding: 6,
          }}
        >
          <Icon name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
      </View>
  
      {/* Product List */}
      <FlatList
        data={propertysalesdata}
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
    width: Dimensions.get("window").width * 0.4,
    marginRight: 15,
    borderWidth: 0,
    borderColor: 'red'
  },
  image: {
    height: 113,
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
    fontWeight: 'bold'
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 4,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',

    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,

    // Android Elevation
    elevation: 4,
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
    marginTop: 0, flexDirection: 'column',
    justifyContent: 'space-between'
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000'
  },
  productPrice: {
    fontSize: 10,
    color: '#000',
    marginTop: 2,
  },
  productModel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
});

export default PropertyforSale;
