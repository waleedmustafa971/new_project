import React from 'react';
import {
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import * as base from "../../component/global";
import { useNavigation } from '@react-navigation/native';
import { RouteProp, NavigationProp } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.40; // Shows a peek of the next card
// 1. Define the screens and their params
type RootStackParamList = {
    Home: undefined;
    DiscountOfferModal: { latitude: number, longitude: number }; 
};


const PromoSlider = ({ promos = [], latitude, longitude }: any) => {
  if (!Array.isArray(promos) || promos.length === 0) return null;
 // console.log('...promos.....', JSON.stringify(promos))
  //const navigation = useNavigation()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const renderItem = ({ item }: any) => {
    return (
      <TouchableOpacity style={styles.cardContainer} 
      onPress={() => {
         // onOpenDiscountModal(true) 
         navigation.navigate("DiscountOfferModal", {
          "latitude" : latitude,
          "longitude": longitude
         })
      }}>
        <Image
          source={{ uri: base.BASE_URL + item.image }}
          style={styles.foodImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 20} // Snap effect
        decelerationRate="fast"
        data={promos}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listPadding}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0, borderWidth: 0, borderColor: '#000'
  },
  listPadding: {
    paddingHorizontal: 15,
  },
  cardContainer: {
    width: 120,
    //width: CARD_WIDTH,
    height: 135,
    borderRadius: 20,
    marginRight: 2,
    overflow: 'hidden',
    position: 'relative', borderWidth: 0, borderColor: 'red'
  },
  topBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  topBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentRow: {
    flexDirection: 'row',
    flex: 1,
  },
  textSection: {
    flex: 1.2,
    justifyContent: 'center',
  },
  mainTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 15,
  },
  codeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'white',
    overflow: 'hidden',
  },
  codeLabel: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  codeLabelText: {
    color: 'white',
    fontSize: 10,
  },
  codeValue: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeValueText: {
    color: '#E91E63',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tcsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    marginTop: 10,
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
});

export default PromoSlider;