import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const FONT_SIZE = isTablet ? 14 : 12;

const SuccessScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>

      {/* Success Avatar */}
      <View style={styles.iconWrapper}>
        <Icon name="check" size={48} color="#16a34a" />
      </View>

      {/* Title */}
      <Text style={styles.title}>Post Added Successfully</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Your ad has been posted and is now live.
      </Text>

      {/* Home Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Icon name="home" size={18} color="#fff" />
        <Text style={styles.homeText}>Go to Home</Text>
      </TouchableOpacity>

    </View>
  );
};

export default SuccessScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: FONT_SIZE + 6,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: FONT_SIZE,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18,
  },

  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
    gap: 8,
  },

  homeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZE,
  },
});
