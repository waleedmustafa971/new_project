import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as base from '../../component/global'
import { useNavigation } from '@react-navigation/native';
const vouchers = [
  { title: '7.7 Exclusive Voucher', bgColor: '#fcd34d' },
  { title: '€80 Free Shopping', bgColor: '#86efac' },
  { title: 'Collection All', bgColor: '#a5b4fc' },
];

const products = [
  {
    id: '1',
    name: 'youtube-mic',
    image: '/uploads/ecommerce_slider/mic-3.jpg',
    price: '40',
    discount: '10',
  },
  {
    id: '2',
    name: 'Watch',
    image: '/uploads/ecommerce_slider/watch.jpg',
    price: '80',
    discount: '20',
  },
  {
    id: '3',
    name: 'Youtube Mic',
    image: '/uploads/ecommerce_slider/youtube-mic-2.jpg',
    price: '60',
    discount: '30',
  },
  {
    id: '4',
    name: 'Sneakers',
    image: '/uploads/ecommerce_slider/youtube-mic-2.jpg',
    price: '60',
    discount: '25',
  },
  {
    id: '5',
    name: 'Sneakers',
    image: '/uploads/ecommerce_slider/youtube-mic-2.jpg',
    price: '60',
    discount: '25',
  },
  {
    id: '6',
    name: 'Sneakers',
    image: '/uploads/ecommerce_slider/youtube-mic-2.jpg',
    price: '60',
    discount: '25',
  },
  {
    id: '7',
    name: 'Sneakers',
    image: '/uploads/ecommerce_slider/youtube-mic-2.jpg',
    price: '60',
    discount: '25',
  },
];

const FlashSalesSection = ({ onShopMore }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.flashBar}>
        <Text style={styles.flashText}>🔥 Flash Sales - Ends in 02:15:48</Text>
        <TouchableOpacity onPress={onShopMore} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.shopMore}>Shop More</Text>
            <Ionicons name="chevron-forward" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <TouchableOpacity onPress={() => {
              navigation.navigate("SingleProduct")
            }}>
            <Image source={{ uri: base.BASE_URL + item.image }} style={styles.productImage} />
             </TouchableOpacity>
            <View style={{
             /*  backgroundColor: '#f2f2f2', */
              width: '100%', flexDirection: 'row',
              justifyContent: 'space-between'
            }}>
            <Text style={styles.productPrice}>AED {item.price}</Text>
            <Text style={styles.productDiscount}>
                  {Math.round(((item.price - item.discount) / item.price) * 100)} % OFF
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default FlashSalesSection;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // Silver tone
    borderRadius: 12,
    margin: 12,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  voucherBox: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  voucherText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  flashBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
   /*  backgroundColor: '#fee2e2', */
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  flashText: {
    fontWeight: 'bold',
    color: '#b91c1c', fontSize: 18
  },
  shopMore: {
    color: '#000',
    fontWeight: '500', 
    fontSize: 16
  },
  productList: {
    paddingVertical: 8,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: 160,
    marginRight: 10,
    alignItems: 'center',
    elevation: 2,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 6,
    marginBottom: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
  productDiscount: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
    backgroundColor: '#efbe02',
    borderRadius: 5, padding: 5
  },
});
