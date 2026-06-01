import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../component/global'

const RecommandMotors = ({ title, categorydata, navigation }) => {
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
      <TouchableOpacity style={styles.card} onPress={() => {
                navigation.navigate("MotorsDetails", {
                    item: item
                })
            }}>
        {/* Background Image */}
        <Image source={{ uri: base.BASE_URL + item.images[0].image }} style={styles.image} />

        {/* Top Left Views */}
        {
          item.price ?
            <View style={styles.viewLabel}>
              <Text style={styles.viewLabelText}>
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'AED',
                  maximumFractionDigits: 0, // optional: removes decimal if not needed
                }).format(Number(item.price))}</Text>
            </View> : null
        }


        {/* Top Right Favorite Icon */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={17}
            color={isFavorite ? 'red' : 'black'}
          />
        </TouchableOpacity>

        {/* Bottom Left Play Icon */}
        {/*    <TouchableOpacity style={styles.playButton}>
          <Icon name="play" size={20} color="black" />
        </TouchableOpacity> */}

        {/* Product Details */}
        <View style={styles.productDetails}>
          <Text style={styles.productTitle} numberOfLines={1}>{item.shortTitle}</Text>
          {/*   <Text style={styles.productPrice}>{item.price}</Text> */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginTop: 0 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{title}</Text>
      {/*   <TouchableOpacity style={{
          flexDirection: 'row'
        }}>
          <Text>View all</Text>
          <Icon name="chevron-right" size={22} color="#333" />
        </TouchableOpacity> */}
      </View>

      {/* Product List */}
      <FlatList
        data={categorydata}
        keyExtractor={(item) => item._id}
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
    borderWidth: 0, borderColor: 'red'
  },
  image: {
    height: 231,
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10
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
    fontSize: 14,
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
    bottom: 10,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000'
  },
  productPrice: {
    fontSize: 12,
    color: 'green',
    marginTop: 2,
  },
  productModel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
});

export default RecommandMotors;
