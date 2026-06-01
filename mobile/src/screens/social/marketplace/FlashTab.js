import { View, Text, FlatList, TouchableOpacity, StyleSheet,
    Image
 } from 'react-native'
import React from 'react'

const FlashTab = ({ products }) => {

    const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
        <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.discountTag}>
            <Text style={styles.discountText}>{item.discount} OFF</Text>
        </View>
        </View>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
    </View>
    );
    
  return (
    <View>
            {/* Flash Sales */}
            <View style={styles.flashSalesHeader}>
              <Text style={styles.flashSalesTitle}>Flash Sales</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
      
            {/* Product List */}
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              renderItem={renderProductItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productList}
            />
      
    </View>
  )
}

export default FlashTab

const styles = StyleSheet.create({
  flashSalesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20 },
  flashSalesTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAll: { color: '#007bff' },

  productList: { paddingVertical: 16, paddingLeft: 16 },
  productCard: { width: 150, backgroundColor: '#f9f9f9', borderRadius: 12, marginRight: 16, paddingBottom: 10 },
  imageContainer: { position: 'relative' },
  productImage: { width: '100%', height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  discountTag: { position: 'absolute', top: 8, right: 8, backgroundColor: 'red', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: 12 },

  productName: { fontSize: 14, fontWeight: 'bold', marginTop: 8, paddingHorizontal: 8 },
  productPrice: { fontSize: 14, color: '#007bff', paddingHorizontal: 8, marginTop: 4 },
});
