import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';


const Offerlist = () => {
  const navigation = useNavigation();

  const offerimage = require('../../../assets/shopping/coin20percentoff.jpg')

  const checkOffer = (label) => {
    if (label == "Free Delivery") {
      navigation.navigate("GroupShopmore", {
        title: {"showcasecategory": label},
        products: null
      });
    }
    if (label == "New Arrivals") {
      navigation.navigate("GroupShopmore", {
        title: {"showcasecategory": label},
        products: null
      });
    }
    if (label == "Gift Item") {
      navigation.navigate("GroupShopmore", {
        title: {"showcasecategory": label},
        products: null
      });
    }
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
      <View>
        <View style={styles.itemOffer}>
          <Image source={offerimage} style={styles.offerimage} resizeMode="contain" />
        </View>
        <Text style={styles.text}>Special Offer</Text>
      </View>
      {offers.map((item, index) => (
        <TouchableOpacity key={index} style={styles.itemContainer}
          onPress={() => {
            checkOffer(item.label)
          }}>
          <Image source={item.image} style={styles.image} />
          <Text style={styles.text}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const offers = [

  {
    label: 'Free Delivery',
    image: require('../../../assets/shopping/freedelivery.jpg'),
  },
  {
    label: 'New Arrivals',
    image: require('../../../assets/shopping/new_arrivals.jpg'),
  },
  {
    label: 'Gift Item',
    image: require('../../../assets/shopping/giftlook.jpg'),
  },
  {
    label: 'Affilate',
    image: require('../../../assets/shopping/affilate.jpg'),
  },
];

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 0,
  },

  itemContainer: {
    width: 100,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  itemOffer: {
    width: 150,
    height: 92, // or adjust based on your need
    justifyContent: 'center',
    alignItems: 'center', marginTop: 7
  },
  offerimage: {
    width: '100%',
    height: '100%',
  },
  text: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Offerlist;
