import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base from '../../../component/global'
import api from '../../../component/api'

const PropertyProfile = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    handleLogin()
  }, [])

  const handleLogin = async () => {
    const username = await AsyncStorage.getItem("username");
    setUsername(username)
    try {
      const response = await api.get(`/apis/auth/getProfile?email=${username}`);
      // response.data will have your user data
      console.log('User Profile:', response.data.user);
      setUser(response.data.user)
      return response.data.user;
    } catch (error) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      return null;
    }
  }
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Row */}
      <View style={styles.profileSection}>
        {/* Profile Image */}
        <Image
          source={{
            uri: user?.image || 'https://via.placeholder.com/80?text=Guest',
          }}
          style={styles.avatar}
        />

        {/* Info */}
        <View style={styles.infoSection}>
          {username ? (
            <>
              <Text style={styles.name}>{user?.name}</Text>
              <View style={styles.verifiedRow}>
                <Icon name="verified" size={16} color="green" />
                <Text style={styles.verifiedText}>Profile Verified</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>Hi, Guest</Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginText}>Sign in for a better experience</Text>
              </TouchableOpacity>
            </>
          )}

        </View>

        {/* Arrow */}
        {user && (
          <TouchableOpacity onPress={() => alert('Edit Profile')}>
            <Entypo name="chevron-right" size={24} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {/* Menu Items */}
      <TouchableOpacity style={styles.option} onPress={() => {
        navigation.navigate("MyAds")
      }}>
        <FontAwesome5 name="clipboard-list" size={20} color="gray" />
        <Text style={styles.optionText}>My Ads</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => {
        navigation.navigate("PropertyUserhistory")
      }}>
        <Ionicons name="time-outline" size={20} color="gray" />
        <Text style={styles.optionText}>My History</Text>
      </TouchableOpacity>

      <View style={styles.option}>
        <Ionicons name="language" size={20} color="gray" />
        <Text style={styles.optionText}>Languages</Text>
      </View>

      <View style={styles.option}>
        <Icon name="rss-feed" size={20} color="gray" />
        <Text style={styles.optionText}>Blogs</Text>
      </View>

      <TouchableOpacity style={styles.option} onPress={handleLogout}>
        <Icon name="logout" size={20} color="gray" />
        <Text style={styles.optionText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PropertyProfile;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eee',
  },
  infoSection: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  verifiedText: {
    marginLeft: 5,
    color: 'green',
    fontSize: 14,
  },
  loginText: {
    color: '#007bff',
    marginTop: 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  optionText: {
    marginLeft: 15,
    fontSize: 16,
  },
});
