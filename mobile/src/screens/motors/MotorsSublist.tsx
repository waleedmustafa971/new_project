import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Category = {
  id: string;
  name: string;
};

const categories: Category[] = [
  { id: '1', name: 'Cars' },
  { id: '2', name: 'New Cars' },
  { id: '3', name: 'Export Cars' },
  { id: '4', name: 'Rental Cars' },
  { id: '5', name: 'Motorcycles' },
  { id: '6', name: 'Auto Accessories & Parts' },
  { id: '7', name: 'Heavy Vehicles' },
];

const MotorsSublist = ({ navigation, subcategory }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (item: Category) => {
    setSelectedId(item.name);
    navigation.navigate("MotorsSubcategory",{
      categories : item.name
    })

  };

  const renderItem = ({ item }: { item: Category }) => {
    const isSelected = item.id === selectedId;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
        <View style={[styles.itemContainer, isSelected && styles.selectedContainer]}>
{/*           <Ionicons
            name="car-sport-outline"
            size={24}
            color={isSelected ? '#ffffff' : '#2e64e5'}
          /> */}
          <Text style={[styles.itemText, isSelected && styles.selectedText]}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 10,
  },
  card: {
    marginRight: 10, height: 50,
    borderWidth: 0, borderColor: 'green'
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedContainer: {
    backgroundColor: '#2e64e5',
  },
  itemText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default MotorsSublist;
