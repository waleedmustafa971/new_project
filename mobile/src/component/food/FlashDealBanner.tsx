import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
const FlashDealBanner = () => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.leftSection}>
        {/* Replace with your specific alarm clock image/icon */}
        <Icon name="alarm-bell" size={32} color="#E91E63" />
        <View style={styles.textContainer}>
          <Text style={styles.saveText}>Save 25%</Text>
          <Text style={styles.subText}>Flash Deals: limited time offers</Text>
        </View>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timeBox}><Text style={styles.timeText}>44</Text></View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.timeBox}><Text style={styles.timeText}>31</Text></View>
      </View>

      <TouchableOpacity style={styles.closeButton}>
        <Icon name="close" size={18} color="#333" />
      </TouchableOpacity>
    </View>
  );
};
export default FlashDealBanner

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFEBEE', // Light pink background
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    position: 'relative',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 10,
  },
  saveText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
  },
  subText: {
    fontSize: 12,
    color: '#C2185B',
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  timeBox: {
    backgroundColor: '#C2185B',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  colon: {
    marginHorizontal: 4,
    fontWeight: 'bold',
    color: '#C2185B',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});