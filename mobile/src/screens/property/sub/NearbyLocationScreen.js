import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList, Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../component/api';
import * as base from '../../../component/global'

const NearbyLocationScreen = ({ data, setLocationFilter, navigation }) => {
  const [categorydata, setCategorydata] = useState([])

  useEffect(() => {
    //  fetchCategory()
  }, [])


  const renderItem = ({ item, index }) => {
    const img =
      item.images?.[0]?.image
        ? base.BASE_URL + item.images[0].image
        : null;
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff' }]}
      onPress={() =>
          navigation.navigate("PropertyDetails", {
            itemdetails: item
          })
        }>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{item?.price}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.shortTitle}</Text>
        <Text style={styles.text} numberOfLines={2}>
          {item.location || 'No address available'}
        </Text>

      </TouchableOpacity>
    )
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between'
      }}>
        <Text style={styles.header}>Nearby Locations</Text>
        <TouchableOpacity onPress={() => setLocationFilter(true)}>
          <Text style={styles.header}>Change</Text>
        </TouchableOpacity>
      </View>
      {/* <Text>{JSON.stringify(data)}</Text> */}
      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
  },

  image: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },

  imagePlaceholder: {
    backgroundColor: "#e0e0e0",
  },

  header: {
    fontSize: 14, fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 5,
  },
  card: {
    width: 200,
    padding: 12,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#f2f2f2'
  },
  title: {
    fontSize: 14,
    marginTop: 17
  },
  text: {
    fontSize: 12,
    color: '#333',
  },
  distance: {
    marginTop: 6,
    fontSize: 13,
    color: '#000',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
});

export default NearbyLocationScreen;
