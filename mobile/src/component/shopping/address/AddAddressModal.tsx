import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { googlemapapi } from '../../global';
//import AddAddressModal from './AddAddressModal'; // Your existing component
import Icon from 'react-native-vector-icons/Ionicons'; // Ensure icons are linked
import AddAddressModalinfo from './AddAddressModalinfo';
import api from '../../api';

const { width, height } = Dimensions.get('window');

const AddAddressModal = ({ address,userid, visible, onClose, onSave, navigation, longitude, latitude }: any) => {
    const mapRef = useRef(null);

    const [region, setRegion] = useState({
        latitude: latitude, // Default to Dhaka based on your screenshot
        longitude: longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(address);
    const [modalVisible, setModalVisible] = useState(false);

    const handlePlaceSelect = (data: any, details: any = null) => {
        if (details) {
            const { lat, lng } = details.geometry.location;
            const newRegion = {
                ...region,
                latitude: lat,
                longitude: lng,
            };
            setRegion(newRegion);
            setSelectedRegion(newRegion);
            setSelectedAddress(data.description);
            mapRef.current?.animateToRegion(newRegion, 1000);
        }
    };

    const handleConfirmLocation = () => {
        setSelectedRegion(region); // save final location
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            {/* 1. Map Layer */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={region}
                onRegionChangeComplete={(reg) => setRegion(reg)}
                showsUserLocation={true}   // ✅ shows blue dot
                showsMyLocationButton={true} // ✅ optional (Android button)
            >
                <Marker coordinate={region} title="You are here" />
            </MapView>

            {/* 2. Google Autocomplete Search Bar */}
            <View style={styles.topSection}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => onClose()}
                    >
                        <Icon name="arrow-back" size={18} color="#000" />
                    </TouchableOpacity>
                </View>

                <GooglePlacesAutocomplete
                    placeholder="Search location..."
                    fetchDetails={true}
                    onPress={handlePlaceSelect}
                    query={{
                        key: googlemapapi,
                        language: 'en',
                        
                        //components: 'country:ae', // 👈 restrict to UAE
                    }}
                    // ADD THIS SECTION:
                    textInputProps={{
                        placeholderTextColor: '#888', // Set your desired color here
                        returnKeyType: "search",
                    }}
                    styles={{
                        textInputContainer: styles.searchInputContainer,
                        textInput: styles.searchInput,
                        listView: styles.listView,
                    }}
                />
            </View>

            {/* 3. Bottom Confirm Button */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleConfirmLocation()}>
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                </TouchableOpacity>
            </View>

            {/* 4. Your Address Details Modal */}
            {
                modalVisible && selectedRegion ? (
                    <AddAddressModalinfo
                        visible={modalVisible}
                        onClose={() => setModalVisible(false)}
                        onSave={async(data: any) => {
                            console.log("Saved Address Data:", data)
                            ///save data into db
                            try {
                                const response : any = await api.post("/apis/auth/update-address", {
                                    userId: userid,
                                    address: data,
                                });
                                console.log('response... parents....', response.data)
                                //dispatch(getSingleUser(userid));
                                onClose()

                            } catch (error) {
                                console.log("Error updating address", error);
                            }
                        }
                        }
                        region={selectedRegion}   // ✅ FIXED
                        selectedAddress={selectedAddress}
                    />
                ) : null
            }

        </View>
    );
};

const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    map: { ...StyleSheet.absoluteFillObject },
    searchContainer: {
        position: 'absolute',
        top: 50,
        width: '90%',
        alignSelf: 'center',
        zIndex: 1,
    },
    headerRow: {
        width: 50
    },
    backButton: {
        backgroundColor: '#fff',
        width: 30,
        height: 30,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    topSection: {
        position: 'absolute',
        top: 7,
        left: 0,
        right: 0,
        paddingHorizontal: 15,
        zIndex: 5, flexDirection: 'row',
        width: '93%'
    },
    searchInputContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowRadius: 10,
    },
    searchInput: {
        fontSize: 12,
        color: '#000',
    },
    listView: {
        backgroundColor: '#fff',
        borderRadius: 5,
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
        paddingHorizontal: 60,
        borderRadius: 30,
        elevation: 3,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default AddAddressModal;