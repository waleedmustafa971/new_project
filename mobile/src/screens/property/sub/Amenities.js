import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const FEATURES = [
  { key: 'ac', name: 'Central A/C & Heating', icon: 'snow-outline' },
  { key: 'balcony', name: 'Balcony', icon: 'home-outline' },
  { key: 'gym', name: 'Private Gym', icon: 'barbell-outline' },
  { key: 'pool', name: 'Shared Pool', icon: 'water-outline' },
  { key: 'security', name: 'Security', icon: 'shield-checkmark-outline' },
  { key: 'windows', name: 'Double Glazed Windows', icon: 'layers-outline' },
  { key: 'kids', name: 'Kids Play Area', icon: 'happy-outline' },
  { key: 'maintenance', name: 'Maintenance Staff', icon: 'construct-outline' },
  { key: 'cctv', name: 'CCTV Security', icon: 'videocam-outline' },
  { key: 'cleaning', name: 'Cleaning Services', icon: 'broom-outline' },
  { key: 'bbq', name: 'Barbeque Area', icon: 'flame-outline' },
  { key: 'waste', name: 'Waste Disposal', icon: 'trash-outline' },
];

const FeatureItem = ({ name, icon }) => (
  <View style={styles.featureItem}>
    <Icon name={icon} size={18} color="#007AFF" style={styles.icon} />
    <Text style={styles.text}>{name}</Text>
  </View>
);

const Amenities = ({ data }) => {
  // Convert string array to object with key and icon
  const amenityData = data?.map((item, index) => ({
    key: `${index}`,
    name: item,
    icon: 'checkmark-circle-outline', // or any Ionicons icon you want
  }));

  return (
    <View>
      <Text style={{ fontSize: 14, marginBottom: 5 }}>
        Features & Amenities
      </Text>

      <FlatList
        data={amenityData}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <FeatureItem name={item.name} icon={item.icon} />}
        contentContainerStyle={styles.container}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 0, borderColor: 'green'
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 5,
    marginVertical: 6,
    borderRadius: 30,
    flex: 0.48, // two columns
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

export default Amenities;
