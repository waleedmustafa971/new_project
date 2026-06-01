import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { BASE_URL } from "../../../component/global";
import { useNavigation, NavigationProp } from "@react-navigation/native";
type RootStackParamList = {
  Home: undefined;
  ClassifiedDetails: { itemdetails: object }; 
  MotorsDetails: {item: object};
  PropertyDetails: {itemdetails: object};
  SeeAllProduct: { category: string, subcategories: object, type: string }
};

const PropertyCard = ({ item } : any) => {
  //const navigation = useNavigation()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const img =
    item?.images?.length > 0
      ? BASE_URL + item.images[0].image
      : null;


  const checkDetails = async(item: any) => {
    if(item?.add_post == "Property")
    {
    navigation.navigate("PropertyDetails", {
      itemdetails: item,
    })
    }
    else if(item?.add_post == "Motors")
    {
          navigation.navigate("MotorsDetails", {
            item: item
          })
    } 
    else if(item?.add_post == "classified")
    {
          navigation.navigate("ClassifiedDetails", {
            itemdetails: item,
          })
    }
    else if(item?.add_post == "Furniture and Garden")
    {
         navigation.navigate("ClassifiedDetails", {
            itemdetails: item,
          })
    }
    else {

    }

  }

  return (
    <TouchableOpacity style={styles.cardInner} 
     onPress={() =>
         {
          checkDetails(item)
         }
        }>

      {/* Image */}
      {img ? (
        <Image source={{ uri: img }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: "#eee" }]} />
      )}

      {/* Price */}
      {item.price && (
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            AED {item.price}
          </Text>
        </View>
      )}

      {/* Title */}
      <Text numberOfLines={1} style={styles.title}>
        {item.shortTitle}
      </Text>

      {/* Location */}
      <Text numberOfLines={1} style={styles.meta}>
        {item.city}
      </Text>
    </TouchableOpacity>
  );
};

export default PropertyCard;

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  agencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },

  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  propertyCount: {
    color: 'gray',
  },

  tabMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },

  tabText: {
    fontSize: 15,
    color: 'gray',
  },

  activeTab: {
    color: 'black',
    fontWeight: 'bold',
  },

  card: {
    marginBottom: 10,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderTopWidth: 1,
  },

  footerBtn: {
    alignItems: 'center',
  },

  // PropertyCard styles
  cardInner: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  image: {
    width: "100%",
    height: 120,
  },

  priceTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  priceText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  title: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    marginTop: 6,
  },

  meta: {
    fontSize: 11,
    color: "#666",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
});