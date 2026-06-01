import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ExperienceItem = ({ logo, fromDate, toDate, description }) => {
  return (
    <View style={styles.container}>
      {/* Left: Logo */}
      <Image
        source={{ uri: logo }}
        style={styles.logo}
      />

      {/* Right: Experience Details */}
      <View style={{ flex: 1 }}>
        {/* Dates Row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>From: {fromDate}</Text>
          <Text style={styles.dateText}>To: {toDate}</Text>
        </View>

        {/* Job Description */}
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

export default ExperienceItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 10,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dateText: {
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#555',
  },
});
