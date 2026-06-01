import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Header = ({ navigation, onSearchPress }) => {
  return (
    <View style={styles.container}>
      {/* Left */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Icon name="chevron-left" size={28} color="#222" />
      </TouchableOpacity>

      {/* Center */}
      <Text style={styles.title}>Motors</Text>

      {/* Right */}
      <View style={styles.rightContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSearchPress}
        >
          <Icon name="magnify" size={22} color="#222" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.postButton}
          onPress={() => navigation.navigate('MotorsAds')}
        >
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.postText}>Ads</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;
const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },

  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  postText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
