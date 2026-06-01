import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

type Props = {
  locationName?: string;
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
};

const MapSection: React.FC<Props> = ({ locationName, onLocationSelect }) => {
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  // Initialize map coordinates
  useEffect(() => {
    if (!showMap) return;
    setLoading(true);
   // initMap();
  }, [showMap]);



  return (
    <View style={styles.container}>
      {!showMap ? (
        <ImageBackground
          source={require("../../assets/map/map-blur.png")}
          style={styles.placeholder}
          imageStyle={{ borderRadius: 20 }}
        >
          <TouchableOpacity
            onPress={() => setShowMap(true)}
            style={styles.button}
          >
            <Icon name="map-marker-alt" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Show Map</Text>
          </TouchableOpacity>
        </ImageBackground>
      ) : loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading map...</Text>
        </View>
      ) : (
       <>
       </>
      )}
    </View>
  );
};

export default MapSection;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    height: 300,
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
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
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
