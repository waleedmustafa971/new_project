import React, { useState } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const categories = [
  { id: '1', name: 'All' },
  { id: '2', name: 'Read' },
  { id: '3', name: 'Unread' },
  { id: '4', name: 'Favourites' },
  { id: '5', name: 'Groups' },
  { id: '6', name: 'Contacts' },
  { id: '7', name: 'Boots' },
  { id: '8', name: 'Important' },
  { id: '9', name: 'Follow up' },
  { id: '10', name: '...' },
];

const CategoryFilter = ({ selectedCategory, onSelectCategory } : any) => {
  const [selected, setSelected] = useState('All');

  const renderItem = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      onPress={() => onSelectCategory(item.name)}
      style={[
        styles.categoryButton,
        selectedCategory === item.name && styles.selectedButton,
      ]}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.name && styles.selectedText,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ paddingVertical: 0, borderWidth: 0, borderColor: '#000',
      marginTop: 10
     }}>
      <FlatList
        data={categories}
        renderItem={renderItem}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categoryButton: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  selectedButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  categoryText: {
    color: '#333',
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
  },
});

export default CategoryFilter;
