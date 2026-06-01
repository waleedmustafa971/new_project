import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Carousel from 'react-native-reanimated-carousel';
import * as base from '../../../component/global'

const productImages = [
  { id: 1, uri:  base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg' },
  { id: 2, uri:  base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg' },
  { id: 3, uri:  base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg' },
];


const productReviews = [
  { id: 1, user: 'John', comment: 'Great product!', rating: 4 },
  { id: 2, user: 'Anna', comment: 'Good value.', rating: 5 },
];

const vendor = {
  name: 'TechStore',
  image: base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg'
};

const moreFromStore = [
  { id: '1', name: 'USB Cable', image: base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg', price: '$5' },
  { id: '2', name: 'Charger', image: base.BASE_URL + '/uploads/ecommerce_slider/mic-3.jpg', price: '$10' },
];
const PADDING = 10;
const { width } = Dimensions.get('window');
const adjustedWidth = width - PADDING * 2;

const SingleProduct = () => {
  const discountPercent = (original, discounted) =>
    Math.round(((original - discounted) / original) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ScrollView>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity><Icon name="arrow-back" size={24} /></TouchableOpacity>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#aaa" style={{ marginRight: 4 }} />
            <Text style={{ flex: 1 }}>Search...</Text>
            <Icon name="mic" size={18} />
          </View>
          <Icon name="cart" size={24} style={styles.iconRight} />
          <TouchableOpacity>
            <Icon name="ellipsis-vertical" size={24} />
            {/* Dropdown logic can be added here */}
          </TouchableOpacity>
        </View>

        {/* Product Slider */}
        <Carousel
          loop
          width={adjustedWidth}
          height={200}
          data={productImages}
          scrollAnimationDuration={1000}
          renderItem={({ item }) => (
            <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} />
          )}
        />

        {/* Price and Discount */}
        <View style={styles.priceBox}>
          <Text style={styles.price}>$80</Text>
          <Text style={styles.originalPrice}>$100</Text>
          <Text style={styles.discount}>-{discountPercent(100, 80)}%</Text>
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Product Description</Text>
        <Text style={styles.description}>This is a great product with all features.</Text>

        {/* Return and Guarantee */}
        <View style={styles.guaranteeBox}>
          <Text>7 Days Return</Text>
          <Text>Guaranteed by 22-25 July</Text>
          <Icon name="chevron-forward" size={16} />
        </View>

        {/* Buyer Gallery */}
        <View style={styles.galleryHeader}>
          <Text>Buyer Gallery (10)</Text>
          <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {productImages.map((img) => (
            <Image key={img.id} source={{ uri: img.uri }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        {/* Ratings and Reviews */}
        <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
        <Text style={styles.rating}>⭐ 4/5</Text>
        {productReviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <Text style={styles.reviewUser}>{review.user}</Text>
            <Text>{'⭐'.repeat(review.rating)} - {review.comment}</Text>
          </View>
        ))}

        {/* As the Buyers */}
        <Text style={styles.sectionTitle}>Ask the Buyers</Text>
        <TouchableOpacity style={styles.chatBtn}><Text>Chat</Text></TouchableOpacity>

        {/* Vendor Info */}
        <View style={styles.vendorBox}>
          <Image source={{ uri: vendor.image }} style={styles.vendorImage} />
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <TouchableOpacity style={styles.visitStoreBtn}><Text>Visit Store</Text></TouchableOpacity>
        </View>

        {/* More from Store */}
        <Text style={styles.sectionTitle}>More from Store</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {moreFromStore.map((item) => (
            <View key={item.id} style={styles.storeItem}>
              <Image source={{ uri: item.image }} style={styles.storeImage} />
              <Text>{item.name}</Text>
              <Text>{item.price}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footerButtons}>
       <TouchableOpacity style={styles.iconButton}>
        <Icon name="storefront-outline" size={20} color="#333" />
        <Text style={styles.iconText}>Store</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton}>
        <Icon name="chatbubble-ellipses-outline" size={20} color="#333" />
        <Text style={styles.iconText}>Chat</Text>
      </TouchableOpacity>
       <TouchableOpacity style={styles.buyNowButton}>
        <Text style={styles.buyNowText}>Buy Now</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addToCartButton}>
        <Text style={styles.addToCartText}>Add to Cart</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-between'
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10
  },
  iconRight: { marginHorizontal: 5 },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10
  },
  price: { fontSize: 20, fontWeight: 'bold' },
  originalPrice: { textDecorationLine: 'line-through', marginLeft: 10 },
  discount: { color: 'red', marginLeft: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', margin: 10 },
  description: { marginHorizontal: 10, color: '#555' },
  guaranteeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10,
    alignItems: 'center'
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 10
  },
  galleryImage: { width: 100, height: 100, borderRadius: 10, marginRight: 10 },
  rating: { marginHorizontal: 10, fontSize: 14 },
  reviewItem: { marginHorizontal: 10, marginBottom: 10 },
  reviewUser: { fontWeight: 'bold' },
  chatBtn: {
    backgroundColor: '#eee',
    padding: 10,
    alignSelf: 'flex-start',
    marginHorizontal: 10,
    borderRadius: 5
  },
  vendorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    justifyContent: 'space-between'
  },
  vendorImage: { width: 40, height: 40, borderRadius: 20 },
  vendorName: { flex: 1, marginLeft: 10 },
  visitStoreBtn: { backgroundColor: '#ddd', padding: 6, borderRadius: 5 },
  storeItem: { marginHorizontal: 10, alignItems: 'center' },
  storeImage: { width: 80, height: 80, borderRadius: 10 },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
    position: 'absolute',
    bottom: 0,
    width: '100%'
  },
  viewAll: { color: 'blue' },
   buyNowButton: {
    backgroundColor: '#FF5A5F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buyNowText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addToCartButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addToCartText: {
    color: '#333',
    fontWeight: 'bold',
  },
});

export default SingleProduct;
