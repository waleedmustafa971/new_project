import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import api from '../../../component/api';// Import your axios instance
import * as base from '../../../component/global'; // Import your BASE_URL
import { useRoute, RouteProp } from "@react-navigation/native";
const { width } = Dimensions.get('window');
import { useCart } from '../../shopping/context/CartContextFood';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

interface Category {
  _id: string;
  category_id: {
    _id: string;
    category_name: string;
    description: string;
  };
}
interface Product {
  _id: string;
  productname: string;
  description: string;
  price: number;
  images: string[];
  sizes?: {
    size: string;
    price: number;
  }[];
  specialDiscount?: {
    value: number;
    isDiscounted: boolean;
  };
}

type ProductType = {
  userId: string;
  //_id: string;   // ✅ correct key
  productId: string;
  vendorId: string;
  productname: string;
  currency: string;
  images: string;
  date_and_time: string;
  price: number;
  discount: number;
  finalamount: number;
  qty: number;
  status: string;
  modulename: string;
  stock: number;
};

type SizeType = {
  size: string;
  price: number;
  stock: number;
  _id: string;
};

interface FoodItem {
  _id: string;
  item_name: string;
  description: string;
  price: number;
  discount: number;
  final_price: number;
  item_image: string;
  category_id: {
    _id: string;
    category_name: string;
  };
}

interface RestaurantData {
  restaurant: {
    restaurant_name: string;
    restaurant_image: string;
    manual_address: string;
    overall_rating: string;
  };
  restaurant_categories: Category[];
  data: FoodItem[];
}
type RootStackParamList = {
  Home: undefined;
  FoodViewcart: undefined;
  RestaurantScreen: { restaurant_id: string,
     prepTime: number,
     deliveryTime: number,
     totalTime: number
   }; 
};
type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "RestaurantScreen">;

type RestaurantScreenRouteProp = RouteProp<RootStackParamList, 'RestaurantScreen'>;

const RestaurantScreen: React.FC = () => {
  const navigation = useNavigation<ViewCartScreenProp>();
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [foodData, setFoodData] = useState<RestaurantData | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const route = useRoute<RestaurantScreenRouteProp>();
  const [userid, setUserid] = useState("");
  const { restaurant_id, prepTime, deliveryTime, totalTime } = route.params;
  const { addToCart, cartCount, cartTotal } = useCart();

  useEffect(() => {
    fetchRestaurantDetails();
  }, []);

  const fetchRestaurantDetails = async () => {
    const jsonValue = await AsyncStorage.getItem('userdata');
    if (jsonValue) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      try {
        // const restaurantId = "694d1fca7039b234a68cf882";
        const response = await api.get(`/api/food/get-items-by-resturants?restaurant_id=${restaurant_id}`);
        setFoodData(response.data);
        if (response.data.restaurant_categories?.length > 0) {
          setActiveCategory(response.data.restaurant_categories[0].category_id._id);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFCC00" />
      </View>
    );
  }

  if (!foodData) return null;

  const handleCart = (item: any) => {
   // console.log('...product added to cart...', item);
    const productWithSelectedSize: ProductType = {
      productId: item?._id,
      productname: item?.item_name,
      images: item?.item_image,
      price: item?.final_price.toFixed(2),
      stock: 0,
      modulename: 'food',
      qty: 1,
      vendorId: item?.restaurant_id?._id,
      userId: userid,
      currency: 'AED',
      date_and_time: '',
      discount: item.discount,
      finalamount: item.final,
      status: 'not yet submit'
    };
    console.log('...product added to cart...', productWithSelectedSize);
    addToCart(productWithSelectedSize);
    Toast.show({
      type: 'success',
      text1: 'item added to cart',
      position: 'top',
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView stickyHeaderIndices={[2]} ref={scrollRef}>
        <View>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `${base.BASE_URL}${foodData?.restaurant?.restaurant_image}` }}
              style={styles.headerImg}
            />
            <TouchableOpacity style={styles.iconheader} onPress={() => navigation.goBack()}>
              <FontAwesome name="arrow-left" size={15} color="#000"
                style={{ padding: 10 }} />
            </TouchableOpacity>
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantTitle}>{foodData.restaurant?.restaurant_name}</Text>
            <Text style={styles.restaurantSub}>{foodData.restaurant?.manual_address}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>⭐ {foodData.restaurant?.overall_rating}</Text>
              <Text style={styles.statText}>⏱️ {foodData?.prepTime} {foodData?.deliveryTime} {totalTime} mins delivery</Text>
              <Text style={styles.statText}>🚚 Free Delivery</Text>
            </View>
          </View>
        </View>

        {/* 2. Promo UI */}
       {/*  <View style={styles.promoRow}>
          <View style={styles.promoBox}>
            <Text style={styles.promoTitle}>AED 100 new user vouchers</Text>
            <Text style={styles.promoSub}>Log in to claim</Text>
          </View>
          <View style={[styles.promoBox, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.promoTitle, { color: '#2E7D32' }]}>Free delivery</Text>
            <Text style={styles.promoSub}>Min. AED 25</Text>
          </View>
        </View> */}

        {/* 3. Category Tabs (Sticky) */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {foodData.restaurant_categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                onPress={() => setActiveCategory(cat.category_id._id)}
                style={[
                  styles.tab,
                  activeCategory === cat.category_id._id && styles.activeTab
                ]}
              >
                <Text style={[
                  styles.tabText,
                  activeCategory === cat.category_id._id && styles.activeTabText
                ]}>
                  {cat.category_id.category_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 4. Filtered List */}
        <View style={styles.listSection}>
          {foodData?.data
            .filter(item => item.category_id._id === activeCategory)
            .map((item) => (
              <View key={item._id} style={styles.foodItemCard}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.foodName}>{item.item_name}</Text>
                  <Text style={styles.foodDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}> 
                      {item.final_price.toFixed(2)}
                      </Text>
                    {item.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{item.discount}% off</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View>
                  <Image
                    source={{ uri: `${base.BASE_URL}${item.item_image}` }}
                    style={styles.foodThumb}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={() => {
                    handleCart(item)
                  }}>
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          }
        </View>
      </ScrollView>

      {/* Bottom Floating Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartInfo} onPress={() => {
          navigation.navigate("FoodViewcart"); //how to add here cart
        }}>
          {cartCount > 0 && (
            <Text style={styles.cartPrice}>
               {cartCount} items | AED {cartTotal.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => {
          navigation.navigate("FoodViewcart"); //how to add here cart
        }}>
          <Text style={styles.checkoutText}>Check out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImg: { width: '100%', height: 180 },
  restaurantInfo: { padding: 15 },
  restaurantTitle: { fontSize: 13, fontWeight: 'bold' },
  restaurantSub: { color: '#777', fontSize: 11, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  statText: { fontWeight: '600', fontSize: 12 },
  promoRow: { flexDirection: 'row', padding: 15, gap: 10 },
  promoBox: {
    flex: 1, backgroundColor: '#FFF3E0', padding: 10,
    borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FF9800'
  },
  promoTitle: { fontSize: 12, fontWeight: 'bold', color: '#E65100' },
  promoSub: { fontSize: 10, color: '#666' },

  categoryContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tab: { paddingVertical: 12, marginRight: 25 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#000' },
  tabText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#000' },

  listSection: { padding: 15 },
  foodItemCard: { flexDirection: 'row', marginBottom: 25, alignItems: 'center' },
  foodName: { fontSize: 12, fontWeight: 'bold' },
  foodDesc: { color: '#888', fontSize: 11, marginVertical: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceText: { fontSize: 12, fontWeight: 'bold', color: '#FF5722' },
  discountBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#C62828', fontSize: 10, fontWeight: 'bold' },

  foodThumb: { width: 90, height: 90, borderRadius: 12 },
  addBtn: {
    position: 'absolute', bottom: -5, right: -5, backgroundColor: '#fff',
    width: 28, height: 28, borderRadius: 14, elevation: 4,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee'
  },
  addBtnText: { fontSize: 18, color: '#FFCC00', fontWeight: 'bold' },

  bottomBar: {
    padding: 15, borderTopWidth: 1, borderColor: '#eee',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  cartInfo: { flex: 1 },
  cartPrice: { fontSize: 12, fontWeight: 'bold' },
  cartDelivery: { fontSize: 12, color: '#777' },
  checkoutButton: {
    backgroundColor: '#FFD600', paddingHorizontal: 35,
    paddingVertical: 12, borderRadius: 10
  },
  checkoutText: { fontWeight: 'bold', fontSize: 12 },
  imageContainer: {
    position: 'relative',
  },
  iconheader: {
    position: 'absolute',
    top: 20,     // adjust depending on status bar
    left: 15,
    zIndex: 10, backgroundColor: '#ffffff',
    borderRadius: '50%'
  },

});

export default RestaurantScreen;