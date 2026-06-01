import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // or FontAwesome, Ionicons, etc.
import { useNavigation } from '@react-navigation/native';
const options = [
  { name: 'home-city-outline', label: 'Property for Rent' },
  { name: 'home-outline', label: 'Property for Sale' },
  { name: 'bed-king-outline', label: 'Rooms for Rent' },
  { name: 'office-building-outline', label: 'Off-Plan Properties' },
];

const PropertyOptions = () => {
  const navigation = useNavigation()
  const [itemselected, setItemselected] = useState(null)

  const buildFilters = (type) => {
    return { type };
  };

  const selectedValue = (itemLabel) => {
    console.log('Room for Rent....', itemLabel)
    if (itemLabel === "Rooms for Rent") {
      const filters = {
        type: 'Property for Rent',
        categoryId: '6968a41d18bd6696f998fa38'
      };
      navigation.navigate('PropertyforRent', {
        filters,
      });
    }
    else {
      const filters = buildFilters(itemLabel);
     
      console.log('filters:', filters);
      navigation.navigate("PropertyforRent", {
        filters,
      });
    }

  };
  return (
    <View style={styles.container}>
      {options.map((item, index) => (
        <TouchableOpacity key={index} style={styles.option} onPress={() => {
          selectedValue(item.label)
          setItemselected(item.label)
        }}>
          <View style={styles.iconContainer}>
            <Icon name={item.name} size={25} color="#000" />
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
    flexWrap: 'nowrap', // ✅ stay single row
  },
  option: {
    alignItems: 'center',
    marginVertical: 2,
    width: 80, // ✅ ensure enough space for 4 items in 1 line
  },
  iconContainer: {
    backgroundColor: '#eee',
    borderRadius: 50,
    padding: 15,
    marginBottom: 5,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
    color: '#000',
    flexWrap: 'nowrap',     // ✅ don't wrap text
    numberOfLines: 1,       // ✅ force one line
  },
});

export default PropertyOptions;
