import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const cities = [
  'Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman',
  'Ras al Khaimah', 'Umm Al Quwain', 'Al Ain', 'Fujairah'
];

const LocationInput = () => {
  const [location, setLocation] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);

  const handleLocationChange = (text) => {
    setLocation(text);
    if (text.length > 0) {
      const filtered = cities.filter(city =>
        city.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities([]);
    }
  };

  const handleSelectCity = (city) => {
    setLocation(city);
    setFilteredCities([]);
  };

  return (
    <View style={{ marginTop: 0 }}>
      <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>Location</Text>
      <View style={styles.inputWrapper}>
        <Icon name="map-pin" size={20} color="#888" style={{ marginHorizontal: 8 }} />
        <TextInput
          placeholder="Search location"
          value={location}
          onChangeText={handleLocationChange}
          style={styles.textInput}
        />
      </View>

      {/* Auto-Suggestions */}
      {filteredCities.length > 0 && (
        <View style={styles.suggestionBox}>
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelectCity(item)}>
                <Text style={styles.suggestionItem}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    fontSize: 16,
  },
  suggestionBox: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    marginTop: 4,
    borderRadius: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
});

export default LocationInput;
