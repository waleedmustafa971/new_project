import React, { useEffect, useState } from "react";
import { View, Modal, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Geolocation from "react-native-geolocation-service";
import Geocoder from "react-native-geocoding";
import { requestLocationPermission } from "../../permission/PermissionManager"; // your function
import { googlemapapi } from "../../../component/global";
import Ionicons from 'react-native-vector-icons/Ionicons';

// Initialize Geocoder
Geocoder.init(googlemapapi);

const MapModal = ({ visible, onClose, onLocationSelected, latitude, longitude, address }: any) => {
  console.log(latitude, longitude)
  const [region, setRegion] = useState({
    latitude: latitude || 25.276987, // fallback if latitude not provided
    longitude: longitude || 55.296249, // fallback if longitude not provided
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [marker, setMarker] = useState(latitude && longitude ? { latitude, longitude } : null);
  //const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch current location on modal open
  useEffect(() => {
    if (!visible) return;

    const initLocation = async () => {
      setLoading(true);
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert("Permission denied", "Cannot access location");
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const initialRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(initialRegion);
          setMarker({ latitude, longitude });

          // Fetch initial address
          try {
            const geoData = await Geocoder.from(latitude, longitude);
            if (geoData.results.length > 0) {
              setAddress(geoData.results[0].formatted_address);
              console.log('map...address',geoData.results[0].formatted_address)

            }
          } catch (err) {
            console.log("Geocoding error:", err);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.log("Location error:", error);
          Alert.alert("Error", "Cannot fetch location");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    };

    initLocation();
  }, [visible]);

  // Marker drag handler
  const onMarkerDragEnd = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    setLoading(true);
    try {
      const geoData = await Geocoder.from(latitude, longitude);
      if (geoData.results.length > 0) {
       // setAddress(geoData.results[0].formatted_address);
      }
    } catch (err) {
      console.log("Geocoding error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm selected location
  const confirmLocation = () => {
    if (marker) {
      onLocationSelected({ ...marker, address });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Loader */}
        {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}

        {/* Map */}
        {region && (
          <>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={region}
              onRegionChangeComplete={(r) => setRegion(r)}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {marker && (
                <Marker
                  coordinate={marker}
                  draggable
                  onDragEnd={onMarkerDragEnd}
                >
                  {/* Custom marker icon */}
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="location-sharp" size={40} color="red" />
                  </View>
                </Marker>
              )}
            </MapView>

            {/* Address display */}
            <View style={styles.addressContainer}>
              <Text style={styles.addressText}>{address || "Fetching address..."}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={confirmLocation}>
                <Text>Confirm</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

export default MapModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { position: "absolute", top: "50%", left: "50%", marginLeft: -25, marginTop: -25 },
  addressContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  addressText: { fontSize: 16 },
  buttons: { flexDirection: "row", justifyContent: "space-around", padding: 10, backgroundColor: "#fff" },
  button: { padding: 10, backgroundColor: "#ddd", borderRadius: 8, width: 100, alignItems: "center" },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "white",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    elevation: 5
  },
  closeText: { fontSize: 22, fontWeight: "bold" },
});