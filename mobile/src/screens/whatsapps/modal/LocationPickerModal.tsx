// LocationPickerModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
/*
  Uses @react-native-community/geolocation, not react-native-geolocation-service.

  The latter crashed the app outright — not a JS error, a hard native one:

    java.lang.IncompatibleClassChangeError: Found interface
    com.google.android.gms.location.FusedLocationProviderClient,
    but class was expected
      at com.agontuk.RNFusedLocation.FusedLocationProvider.getCurrentLocation

  It was built when that type was a class; the Play Services version Firebase 34
  pulls in makes it an interface, and the two cannot meet. The community module
  is already a dependency, is already linked, and takes the same
  (success, error, options) signature with the same position.coords — so this is
  a swap rather than a rewrite, and needs no native rebuild.
*/
import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid } from "react-native";

const LocationPickerModal = ({ visible, onClose, onLocationSelected } : any) => {
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [markerPosition, setMarkerPosition] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "App needs your location to share it",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // Get current location when modal opens
  useEffect(() => {
    if (!visible) return;

    const getLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setRegion({ ...region, latitude, longitude });
          setMarkerPosition({ latitude, longitude });
        },
        (error) => {
          Alert.alert("Error getting location", error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    getLocation();
  }, [visible]);

  const handleConfirm = () => {
    onLocationSelected(markerPosition);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={(r) => setRegion(r)}
        >
          <Marker
            coordinate={markerPosition}
            draggable
            onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
          />
        </MapView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Share Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#4B7BEC",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default LocationPickerModal;