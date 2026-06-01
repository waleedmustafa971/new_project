import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import * as base from "../../component/global";
import { useNavigation, NavigationProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 40) / 2;

type RootStackParamList = {
  Home: undefined;
  Popularbrandsall: { lat: string, long: string, type: string };
  RestaurantScreen: { restaurant_id: string };
};

const BrandList = ({ brands = [], latitude, longitude }: any) => {  // Taking only the first 4 or 6 brands to keep the grid clean without infinite scrolling
  const displayBrands = brands.slice(0, 4);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Popular Brands</Text>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => {
          navigation.navigate("Popularbrandsall", {
            lat: latitude,
            long: longitude,
            type: 'all',
          });
        }}>
          <Text style={styles.viewAllText}>View all</Text>
          <Feather name="chevron-right" size={16} color="#E91E63" />
        </TouchableOpacity>
      </View>

      {/* GRID SECTION */}
      <View style={styles.grid}>
        {displayBrands.map((item: any) => (
          <TouchableOpacity key={item._id} style={styles.brandCard}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: base.BASE_URL + '/uploads/brand/optimized/' + item.image }}
                style={styles.logo}
              />
            </View>
            <View style={styles.brandInfo}>
              <Text style={styles.brandName} numberOfLines={1}>
                {item.name} 
              </Text>
              <Text style={styles.brandMeta}>Top Rated</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
    marginRight: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  brandCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 3,
  },
  logoContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandInfo: {
    marginLeft: 12,
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  brandMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});

export default BrandList;