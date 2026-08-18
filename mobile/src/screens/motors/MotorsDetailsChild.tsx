import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Share,
  Platform, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as base from '../../component/global'
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../component/api';
import Toast from 'react-native-toast-message';
// Assuming these detail components are in the same file or imported
const DetailItem = ({ label, value }: any) => (
  <View style={styles.detailItem}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const IconDetail = ({ iconName, value,
  interiorcolor, exteriorcolor, bodytype, noofcylinders,
  sellertype, trim, horsepower, doors,
  fueltype, transmissiontype, exterior, waranty
}: any) => (
  <View style={styles.iconDetailContainer}>
    <Icon name={iconName} size={18} color="#000" />
    <Text style={styles.iconValue}>{value}</Text>
  </View>
);

const MotorsDetailsChild = ({ item }: any) => {
  const [loading, setLoading] = useState(false)

  const handleFavourite = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("userdata");
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        //  setUserid(userData._id);
        if (!userData._id) {
          console.warn("No userId found in storage");
          return;
        }
        setLoading(true)
        try {
          const response = await api.post("/apis/property/addpropertyfaviourites", {
            userid: userData._id,
            property_id: item?._id,
            details: item
          });
          console.log("Added:", response.data);
          Toast.show({
            type: 'success', // success | error | info
            text1: 'Success',
            text2: response?.data,
            position: 'top',
            visibilityTime: 3000,
          });
          setLoading(false)
          return response.data;
        } catch (error: any) {
          Toast.show({
            type: 'success', // success | error | info
            text1: 'Success',
            text2: error.response?.data,
            position: 'top',
            visibilityTime: 3000,
          });
          setLoading(false)
          // console.error("Error adding save:", error.response?.data || error.message);
          throw error;
        }
      }
      else {
        console.log('userid not found')
      }

    } catch (error: any) {
      console.error("Failed to update history:", error.response?.data || error.message);
      throw error;
    }

  }


  const slugify = (text = '') =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')   // spaces & special chars → -
      .replace(/^-+|-+$/g, '');   // trim - from start/end

  const handleShare = async () => {
    const producttitle = slugify(item?.shortTitle);

    try {
      const propertyLink = `${base.BASE_URL}/product/${item._id}/${producttitle}`;
      let shareOptions;
      if (Platform.OS === "ios") {
        // iOS supports `url` for link previews
        shareOptions = {
          message: "Check out this Product!", // Text above preview
          url: propertyLink,
        };
      } else {
        // Android ignores `url` in Share; put link in message
        shareOptions = {
          message: `Check out this Product! ${propertyLink}`,
        };
      }

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Shared successfully!");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error: any) {
      console.error("Error sharing:", error.message);
    }
  }


  return (
    <ScrollView style={styles.container}>


      {/* --- Price & Action Row --- */}
      <View style={styles.priceActionRow}>
        <Text style={styles.priceText}>
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'AED',
            maximumFractionDigits: 0, // optional: removes decimal if not needed
          }).format(Number(item?.price))}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}
            onPress={handleFavourite} disabled={loading}>
            {
              loading ?
                <ActivityIndicator />
                :
                <>
                  <Icon name="heart-outline" size={18} color="#000" />
                  <Text style={styles.actionText}>Favorite</Text>
                </>
            }

          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.shareBtn]}
            onPress={handleShare} disabled={loading}>
            <Icon name="share-social-outline" size={18} color="#000" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Car Title --- */}
      <Text style={styles.carTitle}>{item?.shortTitle}</Text>

      {/* --- Key Specs Row --- */}
      <View style={styles.keySpecsRow}>
        <IconDetail iconName="calendar-outline" value={item?.year} />
        <IconDetail iconName="speedometer-outline" value={item?.kilometers} />
        {/* Left Hand */}
        <IconDetail iconName="speedometer" value={item?.steeringside} />
        {/* GCC Specs */}
        <IconDetail iconName="globe-outline" value={item?.regional_specs} />
      </View>

      <View style={{ marginTop: 7 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
          Description
        </Text>
      </View>
      <View style={styles.locationRow}>
        <Text style={styles.address}>
          {item?.description}
        </Text>
      </View>

      {/* --- Car Overview Section --- */}
      <Text style={styles.overviewTitle}>Car Overview</Text>
      <View style={styles.overviewContainer}>
        <View style={styles.column}>
          <DetailItem label="Interior Color" value={item?.interiorcolor} />
          <DetailItem label="Exterior Color" value={item?.externalcolor} />
          <DetailItem label="Body Type" value={item?.bodytype} />
          <DetailItem label="No. of Cylinders" value="" />
          {/*  <DetailItem label="Seller type" value="Dealer" /> */}
          <DetailItem label="Trim" value={item?.trim} />
        </View>
        <View style={styles.column}>
          <DetailItem label="Horsepower" value={item?.horsepower} />
          <DetailItem label="Doors" value={item.doors} />
          <DetailItem label="Fuel Type" value={item?.fueltype} />
          <DetailItem label="Transmission Type" value={item?.transmissiontypes} />
          <DetailItem label="Exterior" value={item?.externalcolor} />
          <DetailItem label="Warranty" value={item?.warranty} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  // --- Price & Action Row Styles ---
  priceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  shareBtn: {
    backgroundColor: '#f8f8f8', // Slightly different background for 'Share'
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#000',
  },

  // --- Car Title Style ---
  carTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },

  // --- Key Specs Row Styles (Icon Details) ---
  keySpecsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap', // Allows wrapping if needed
    marginBottom: 30,
  },
  iconDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  iconValue: {
    marginLeft: 5,
    fontSize: 14,
    color: '#000',
  },

  // --- Car Overview Styles ---
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1, // Each column takes half the space
    paddingRight: 15, // Space between columns
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Separator line
  },
  label: {
    fontSize: 14,
    color: '#888', // Light color for label
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexWrap: 'wrap', padding: 8
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

export default MotorsDetailsChild;