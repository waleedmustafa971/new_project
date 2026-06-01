import React, { useEffect, useState } from "react";
import { View, Text, FlatList, 
    ActivityIndicator, StyleSheet } from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { TouchableOpacity, Image } from 'react-native';

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from '../../component/global'
import api from '../../component/api'
import { useNavigation } from "@react-navigation/native";

export default function PropertyFavourites() {
    const navigation = useNavigation()
    const [favourites, setFavourites] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [userid, setUserid] = useState(null);

    const loadFavourites = async (pageNumber = 1) => {
        if (!userid) return; // Wait for userid

        setLoading(true);
        try {
            const response = await api.get(
                `/apis/property/propertyfaviouriteslist?userId=${userid}&page=${pageNumber}&limit=10`
            );
            const data = response.data.data;  // <-- This is your favourites array
            console.log('....favourite list' + JSON.stringify(data))
            if (pageNumber === 1) {
                setFavourites(data || []);
            } else {
                setFavourites(prev => [...prev, ...(data || [])]);
            }

            setTotal(response.data.total || 0);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load favourites:", error.response?.data || error.message);
            setLoading(false);
        }

    };

    useEffect(() => {
        (async () => {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (jsonValue != null) {
                const userData = JSON.parse(jsonValue);
                if (userData._id) {
                    setUserid(userData._id);
                } else {
                    console.warn("No userId found in storage");
                }
            } else {
                console.warn("User data not found in storage");
            }
        })();
    }, []);

    // When userid or page changes, load favourites
    useEffect(() => {
        if (userid) {
            loadFavourites(page);
        }
    }, [userid, page]);

    const loadMore = () => {
        if (!loading && favourites.length < total) {
            setPage(prev => prev + 1);
        }
    };



const renderItem = ({ item }) => {
  // `item` is one favourite object with nested property `details` (or property_id)
  const property = item.details || item.property_id; // fallback if needed

  if (!property) return null; // safety check

  const isFavorite = favourites.some(fav => fav._id === item._id); // example favorite check

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("PropertyDetails", { itemdetails: property })}
    >
      {/* Background Image */}
      {property.images && property.images.length > 0 && (
        <Image
          source={{ uri: base.BASE_URL + property.images[0].image }}
          style={styles.image}
        />
      )}

      {/* Price Label */}
      {property.price && (
        <View style={styles.viewLabel}>
          <Text style={styles.viewLabelText}>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'AED',
              maximumFractionDigits: 0,
            }).format(Number(property.price))}
          </Text>
        </View>
      )}

      {/* Favorite Icon */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => toggleFavorite(item._id)}
      >
        <Icon
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? 'red' : 'black'}
        />
      </TouchableOpacity>
      {/* Property Details */}
      <View style={styles.productDetails}>
        <Text style={styles.productTitle}>{property.shortTitle || "No Title"}</Text>
        <Text style={styles.productPrice}>{property.location || "No Location"}</Text>
      </View>
    </TouchableOpacity>
  );
};

    

    return (
        <View style={{ flex: 1, padding: 10 }}>
            <FlatList
                data={favourites}
                keyExtractor={(item) => item._id}

                 renderItem={renderItem}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loading ? <ActivityIndicator size="small" /> : null}
            />
        </View>
    );
}


const styles = StyleSheet.create({
  card: {
    width: '100%',
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
    borderRadius: 20, width: 30, height: 30
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
    fontSize: 14
  },
  productPrice: {
    fontSize: 13,
    color: '#000',
    marginTop: 2,
  },
  productModel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
});

