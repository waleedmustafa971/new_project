import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Icon from 'react-native-vector-icons/Ionicons';
import { googlemapapi } from '../../../component/global';

const { width, height } = Dimensions.get('window');

const AddressChangeModal = ({
  visible,
  onClose,
  onSave,
  region: initialRegion,
  selectedAddress: initialAddress,
}: any) => {

  const mapRef = useRef(null);

  const [region, setRegion] = useState(initialRegion);
  const [address, setAddress] = useState(initialAddress || "");

  // 🔍 When user selects place
  const handlePlaceSelect = (data: any, details: any = null) => {
    if (details) {
      const { lat, lng } = details.geometry.location;

      const newRegion = {
        ...region,
        latitude: lat,
        longitude: lng,
      };

      setRegion(newRegion);
      setAddress(data.description);

      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  };

  // ✅ Confirm location
  const handleConfirmLocation = () => {
    onSave({
      region,
      address,
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>

      {/* MAP */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={(reg) => setRegion(reg)}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker coordinate={region} />
      </MapView>

      {/* TOP SEARCH */}
      <View style={styles.topSection}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Icon name="arrow-back" size={18} color="#000" />
        </TouchableOpacity>

        <GooglePlacesAutocomplete
          placeholder="Search location..."
          fetchDetails={true}
          onPress={handlePlaceSelect}
          
          query={{
            key: googlemapapi,
            language: 'en',
            components: 'country:ae', // ✅ restrict to UAE
          }}
          textInputProps={{
            placeholderTextColor: '#888',
          }}
          styles={{
            textInputContainer: styles.searchInputContainer,
            textInput: styles.searchInput,
            listView: styles.listView,
          }}
        />
      </View>

      {/* BOTTOM BUTTON */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmLocation}
        >
          <Text style={styles.confirmButtonText}>
            Confirm Location
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default AddressChangeModal;


const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 999,
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  topSection: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 10,
  },

  backButton: {
    backgroundColor: '#fff',
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },

  searchInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },

  searchInput: {
    fontSize: 14,
    color: '#000',
  },

  listView: {
    backgroundColor: '#fff',
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
  },

  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 80,
    borderRadius: 30,
  },

  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});