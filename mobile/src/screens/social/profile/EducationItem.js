import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const EducationItem = ({ logo, school, degree, fromDate, toDate, description }) => {
  return (
    <View style={styles.container}>
    
      <View style={styles.card}>
        {/* Left: School Logo */}
        <Image
          source={{ uri: logo }}
          style={styles.logo}
        />

        {/* Right: Details */}
        <View style={styles.details}>
          <Text style={styles.school}>{school}</Text>
          <Text style={styles.degree}>{degree}</Text>

          <View style={styles.dates}>
            <Text style={styles.dateText}>From: {fromDate}</Text>
            <Text style={styles.dateText}>To: {toDate}</Text>
          </View>

          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </View>
  );
};

export default EducationItem;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  card: {
    flexDirection: 'row',
    padding: 5,
    //backgroundColor: '#f9f9f9',
   /*  borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, */
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  details: {
    flex: 1,
  },
  school: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  degree: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  description: {
    fontSize: 13,
    color: '#444',
  },
});
