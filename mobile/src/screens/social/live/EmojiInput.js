import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const EmojiInput = () => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        placeholder="Type a message..."
        placeholderTextColor="#999"
        style={styles.input}
      />
      <TouchableOpacity style={styles.emojiButton}>
        <Icon name="happy-outline" size={24} color="#999" />
      </TouchableOpacity>
    </View>
  );
};

export default EmojiInput;

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 35, // space for the emoji button
    color: '#000',
  },
  emojiButton: {
    position: 'absolute',
    right: 10,
  },
});
