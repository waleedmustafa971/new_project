import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type SubCategory = {
  _id: string;
  name: string;
};

type Category = {
  _id?: string;
  name?: string;
  subcategories?: SubCategory[];
};

type Props = {
  navigation: any;
  categories: Category[];
};

const MotorsCategories: React.FC<Props> = ({ navigation, categories }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (item: any) => {
    setSelectedId(item._id);
    navigation.navigate('MotorsSubcategory', {
      category: item._id,
      subCategory: item.subcategories,
    });
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isSelected = item._id === selectedId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.itemContainer,
            isSelected && styles.selectedContainer,
          ]}
        >
          <Text
            style={[
              styles.itemText,
              isSelected && styles.selectedText,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );
};

export default MotorsCategories;
const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 10,
  },
  card: {
    marginRight: 10,
    height: 50,
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
    fontSize: 14,
    color: '#000',
    flexShrink: 1,
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
