import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const CategoryList = ({ categories, url }) => {
    const navigation = useNavigation();

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => {
      navigation.navigate("SingleCategoryProduct", {
        categoryid: item._id,
        categoryname : item.name
      })
    }}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: url + item.image }}
          style={styles.image}
          resizeMode="stretch"
        />
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.flashBar}>
        <Text style={styles.flashText}>Popular Category for you</Text>

        <TouchableOpacity style={{ flexDirection: 'row', 
          alignItems: 'center' }} onPress={() => {
              navigation.navigate("CategoryShowmore",{
                data : categories
              })
          }}>
          <Text style={styles.shopMore}>Scroll More</Text>
          <Ionicons name="chevron-forward" size={15} 
          color="#000" style={{ 
            marginTop: 2
          }}/>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 0,
  },
  itemContainer: {
    margin: 0,
    alignItems: 'center',
    width: 80,
  },
  imageWrapper: {
    backgroundColor: '#f3f4f6', // gray-100
    padding: 12,
    borderRadius: 50, // fully round for circle
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25, // circle
  },
  categoryName: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    width: 64,
    color: '#000', // black text
  },
   flashBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    /*  backgroundColor: '#fee2e2', */
    padding: 12,
    borderRadius: 10,
    marginBottom: 0, 
    borderWidth: 0, borderColor: '#000'
  },
  flashText: {
    fontWeight: 'bold',
    color: '#000', fontSize: 12
  },
  shopMore: {
    color: '#000',
    fontWeight: '500',
    fontSize: 12
  },
});

export default CategoryList;
