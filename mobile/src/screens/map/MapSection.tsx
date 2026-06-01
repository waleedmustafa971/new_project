import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Modal,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import Icon from "react-native-vector-icons/FontAwesome5";
import AntDesign from "react-native-vector-icons/AntDesign";

const MapSection = ({ locationName }) => {

  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ✅ Safe default coords (Dubai)
  const coordinates = {
    latitude: 25.2048,
    longitude: 55.2708,
  };

  // 🔥 OPEN MAP (FIXED)
  const openMap = () => {
    setShowMap(true);

    // delay to prevent Android crash
    setTimeout(() => {
      setMapReady(true);
    }, 300);
  };

  // 🔥 CLOSE MAP
  const closeMap = () => {
    setMapReady(false);
    setShowMap(false);
  };

  return (
    <View style={styles.container}>

      {/* 🔥 PREVIEW */}
      <ImageBackground
        source={require("../../assets/map/map-blur.png")}
        style={styles.placeholder}
        imageStyle={{ borderRadius: 20 }}
      >
        <TouchableOpacity onPress={openMap} style={styles.button}>
          <Icon name="map-marker-alt" size={18} color="#000" />
          <Text style={styles.buttonText}>Show Map</Text>
        </TouchableOpacity>
      </ImageBackground>

      {/* 🔥 MODAL */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={closeMap}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Location</Text>

          <TouchableOpacity onPress={closeMap}>
            <AntDesign name="close" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Map Loader OR Map */}
        {!mapReady ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Loading map...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={coordinates}
              title={locationName || "Location"}
            />
          </MapView>
        )}
      </Modal>

    </View>
  );
};

export default MapSection;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    height: 250,
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0",
  },

  button: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    elevation: 5,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  header: {
    height: 55,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
  },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  map: {
    flex: 1,
  },
});