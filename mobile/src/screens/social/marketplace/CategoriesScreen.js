import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';

const CategoriesScreen = ({ categories }) => {
  const navigation = useNavigation()
  const [selectedCategory, setSelectedCategory] = useState('0');

  const checkDetails = async (item) => {
    setSelectedCategory(item.id)
    if (item.name == "Property") {
      navigation.navigate("PropertyDashboard")
    }
    else if (item.name == "Motors") {
      navigation.navigate("Motors")
    }
    else if (item.name == "Classified") {
      navigation.navigate("FilterClassified")
    }
    else if (item.name == "Job") {
      navigation.navigate("ClassifiedDetails", {
        itemdetails: item,
      })
    }
    else if (item.name == "Shopping") {
      navigation.navigate("ShoppingDashboard")
    }
    else if (item.name == "Food") {
      navigation.navigate("FoodDashboard")
    }

  }

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategory,
      ]}
      //    onPress={() => setSelectedCategory(item.id)}
      onPress={() => {
        checkDetails(item)
      }}
    >
      <Text style={selectedCategory === item.id ? styles.selectedText : styles.categoryText}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderCategoryItem}
        contentContainerStyle={styles.categoryList}
      />

    </View>
  )
}

export default CategoriesScreen

const styles = StyleSheet.create({
  categoryList: { paddingVertical: 16, paddingLeft: 16 },
  categoryItem: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCategory: { backgroundColor: '#000' },
  categoryText: { color: '#333' },
  selectedText: { color: '#fff', fontWeight: 'bold' },

});
