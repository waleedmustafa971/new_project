import Feather from "react-native-vector-icons/Feather";
import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as base from "../../component/global";
import Colors from "../../component/constants/color/color";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from "@react-navigation/native";

// 1. Define the screens and their params
type RootStackParamList = {
  Home: undefined;
  ShowAAllresturant: { lat: string, long: string, type: string };
  RestaurantScreen: { restaurant_id: string,
     prepTime: number,
     deliveryTime: number,
     totalTime: number
   }; 
};

const RestaurantList = ({ restaurants = [], title, latitude, longitude }: any) => {
  const topTwo = restaurants.slice(0, 2);
  // const navigation = useNavigation()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  if (topTwo.length === 0) return null;
  const prepTime = restaurants?.prep_time || 15;
  const deliveryTime = parseInt(restaurants?.delivery_time_text) || 0;
  const totalTime = prepTime + deliveryTime;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.arrowCircle} onPress={() => {
          if (title == "Popular Restaurants") {
            navigation.navigate("ShowAAllresturant", {
              lat: latitude,
              long: longitude,
              type: "popular"
            })
          } else {
            navigation.navigate("ShowAAllresturant", {
              lat: latitude,
              long: longitude,
              type: "discount"
            })
          }

        }}>
          <Feather name="chevron-right" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* ===== LIST ===== */}
      <View style={styles.row}>
        {topTwo.map((item: any) => (
          <TouchableOpacity key={item._id}
            style={styles.card} onPress={() => {
              navigation.navigate("RestaurantScreen", {
                "restaurant_id": item._id,
                "prepTime": prepTime,
                "deliveryTime": deliveryTime,
                "totalTime": totalTime
              })
            }}>
            {/* Image Section with Heart & Ad Badge */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: base.BASE_URL + item.restaurant_image }}
                style={styles.image}
              />
              <TouchableOpacity style={styles.favoriteBtn}>
                <Feather name="heart" size={16} color="#000" />
              </TouchableOpacity>
              {/* Conditional Ad Badge */}
              <View style={styles.adBadge}>
                <Text style={styles.adText}>Ad</Text>
              </View>
            </View>

            {/* Restaurant Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.restaurant_name}
                </Text>
                <View style={styles.ratingBox}>
                  <FontAwesome name="star" size={12} color="#FF9800" />
                  <Text style={styles.ratingText}> 4.2 <Text style={styles.countText}>(2000+)</Text></Text>
                </View>
              </View>
              <View style={styles.subInfo}>
                {item?.distance_text}, {item?.delivery_time_text}
                <Text style={{ fontSize: 10 }}>
                  ⏱️ {totalTime} mins delivery
                </Text>

                <Text style={{ color: "#666", fontSize: 10 }}>
                  ({prepTime} min prep + {deliveryTime} min away)
                </Text>
              </View>
              {
                item?.offerpercent ?
                  <View style={styles.deliveryRow}>
                    <MaterialCommunityIcons name="moped" size={16} color="#555" />
                    <Text style={styles.deliveryText}>
                      <Text style={styles.strikethrough}>{item?.offerpercent}</Text>
                      <Text style={styles.freeText}> Free for first order</Text>
                    </Text>
                  </View> : null
              }


              {
                item?.offerpercent > 0 ?
                  <>
                    <View style={styles.promoContainer}>
                      <View style={styles.promoBadge}>
                        <MaterialCommunityIcons name="ticket-percent" size={12} color="#D81B60" />
                        <Text style={styles.promoText}> {item?.offerpercent}% off </Text>
                      </View>
                    </View>
                  </> : null
              }
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#333',
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 20,
  },
  adBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  info: {
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    flex: 0.6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.4,
    justifyContent: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
  },
  countText: {
    color: '#888',
    fontWeight: '400',
  },
  subInfo: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deliveryText: {
    fontSize: 11,
    marginLeft: 4,
    color: '#444',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  freeText: {
    color: '#D81B60',
    fontWeight: 'bold',
  },
  promoContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  promoBadge: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  promoText: {
    fontSize: 10,
    color: '#D81B60',
    fontWeight: 'bold',
  },
});

export default RestaurantList;