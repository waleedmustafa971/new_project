import React, { useState } from "react";
import {
  View,Text,Image,
  FlatList,TouchableOpacity,ScrollView,StyleSheet,Dimensions,Modal, Platform } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../../navigation/navigation";
import * as base from "../../../component/global";
import { useCart } from "../context/CartContext";
import Toast from 'react-native-toast-message';
const { width } = Dimensions.get("window");

type SingleProductRoute = RouteProp<RootStackParamList, "SingleProduct">;
type SingleProductNav = StackNavigationProp<RootStackParamList, "SingleProduct">;

interface Props {
  navigation: SingleProductNav;
  route: SingleProductRoute;
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
  _id: string;
  productname: string;
  price: number;
  stock: number;
  sizes: SizeType[];
  selectedSize?: SizeType;
  vendorid?: string;
  [key: string]: any; // allows extra backend fields

};
type SizeType = {
  size: string;
  price: number;
  stock: number;
  _id: string;
};


const SingleProduct: React.FC<Props> = ({ navigation, route }) => {
  //  const product = route.params.productData;
  const product: Product = route.params.productData as Product; // ✅ Cast to Product
  const [selectedImage, setSelectedImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<SizeType | null>(null);

  const { addToCart } = useCart();

  const images: string[] = product.images || [];
  const price: number = product.sizes?.[0]?.price || product.price;
  const discount: number = product.specialDiscount?.value || 0;
  const isDiscounted: boolean = product.specialDiscount?.isDiscounted || false;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  
  const basePrice =
  selectedSize?.price ??
  product.sizes?.[0]?.price ??
  product.price;

  const finalPrice = isDiscounted
  ? basePrice - (basePrice * discount) / 100
  : basePrice;
const formatPrice = (value: number) => {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

  const share = require('../../../assets/Share.png');

  const handleAddToCart = () => {
    if(hasSizes)
    {
    if (!selectedSize) {
      console.log('Toast triggered: no size selected');
      Toast.show({
        type: 'error',
        text1: 'Please select a size',
        position: 'top',
      });
      return;
    }
    }
    if(hasSizes)
    {
      const productWithSelectedSize: ProductType = {
      ...product,
      sizes: [selectedSize],          // only selected size
      price: selectedSize.price,      // always use size price
      stock: selectedSize.stock,      // ✅ FIXED
    };

    console.log('...product added to cart...', productWithSelectedSize);

    addToCart(productWithSelectedSize);
    }
    else
    {
      const productWithSelectedSize: ProductType = {
      ...product,
      sizes: [],          // only selected size
      price: product.price,      // always use size price
      stock: product.stock,      // ✅ FIXED
    };

    console.log('...product added to cart...', productWithSelectedSize);

    addToCart(productWithSelectedSize);
    }

    

    Toast.show({
      type: 'success',
      text1: 'Item is added in cart',
      position: 'bottom',
    });

    setTimeout(() => {
      navigation.navigate('ViewCart');
    }, 400);
  };


  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* ======================================
            IMAGE SLIDER WITH INDICATOR
      ======================================= */}
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(
              e.nativeEvent.contentOffset.x / width
            );
            setSelectedImage(idx);
          }}
        >
          {images.map((img, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={() => setFullscreen(true)}
            >
              <Image
                source={{ uri: `${base.BASE_URL}/uploads/products/optimized/${img}` }}
                style={styles.mainImage}
              />

              {/* 🔵 IMAGE COUNT BADGE (top-right) */}
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>
                  {index + 1} / {images.length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ◀️ BACK BUTTON */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* ●●● DOT INDICATORS */}
        <View style={styles.dotWrapper}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                selectedImage === index && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </View>

      {/* FULLSCREEN MODAL */}
      <Modal visible={fullscreen} transparent>
        <View style={styles.fullscreenWrapper}>
          <TouchableOpacity
            onPress={() => setFullscreen(false)}
            style={styles.closeFullscreen}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: `${base.BASE_URL}/uploads/products/optimized/${images[selectedImage]}` }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: 10 }}>
        {/* PRICE, DISCOUNT & SHARE */}
        <View style={styles.priceRow}>
        {/*   <View style={{ flexDirection: 'row' }}>
            <Text style={styles.newPrice}>
              {base.currency} {isDiscounted ? price - (price * discount) / 100 : price}
            </Text>
            {isDiscounted && (
              <Text style={styles.oldPrice}>{price}</Text>
            )}
            {isDiscounted && (
              <Text style={styles.discountBadge}>
                {discount}% OFF
              </Text>
            )}
          </View> */}
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text style={styles.newPrice}>
    {base.currency} {formatPrice(finalPrice)}
  </Text>

  {isDiscounted && (
    <Text style={styles.oldPrice}>
      {basePrice.toFixed(2)}
    </Text>
  )}

  {isDiscounted && (
    <Text style={styles.discountBadge}>
      {discount}% OFF
    </Text>
  )}
</View>

          <TouchableOpacity>
            <Image source={share} style={{ width: 30, height: 30 }} />
          </TouchableOpacity>
        </View>

        {/* PRODUCT NAME */}
        <Text style={styles.productName}>{product.productname}</Text>

        {/* SIZE SELECTOR */}
        <Text style={styles.sectionTitle}>Select Size</Text>

        <View style={styles.sizeRow}>
          {product.sizes?.map((s: any) => {
            const isSelected = selectedSize?._id === s._id;

            return (
              <TouchableOpacity
                key={s._id}
                style={[
                  styles.sizeBox,
                  isSelected && styles.sizeBoxActive
                ]}
                onPress={() => setSelectedSize(s)}
              >
                <Text
                  style={[
                    styles.sizeText,
                    isSelected && { color: "#fff" }
                  ]}
                >
                  {s.size}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/*           {product.sizes?.map((s: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.sizeBox,
                selectedSize === s.size && styles.sizeBoxActive
              ]}
              onPress={() => setSelectedSize(s)}
            >
              <Text
                style={[
                  styles.sizeText,
                  selectedSize === s.size && { color: "#fff" }
                ]}
              >
                {s.size}
              </Text>
            </TouchableOpacity>
          ))}
 */}

        </View>

        {/* THUMBNAILS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {images.map((img, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImage(index)}
              style={[
                styles.thumbWrapper,
                selectedImage === index && styles.activeThumb
              ]}
            >
              <Image
                source={{ uri: `${base.BASE_URL}/uploads/products/optimized/${img}` }}
                style={styles.thumbnail}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* DESCRIPTION */}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descText}>{product.description}</Text>

        {/* RATINGS */}
        <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
        <Text style={{ color: "#777", fontSize: 13 }}>No reviews yet.</Text>

      </ScrollView>

      {/* ======================================
               BOTTOM ACTION BAR
      ======================================= */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.loveBtn}>
          <Icon name="heart-outline" size={25} color="#FF5790" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addCartBtn}
          onPress={handleAddToCart}
        >
          <Text style={styles.addCartText}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buyNowBtn}>
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default SingleProduct;


const styles = StyleSheet.create({

  mainImage: {
    width: width,
    aspectRatio: 1,  // makes it perfectly square
    borderRadius: 8,
    resizeMode: "stretch"   // or "contain"
  },
  imageCountBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  dotWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: -15,
    marginBottom: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: "#000",
    width: 10,
  },

  backBtn: {
    position: "absolute",
    top: 20,
    left: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 50
  },

  fullscreenWrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center"
  },

  fullscreenImage: {
    width: "100%",
    height: "80%"
  },

  closeFullscreen: {
    position: "absolute",
    top: 40,
    right: 20
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 0,
    borderColor: '#000'
  },
  oldPrice: {
    fontSize: 22,
    textDecorationLine: "line-through",
    color: "red", marginLeft: 5,
    fontWeight: 'bold'
  },
  newPrice: {
    fontSize: 22,
    fontWeight: "bold"
  },
  discountBadge: {
    backgroundColor: "#FF3D3D",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 12,
    marginTop: 2,
    alignSelf: "flex-start",
    marginLeft: 7
  },
  productName: {
    fontSize: 14
  },
  sectionTitle: {
    fontSize: 13,
    marginTop: 3, marginBottom: 4
  },
  sizeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3
  },
  sizeBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10
  },
  sizeBoxActive: {
    backgroundColor: "#000",
    borderColor: "#000"
  },
  sizeText: {
    fontSize: 14,
    color: "#000"
  },
  thumbWrapper: {
    marginRight: 10,
    borderRadius: 10,
    padding: 2
  },
  activeThumb: {
    borderWidth: 0,
    borderColor: "#004CFF"
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    resizeMode: 'stretch'
  },
  descText: {
    paddingHorizontal: 0,
    fontSize: 12,
    color: "#444",
    marginTop: 5,
    textAlign: 'justify',
    borderWidth: 0, borderColor: '#000'
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    elevation: 20,
    borderTopWidth: 1,
    borderColor: "#eee"
  },

  loveBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF5790",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },

  addCartBtn: {
    flex: 1,
    backgroundColor: "#FF5790",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginRight: 10
  },

  addCartText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  },

  buyNowBtn: {
    flex: 1,
    backgroundColor: "#004CFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12
  },

  buyNowText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  }
});
