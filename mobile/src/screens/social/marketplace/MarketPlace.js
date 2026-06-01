import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import CategoriesScreen from './CategoriesScreen';
import HeaderMarketplace from './HeaderMarketplace';
import api from '../../../component/api';
import { BASE_URL } from '../../../component/global';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from '@react-navigation/native';

const categories = [
  { id: '0', name: 'All' },
  { id: '1', name: 'Property' },
  { id: '2', name: 'Motors' },
  { id: '3', name: 'Classified' },
  { id: '4', name: 'Job' },
  { id: '6', name: 'Shopping' },
  { id: '7', name: 'Food' },
];

export default function MarketPlace() {
  const [page, setPage] = useState(1);
  const [groupdata, setGroupdata] = useState([])
  const navigation = useNavigation()
  useEffect(() => {
    getMarketplaceData()
  }, [page])

  const getMarketplaceData = async (page = 1, limit = 10) => {
    try {
      const response = await api.get(
        `/apis/property/getMarketPlacedata?page=${page}&limit=${limit}`
      );
      setGroupdata(response.data?.data);
      console.log('market place....', response.data);
    } catch (error) {
      console.log("API ERROR:", error);
      throw error;
    }
  };

  const selectGroupdata = (item) => {
    if (item == "Property") {
      navigation.navigate("PropertyDashboard")
    }
    else if (item == "Furniture and Garden") {
      navigation.navigate("FilterFurniture")
    }
    else if (item == "Motors") {
      navigation.navigate("Motors")
    }
    else if (item == "classified") {
      navigation.navigate("FilterClassified")
    }
    else {

    }
  }

  const GroupItem = ({ group }) => {
    return (
      <View style={styles.groupContainer}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between', width: '100%',
          padding: 10
        }}>
          <Text style={styles.groupTitle}>{group.groupName}</Text>
          <Pressable style={{
            display: 'flex',
            flexDirection: 'row'
          }} onPress={() => {
            selectGroupdata(group.groupName)
          }}>
            <Text style={styles.seeAll}>See All</Text>
            <Ionicons name="chevron-forward" size={15} />
          </Pressable>
        </View>
        <FlatList
          data={group.properties}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <PropertyCard item={item} />}
        />
      </View>
    );
  };

  const checkDetails = async(item) => {
    if(item?.add_post == "Property")
    {
    navigation.navigate("PropertyDetails", {
      itemdetails: item,
    })
    }
    else if(item?.add_post == "Motors")
    {
          navigation.navigate("MotorsDetails", {
            item: item
          })
    } 
    else if(item?.add_post == "classified")
    {
          navigation.navigate("ClassifiedDetails", {
            itemdetails: item,
          })
    }
    else if(item?.add_post == "Furniture and Garden")
    {
         navigation.navigate("ClassifiedDetails", {
            itemdetails: item,
          })
    }
    else {

    }
  }
  const PropertyCard = ({ item }) => {
    const img =
      item.images?.[0]?.image
        ? BASE_URL + item.images[0].image
        : null;
    return (
      <TouchableOpacity style={styles.card}  onPress={() =>
         {
          checkDetails(item)
         }
        }>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <Text numberOfLines={1} style={styles.title}>
          {item.shortTitle}
        </Text>

        <Text style={styles.price}>
          {item.price} {item.currency}
        </Text>

        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <HeaderMarketplace />
      <CategoriesScreen categories={categories} />
      <FlatList
        data={groupdata}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <GroupItem group={item} />}
        onEndReached={() => setPage(page + 1)} // pagination
        onEndReachedThreshold={0.5}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 10 },
  image: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },

  imagePlaceholder: {
    backgroundColor: "#e0e0e0",
  },
  flashSalesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20 },
  flashSalesTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAll: { color: '#000', fontSize: 11 },

  productList: { paddingVertical: 16, paddingLeft: 16 },
  productCard: {
    width: 150, display: 'flex',
    backgroundColor: '#f9f9f9', borderRadius: 12,
    marginRight: 16, paddingBottom: 10
  },
  imageContainer: { position: 'relative' },
  productImage: { width: '100%', height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  discountTag: { position: 'absolute', top: 8, right: 8, backgroundColor: 'red', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: 12 },

  productName: { fontSize: 14, fontWeight: 'bold', marginTop: 8, paddingHorizontal: 8 },
  productPrice: { fontSize: 14, color: '#007bff', paddingHorizontal: 8, marginTop: 4 },
  groupContainer: {
    width: '100%',
    marginTop: 0, display: 'flex', flexDirection: 'column'
  },

  groupTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },

  card: {
    width: 180,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },

  title: {
    fontSize: 12
  },

  price: {
    color: "#000"
  },

  location: {
    fontSize: 12,
    color: "#777",
    marginTop: 5,
  },
});
