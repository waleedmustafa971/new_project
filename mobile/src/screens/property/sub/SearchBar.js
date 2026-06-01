import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Text,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedPlaceholderInput from './AnimatedPlaceholderInput';
import { useNavigation } from '@react-navigation/native';
import SearchModalScreen from '../morefilter/SearchModalScreen';

const SearchBar = () => {
  const navigation = useNavigation()
  const [showsearchmodal, setShowsearchmodal] = useState(false);
  const [text, setText] = useState('');

  const handleTextChange = (inputText) => {
    setText(inputText);
  };

  const handleFocus = () => {
    setShowsearchmodal(true);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 5 }}>
        {/* Search Box */}
        <TouchableOpacity style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: 2,
          backgroundColor: '#f0f0f0',
          borderRadius: 10,
          paddingHorizontal: 10
        }}>
          <Icon name="magnify" size={20} color="#aaa" />
          {/*         
        <TextInput
          placeholder="Search"
          style={{ flex: 1, marginLeft: 5 }}
           value={text}
        onChangeText={handleTextChange}
        onFocus={handleFocus} 
        /> 
        */}
          <TouchableOpacity
            onPress={() => setShowsearchmodal(true)}
            style={{
              flex: 1, marginLeft: 5, justifyContent: 'center',
              padding: 10
            }}
          >
            <Text style={{ color: text ? '#000' : '#aaa' }}>
              {text || 'Search'}
            </Text>
          </TouchableOpacity>
          {/*  <AnimatedPlaceholderInput /> */}
          <TouchableOpacity>
            {/* Voice Record Icon */}
            <Icon name="microphone" size={20} color="#aaa" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* More Filter Button */}
        <TouchableOpacity
          style={{
            marginLeft: 10,
            backgroundColor: '#f0f0f0',
            padding: 10,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center'
          }} onPress={() => navigation.navigate("MoreFilter", {
            "type": "Property for Rent"
          })}
        >
          <Icon name="tune" size={20} color="black" />
          {/* <Text style={{ marginLeft: 5 }}>Find More</Text> */}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showsearchmodal}
        animationType="slide"
        onRequestClose={() => setShowsearchmodal(false)}
      >
        <SearchModalScreen
          query={text}
          onClose={() => {
            setShowsearchmodal(false);
            setText('');
          }}
        />
      </Modal>


    </>
  );
};

export default SearchBar;
