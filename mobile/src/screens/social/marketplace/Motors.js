import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Motors = ({ propertybuy }) => {

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        
        {/* Heart Icon */}
        <TouchableOpacity style={styles.heartIcon}>
          <Icon name="favorite-border" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Discount Tag */}
        <View style={styles.discountTag}>
          <Text style={styles.discountText}>{item.discount} OFF</Text>
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
      </View>
    </View>
  );

  return (
    <View>
      {/* Section Header */}
      <View style={styles.flashSalesHeader}>
        <Text style={styles.flashSalesTitle}>Motors</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={propertybuy}
        keyExtractor={item => item.id}
        renderItem={renderProductItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
      />
    </View>
  );
};

export default Motors;

const styles = StyleSheet.create({
  flashSalesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  flashSalesTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAll: { color: '#007bff', fontWeight: '500' },

  productList: { paddingVertical: 16, paddingLeft: 16 },
  productCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: { position: 'relative' },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    padding: 6,
  },
  discountTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'red',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { color: '#fff', fontSize: 12 },

  productInfo: { paddingHorizontal: 10, paddingVertical: 8 },
  productName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  productPrice: { fontSize: 14, color: '#007bff', fontWeight: '600' },
});
