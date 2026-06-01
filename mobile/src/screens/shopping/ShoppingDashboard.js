// App.js
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StatusBar,
  Image, Text, TouchableOpacity, Animated,
  Dimensions, StyleSheet
} from 'react-native';
import Header from './Layout/Header';
import CategoryMenu from './categories/CategoryMenu';
import Footer from './Layout/Footer';
import Slider from './slider/Slider';
import FlashSales from './FlashSales';
import ProductList from './ProductList';
import CategoryList from './categories/CategoryList';
import * as base from '../../component/global'
import api from '../../component/api';
import OfferBanner from './offer/OfferBanner';
import Offerlist from './offer/Offerlist';
import RecommandProduct from './RecommandProduct';
import DiscountPopup from './discount/DiscountPopup';
import { useNavigation } from '@react-navigation/native';
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";


export default function ShoppingDashboard() {
  const navigation = useNavigation()
  const [slider, setSlider] = useState("");
  const [showModalads, setShowModalads] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sliders, setSliders] = useState([]);
  const [category, setCategory] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [showPopup, setShowPopup] = useState(false);

  const discountData = [
    {
      title: "🔥 Mega Sale!",
      offer: "20% OFF on All Items",
      image: "https://i.ibb.co/5LPVz9P/sale1.jpg",
      price: 200,
      discount: 10
    },
    {
      title: "🎁 Buy 1 Get 1",
      offer: "Limited Time Offer!",
      image: "https://i.ibb.co/xLxdpQZ/sale2.jpg",
       price: 200,
      discount: 10
    },
    {
      title: "⚡ Flash Deal",
      offer: "Only Today!",
      image: "https://i.ibb.co/yYktSmK/sale3.jpg",
       price: 200,
      discount: 10
    },
  ];

  const fetchDashboardapi = async () => {
    setLoading(true);
    console.log('.....' + api.get("/api/product/dashboardHome"))
    try {
      const res = await api.get("/api/product/dashboardHome"); // fetch all sliders
      setSliders(res.data.sliders);
      setCategory(res.data.categories);
      setProductGroups(res.data.productGroups);
      console.log('..dashboard..' + res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching sliders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardapi();
    // show popup only once for new user
    setTimeout(() => setShowPopup(true), 1000);
  }, []);

  const checkShopmore = (title, products) => {
    navigation.navigate("GroupShopmore", {
      title,
      products
    });
  };

  const ShimmerCard = () => {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: "#f0f0f0" },
        ]}
      >
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.listImage}
        />
        <View style={styles.productDetails}>
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "70%", height: 14, borderRadius: 5, marginBottom: 6 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "40%", height: 12, borderRadius: 5, marginBottom: 4 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "60%", height: 12, borderRadius: 5 }} />
        </View>
      </View>
    );
  };


  return (
    <View style={{
      flex: 1, backgroundColor: '#fff',
      borderWidth: 0, borderColor: 'red'
    }}>
      <StatusBar barStyle="dark-content" />
      {productGroups.length === 0 && loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {[...Array(18)].map((_, index) => (
            <ShimmerCard key={index} />
          ))}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          style={{
            borderWidth: 0, borderColor: 'red',
            padding: 5
          }}>
          <Header />
          <View style={{
            marginTop: 6,
            borderWidth: 0, borderColor: 'red',
          }}>
            <Slider sliderdata={sliders} url={base.BASE_URL} />
          </View>
          <View style={{
            flexDirection: 'row',
            borderWidth: 0, borderColor: 'red',
          }}>
            <Offerlist />
          </View>
          <View style={{
            borderWidth: 0, borderColor: 'red',
          }}>
            <CategoryList categories={category} url={base.BASE_URL} />
          </View>
          <View style={{
            borderWidth: 0, borderColor: 'black', marginBottom: 50
          }}>
            {productGroups.map((group, index) => (
              <RecommandProduct
                key={index}
                title={group.showcasecategory ?? "Recommended"}
                url={base.BASE_URL}
                products={group.products} 
                onShopMore={() => checkShopmore(group)}  
              />
            ))}
          </View>
        </ScrollView>
      )}
      <DiscountPopup
        visible={showPopup}
        onClose={() => setShowPopup(false)}
        data={discountData}
      />
      <Footer />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", marginBottom: 50 },
  vListContent: { paddingVertical: 12 },
  categoryBlock: { paddingHorizontal: 12 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoryTitle: { fontSize: 15, fontWeight: "700", maxWidth: "80%" },

  hListContent: { paddingHorizontal: 4 },

  card: {
    //   width: 180,
    width: Dimensions.get("window").width * 0.30,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    padding: 8,
  },
  cardImage: { width: "100%", height: 110, borderRadius: 10, backgroundColor: "#eaeaea" },
  imgPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 8, fontSize: 13, fontWeight: "700" },
  cardMeta: { marginTop: 2, fontSize: 12, opacity: 0.7 },
  cardPrice: { marginTop: 6, fontSize: 13, fontWeight: "700", marginRight: 5 },
  gridImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  productDetails: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  }
});

