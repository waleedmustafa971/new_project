import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

const SponsorScreen = ({ ad }) => {
  if (!ad) return null;

  const openLink = () => {
    if (ad.link) Linking.openURL(ad.link);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sponsoredText}>Sponsored · {ad.advertiser}</Text>

      {/* Format 1: Carousel */}
      {ad.type === 'carousel' && (
        <FlatList
          data={ad.products}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          )}
        />
      )}

      {/* Format 2: Single product */}
      {ad.type === 'single' && ad.product && (
        <TouchableOpacity onPress={openLink} style={styles.singleCard}>
          <Image source={{ uri: ad.product.image }} style={styles.singleImage} />
          <View style={{ padding: 8 }}>
            <Text style={styles.title}>{ad.product.title}</Text>
            <Text style={styles.price}>{ad.product.price}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Format 3: Grid */}
      {ad.type === 'grid' && (
        <View style={styles.gridContainer}>
          {ad.products.map((item) => (
            <View key={item.id} style={styles.gridCard}>
              <Image source={{ uri: item.image }} style={styles.gridImage} />
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridPrice}>{item.price}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={openLink} style={styles.ctaButton}>
        <Text style={styles.ctaText}>{ad.cta}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    marginVertical: 10,
    borderRadius: 10,
    elevation: 2,
  },
  sponsoredText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  card: {
    width: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  image: {
    width: 130,
    height: 100,
    borderRadius: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  price: {
    fontSize: 12,
    color: '#888',
  },
  singleCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: 180,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    padding: 8,
  },
  gridImage: {
    width: '100%',
    height: 100,
    borderRadius: 6,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  gridPrice: {
    fontSize: 12,
    color: '#777',
  },
  ctaButton: {
    marginTop: 12,
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default SponsorScreen;
