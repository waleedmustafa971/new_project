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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.40; // Shows a peek of the next card

const PromoSlider = ({ promos = [] }: any) => {
  if (!Array.isArray(promos) || promos.length === 0) return null;

  const renderItem = ({ item }: any) => {
    // You can dynamically get these colors from your API or use a fallback
    const bgColor = item.bgColor || "#E91E63"; 

    return (
      <View style={[styles.cardContainer, { backgroundColor: bgColor }]}>
        {/* Top Badge (e.g., Free Delivery) */}
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>{item.topLabel || "Free delivery"}</Text>
        </View>

        <View style={styles.contentRow}>
          {/* Text Section */}
          <View style={styles.textSection}>
            <Text style={styles.mainTitle} numberOfLines={2}>
              {item.message || "Flat 50% off your 1st order"}
            </Text>
            
            {/* Promo Code Badge */}
            {item.code && (
              <View style={styles.codeContainer}>
                <View style={styles.codeLabel}>
                  <Text style={styles.codeLabelText}>code</Text>
                </View>
                <View style={styles.codeValue}>
                  <Text style={styles.codeValueText}>{item.code}</Text>
                </View>
              </View>
            )}
            <Text style={styles.tcsText}>T&Cs apply</Text>
          </View>

          {/* Image Section - Overlapping style */}
          <View style={styles.imageSection}>
             <View style={styles.imageBackgroundCircle} />
           {/*   <Image
              source={{ uri: base.BASE_URL + "/" + item.image }}
              style={styles.foodImage}
              resizeMode="contain"
            /> */}
          </View>
        </View>
      </View>
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
    marginVertical: 15,
  },
  listPadding: {
    paddingHorizontal: 15,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    marginRight: 15,
    padding: 15,
    overflow: 'hidden',
    position: 'relative',
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
  imageBackgroundCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    bottom: -20,
    right: -10,
  },
  foodImage: {
    width: 130,
    height: 130,
    zIndex: 2,
  },
});

export default PromoSlider;