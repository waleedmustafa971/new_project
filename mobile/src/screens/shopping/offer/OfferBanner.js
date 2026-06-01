import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { BounceIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function OfferBanner({ onPress }) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Animated.View entering={BounceIn} style={styles.iconContainer}>
        <Icon name="shopping" size={24} color="#fff" />
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.offerText}>20% OFF</Text>
        <Text style={styles.ctaText}>Shop Here ➜</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    height: 100,
    flexDirection: 'row',
    backgroundColor: '#FF6347', // Tomato color
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iconContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 30,
    marginRight: 12,
  },
  textContainer: {
    flexDirection: 'column',
  },
  offerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ctaText: {
    fontSize: 14,
    color: '#fff',
  },
});
