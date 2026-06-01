import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as base from '../../component/global'
import { useNavigation } from '@react-navigation/native';
import DiscountRow from './discount/DiscountRow';


const RecommandProduct = ({ onShopMore, title, products, url }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.flashBar}>
        <Text style={styles.flashText}>{title}</Text>
        <TouchableOpacity onPress={onShopMore}
          style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.shopMore}>Shop More</Text>
          <Ionicons name="chevron-forward" size={15} color="#000" style={{
            marginTop: 2
          }} />
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item._id?.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        renderItem={({ item }) => {

          // -----------------------------
          // FIXED: Use item, NOT product
          // -----------------------------
          const price = item?.sizes?.[0]?.price || item.price || 0;

          const discount = item?.specialDiscount?.value || 0;
          const isDiscounted = item?.specialDiscount?.isDiscounted || false;

          // Final Price Calculation
          const finalPrice = isDiscounted
            ? price - (price * discount) / 100
            : price;

          return (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() =>
                navigation.navigate("SingleProduct", {
                  productData: item,
                })
              }
            >
              <Image
                source={{
                  uri: url + "/uploads/products/optimized/" + item.images?.[0],
                }}
                style={styles.productImage}
              />
              <View style={{ height: 40, borderWidth: 0,
                borderColor: 'red'
               }}>
              <Text numberOfLines={2} style={styles.productName}>
                {item.productname}
              </Text>
              </View>
              <DiscountRow finalPrice={finalPrice} oldPrice={price} currency={base.currency} discount={discount}/>
            </TouchableOpacity>
          );
        }}
      />

    </View>
  );
};

export default RecommandProduct;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12
  },
    newPrice: {
    fontSize: 12,
    marginLeft: 8
  },
  oldPrice: {
    fontSize: 14,
    textDecorationLine: "line-through",
    color: "red", marginLeft: 2,
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
  discountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },

  discountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff"
  },
  flashBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 5,
  },
  flashText: {
    fontWeight: 'bold',
    color: '#000', fontSize: 12
  },
  shopMore: {
    color: '#000',
    fontWeight: '500',
    fontSize: 12
  },
  productList: {
    paddingVertical: 8,
  },
  productCard: {
    width: 150,
    marginRight: 12,
    backgroundColor: '#ffffff', borderWidth: 1,
    borderColor: '#f2f2f2',
    borderRadius: 12,
    marginBottom: 5
    /* 
      shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, 
    */
  },
  productImage_off: {
    width: '100%',
    height: 100, borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    resizeMode: 'stretch'
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    resizeMode: "stretch"
  },

  productName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    padding: 5, borderWidth: 0, borderColor: 'red'
  },
  productPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000', marginLeft: 7,
    borderWidth: 0, borderColor: 'red',
    marginBottom: 3
  },
  productDiscount: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#ffcc00',
    paddingVertical: 2,
    borderRadius: 5,
    color: '#000', padding: 5,
    justifyContent: 'center',
    alignItems: 'center', alignSelf: 'center',
    marginRight: 3
  },

});
