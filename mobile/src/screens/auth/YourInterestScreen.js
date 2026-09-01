import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as base from '../../component/global'
import Toast from 'react-native-toast-message';
import { HOME_RESET } from '../../navigation/homeRoute';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTERESTS = [
  'Food & Drink', 'Beauty & Style', 'Music', 'Fitness & Health', 'Vlogs',
  'Comedy', 'Sports', 'Entertainment Culture', 'Science & Education', 'Family',
  'Motivation & Advice', 'Dance', 'Travel', 'Gaming', 'Pets',
  'Automotive & Vehicle', 'DIY', 'Art', 'Anime & Comics', 'Life Hacks',
  'Outdoors', 'Oddly Satisfying', 'Home & Garden',
];

const YourInterestScreen = () => {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false)
  const navigation = useNavigation()
  const toggleSelect = (item) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const submitApply = async () => {

    const jsonValue = await AsyncStorage.getItem('userdata');
    if (jsonValue) {
      const userData = JSON.parse(jsonValue);
      console.log('userid: ', userData._id);
      setLoading(true);
      console.log(base.BASE_URL + '/apis/auth/update-interest');
      try {
        const response = await fetch(base.BASE_URL + '/apis/auth/update-interest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: userData._id,
            interest: JSON.stringify(selected)
          }),
        });

        const data = await response.json();
        console.log('Server Response:', data);

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }
        setLoading(false)
        if (data.message === "interested updated") {
          setLoading(false)
          navigation.reset(HOME_RESET);
        } else if (data.message == "All fields are required") {
          Toast.show({
            type: 'error',
            text1: 'All fields are required',
            position: 'bottom',
          });
          setLoading(false)
        }
        else if (data.message == "email not found") {
          Toast.show({
            type: 'error',
            text1: 'email are required',
            position: 'bottom',
          });
          setLoading(false)
        }
        else {
          Toast.show({
            type: 'error',
            text1: 'Failed to update',
            position: 'bottom',
          });
          setLoading(false)
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: error.message,
          position: 'bottom',
        });
        console.error('Error updating birthdate:', error);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Choose Your Interests</Text>
          <Text style={styles.subtitle}>Get better video recommendations</Text>
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={() => {
          navigation.reset(HOME_RESET)
        }}>
          <Text style={styles.skipText}>Skip</Text>
          <Icon name="navigate-next" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Interest Chips */}
      <ScrollView contentContainerStyle={styles.interestContainer}>
        <View style={styles.wrap}>
          {INTERESTS.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => toggleSelect(item)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Submit Button */}
      {
        loading ?
          <ActivityIndicator size="small" color="#000" />
          :
          <TouchableOpacity style={styles.submitButton} onPress={() => {
            submitApply()
          }}>
            <Icon name="check" size={24} color="#fff" />
          </TouchableOpacity>
      }

      <Toast />
    </View>
  );
};

export default YourInterestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  skipText: {
    color: '#000',
    fontSize: 14,
    marginRight: 2,
  },
  interestContainer: {
    paddingBottom: 100,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    margin: 4,
    backgroundColor: '#f9f9f9',
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
