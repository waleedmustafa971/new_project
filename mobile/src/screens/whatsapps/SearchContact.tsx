// SearchContact.tsx
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface SearchContactProps {
  query: string;
  onSearchChange: (text: string) => void;
}

const SearchContact: React.FC<SearchContactProps> = ({ query, onSearchChange }) => {

  const handleClear = () => onSearchChange('');

  return (
    <View style={styles.container}>
      <Icon name="search" size={20} color="#999" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={onSearchChange}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Icon name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginTop: 5,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderRadius: 50
  },
  clearButton: {
    marginLeft: 8,
  },
});

export default SearchContact;
