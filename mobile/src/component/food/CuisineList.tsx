import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as base from "../../component/global";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  CuisineList: undefined; // <-- Add this
  CuisineProductView: { cuisine_id: string }
  // ...other screens
};

type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "CuisineList">;

const CuisineList = ({ cuisines = [], latitude, longitude }: any) => {
  
  const navigation = useNavigation<ViewCartScreenProp>();
  
  // Helper to chunk data into groups of 2 for a two-row horizontal scroll
  const formatData = (data: any[]) => {
    const chunked = [];
    for (let i = 0; i < data.length; i += 2) {
      chunked.push(data.slice(i, i + 2));
    }
    return chunked;
  };

  const renderItem = ({ item: pair }: { item: any[] }) => (
    <View>
      {pair?.map((cuisine : any) => (
        <TouchableOpacity key={cuisine._id} style={styles.card} onPress={() => {
          navigation.navigate("CuisineProductView",{
            "cuisine_id": cuisine._id,
            latitude, longitude
          })
        }}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: base.BASE_URL + cuisine.cuisine_image }}
              style={styles.image}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {cuisine.cuisine_name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cuisines</Text>
      </View>

      <FlatList
        horizontal
        data={formatData(cuisines)}
        keyExtractor={(_, index) => `pair-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 18,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
    letterSpacing: -0.5,
  },
  listPadding: {
    paddingHorizontal: 8,
  },
  card: {
    width: 90,
    marginHorizontal: 8,
    marginVertical: 6, // Vertical spacing between the two rows
    alignItems: 'center',
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36, // Circular style looks cleaner for cuisines
    backgroundColor: '#F8F8F8',
    padding: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    resizeMode: 'cover',
  },
  name: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    color: '#444',
  },
});

export default CuisineList;