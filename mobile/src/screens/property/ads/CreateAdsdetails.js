import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView,
    StyleSheet, TouchableOpacity,
    Pressable, Button, Switch,
    Alert,
    SafeAreaView, ActivityIndicator, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as base from '../../../component/global'
import Toast from 'react-native-toast-message';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { Dimensions } from 'react-native';
import AddressChangeModal from './AddressChangeModal';
const { width, height } = Dimensions.get('window');
import CountryPicker from "react-native-country-picker-modal";

export default function CreateAdsdetails() {
    const navigation = useNavigation()
    const route = useRoute()
    const id = route.params?.id;
    const userid = route.params?.userid;
    const itemdetails = route.params?.itemdetails;
    const [mapVisible, setMapVisible] = useState(false);
    const [mapRegion, setmapRegion] = useState(null);
    const [address, setAddress] = useState(null);
    const [locationModal, setLocationModal] = useState(false);
    const mapRef = useRef(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [country, setCountry] = useState(null);
    const [visible, setVisible] = useState(false);
    const [callingCode, setCallingCode] = useState("971"); // default
    const aePhoneRegex = /^(?:\+971|00971|0)?(5[0-9]|[234679])\d{7}$/;
    const [sameNumber, setSameNumber] = useState(false);

    console.log('...id...' + id)
    const [region, setRegion] = useState({
        latitude: 25.2048,      // default (Dubai)
        longitude: 55.2708,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    const [marker, setMarker] = useState({
        latitude: 25.2048,
        longitude: 55.2708,
    });
    const [formData, setFormData] = useState({
        phonecode: '971',
        add_post: 'Property',
        youtubeURL: itemdetails?.youtubeURL,
        phoneNo: itemdetails?.phoneNo,
        whatsapp: itemdetails?.whatsapp,
        price: itemdetails?.price,
        description: itemdetails?.description,
        size: itemdetails?.size,
        closingFee: itemdetails?.closingFee,
        bedrooms: itemdetails?.bedrooms,
        bathrooms: itemdetails?.bathrooms,
        readyDate: new Date(),
        annualFee: itemdetails?.annualFee,
        furnished: itemdetails?.isFurnished,
        referenceID: itemdetails?.referenceID,
        buyerFee: itemdetails?.buyerFee,
        sellerFee: itemdetails?.sellerFee,
        maintenanceFee: itemdetails?.maintenanceFee,
        occupancyStatus: itemdetails?.occupancyStatus,
        location: itemdetails?.location, currency: 'AED'
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [amenities, setAmenities] = useState([]);
    const amenityOptions = ['Central A/C & Heating', 'Balcony',
        'Private Gym', 'Shared Pool', 'Double Glazed Windows',
        'Kids Play Area',
        'Maintenance Staff',
        'CCTV Security',
        'Cleaning Services',
        'Barbeque Area',
        'Waste Disposal'];

    /* 'Dryer','Cable TV','Gym','Jacuzzi','Sauna','Swimming Pool',
    'Free Parking','Cleaning Included','Recreation Centre',
    'Kitchen Appliances' Preferred Nationality of tenants*/

    useEffect(() => {
        getLiveLocation();
        if (itemdetails?.amenities) {
            try {
                const parsedAmenities = typeof itemdetails.amenities === 'string'
                    ? JSON.parse(itemdetails.amenities)
                    : itemdetails.amenities;

                setAmenities(parsedAmenities);
                console.log(parsedAmenities)
            } catch (e) {
                console.error('Invalid amenities JSON:', e);
                setAmenities({});
            }
        }
    }, [itemdetails]);

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };
    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'App needs access to your location',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };


    /*   const handleAmenityChange = (key) => {
          setAmenities((prev) => ({
              ...prev,
              [key]: !prev[key],
          }));
      }; */

    const handleAmenityChange = (key) => {
        setAmenities((prev) =>
            prev.includes(key)
                ? prev.filter((item) => item !== key) // remove
                : [...prev, key]                      // add
        );
    };

    const getLiveLocation = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return;

        //   setMapVisible(true);

        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                setRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
                console.log({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                })

                setMarker({ latitude, longitude });
                console.log('Latitude, Longitude:', latitude, longitude);

                // 🔹 Wrap async code in an IIFE
                (async () => {
                    try {
                        const response = await fetch(
                            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${base.googlemapapi}`
                        );
                        const data = await response.json();
                        if (data.results.length > 0) {
                            // console.log('Address:', data.results[0].formatted_address);
                            console.log('Address:', data.results[1].formatted_address);
                            setAddress(data.results[1].formatted_address);
                            setFormData({ ...formData, location: data.results[1].formatted_address });
                            const components = data.results[0].address_components;
                            //   const address = data.results[1].address_components.formatted_address;
                            console.log('Human-readable Address:', address);
                        }
                    } catch (error) {
                        console.log('Geocoding Error:', error);
                    }
                })();
            },
            (error) => {
                console.log('Location Error:', error);
            },
            {
                accuracy: { android: 'balanced' },
                enableHighAccuracy: false,
                timeout: 20000,
                maximumAge: 10000,
                forceRequestLocation: true,
                showLocationDialog: true,
            }
        );
    };


    const handleContinue = async () => {
        //  Alert.alert(JSON.stringify(formData));

        if (!id) {
            Toast.show({
                type: 'error',
                text1: 'Transaction ID Not Found',
                text2: 'Validation',
            });
            return;
        }

        if (!formData.phoneNo) {
            Toast.show({
                type: 'error',
                text1: 'Select phoneNo',
                text2: 'Upload failed',
            });
            return;
        }

        if (!formData.price) {
            Toast.show({
                type: 'error',
                text1: 'Select the price',
                text2: 'Upload failed',
            });
            return;
        }


        if (!formData.occupancyStatus) {
            Toast.show({
                type: 'error',
                text1: 'Select occupancyStatus',
                text2: 'failed occupancyStatus',
            });
            return;
        }

        setLoading(true);

        // Prepare plain object for raw JSON
        const formDataPayload = {
            youtubeURL: formData.youtubeURL,
            phoneNo: formData.phonecode + formData.phoneNo,
            price: formData.price,
            description: formData.description,
            size: formData.size,
            closingFee: formData.closingFee,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            readyDate: formData.readyDate.toISOString(), // safer date format
            annualFee: formData.annualFee,
            furnished: formData.furnished,
            referenceID: formData.referenceID,
            buyerFee: formData.buyerFee,
            sellerFee: formData.sellerFee,
            maintenanceFee: formData.maintenanceFee,
            occupancyStatus: formData.occupancyStatus,
            location: formData.location,
            id: id,
            whatsapp: formData.phonecode + formData.whatsapp,
            amenities: amenities,
            add_post: formData.add_post

        };

        console.log('Sending JSON:', JSON.stringify(formDataPayload));
        console.log(base.BASE_URL + '/apis/property/updateproperty');

        try {
            const response = await fetch(base.BASE_URL + '/apis/property/updateproperty', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formDataPayload),
            });

            const result = await response.json();
            console.log('..response.res..', result);

            if (response.ok) {
                console.log('..response...', result.ad);
                //PaymentScreenProperty

                // navigation.navigate("ConfirmAds"); 
                navigation.navigate('PaymentScreenProperty', {
                    id: result.data._id,
                    type: 'payment', userid: userid
                });

            } else {
                Alert.alert('Error', result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Network Error:', error);
            Alert.alert('Error', 'Failed to upload property');
        } finally {
            setLoading(false);
        }
    };
    const handleChangeLocation = () => {
        setModalVisible(true)
    }

useEffect(() => {
  if (sameNumber) {
    handleChange('whatsapp', formData.phoneNo);
  }
}, [formData.phoneNo]);


    return (
        <SafeAreaView>
            <View style={{
                padding: 10, flexDirection: 'row', height: 45,
                justifyContent: 'space-between'
            }}>
                <TouchableOpacity onPress={() => {
                    navigation.goBack()
                }} style={{ flexDirection: 'row' }}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                    <Text style={{
                        fontSize: 16,
                        fontWeight: 'bold', marginLeft: 5
                    }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={loading}
                    style={{
                        width: 100,
                        height: 40,
                        backgroundColor: '#000',
                        borderRadius: 10,
                        justifyContent: 'center', // vertically center
                        alignItems: 'center',     // horizontally center
                    }}
                >
                    {
                        loading ?
                            <ActivityIndicator />
                            :
                            <Text style={{
                                color: '#ffffff', textAlign: 'center',
                                fontSize: 14
                            }}>
                                Next
                            </Text>
                    }

                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Inputs 
                <Text>ID : {id}</Text> */}

                <View style={{
                    fontWeight: 'bold',
                    marginBottom: 5
                }}>
                    <Text>YouTube URL </Text>
                </View>
                <TextInput
                    placeholder="YouTube URL"
                    value={formData.youtubeURL}
                    onChangeText={(text) => handleChange('youtubeURL', text)}

                    style={styles.input}
                />
                <View style={{
                    fontWeight: 'bold',
                    marginBottom: 5
                }}>
                    <Text>Phone No </Text>
                </View>

                <View style={styles.phoneContainer}>
                    <TouchableOpacity
                        style={styles.countryButton}
                        onPress={() => setVisible(true)}
                    >
                        <CountryPicker
                            visible={visible}
                            withFilter
                            withFlag
                            withCallingCode
                            withAlphaFilter
                            countryCode={country?.cca2 || "AE"}
                            onClose={() => setVisible(false)}
                            onSelect={(c) => {
                                setCountry(c);
                                setCallingCode(c.callingCode[0]);
                                setVisible(false);
                            }}
                        />

                        <Text style={styles.callingCodeText}>+{callingCode}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TextInput
                        style={{
                            width: '80%',
                            marginRight: 7
                        }}
                        placeholder="Phone number"
                        keyboardType="numeric"
                        //value={mobileno}
                        //onChangeText={(text) => setMobileno(text)}
                        value={formData.phoneNo ?? ''}
                        onChangeText={(text) => handleChange('phoneNo', text)}
                        placeholderTextColor="#999"
                    />
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 5,
                    }}
                >
                    <Text style={{ fontSize: 12 }}>WhatsApp</Text>

                    <TouchableOpacity
                        onPress={() => {
                            const newValue = !sameNumber;
                            setSameNumber(newValue);

                            // ✅ If checked → copy phone number
                            if (newValue) {
                                handleChange('whatsapp', formData.phoneNo);
                            }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View
                            style={{
                                width: 16,
                                height: 16,
                                borderWidth: 1,
                                borderColor: '#000',
                                marginRight: 6,
                                backgroundColor: sameNumber ? '#000' : '#fff',
                            }}
                        />
                        <Text style={{ fontSize: 12 }}>Same Number?</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.phoneContainer}>
                    <TouchableOpacity
                        style={styles.countryButton}
                        onPress={() => setVisible(true)}
                    >
                        <CountryPicker
                            visible={visible}
                            withFilter
                            withFlag
                            withCallingCode
                            withAlphaFilter
                            countryCode={country?.cca2 || "AE"}
                            onClose={() => setVisible(false)}
                            onSelect={(c) => {
                                setCountry(c);
                                setCallingCode(c.callingCode[0]);
                                setVisible(false);
                            }}
                        />

                        <Text style={styles.callingCodeText}>+{callingCode}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TextInput
                        style={{
                            width: '80%',
                            marginRight: 7
                        }}
                        placeholder="Phone number"
                        keyboardType="numeric"
                        //value={mobileno}
                        //onChangeText={(text) => setMobileno(text)}
                        value={formData.whatsapp ?? ''}
                        onChangeText={(text) => handleChange('whatsapp', text)}
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Price </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TextInput
                        placeholder="Price"
                        keyboardType="numeric"
                        value={formData.price?.toString() ?? ''}
                        onChangeText={(text) => handleChange('price', text)}
                        style={styles.inputprice}
                    />
                    <TextInput
                        placeholder=""
                        keyboardType="numeric"
                        value={formData.currency?.toString() ?? ''}
                        onChangeText={(text) => handleChange('currency', text)}
                        editable={false}
                        style={styles.inputcurrency}
                    />
                </View>
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Describe your property </Text>
                </View>
                <TextInput
                    placeholder=""
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    style={[styles.input, { height: 100 }]}
                    multiline
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Size </Text>
                </View>
                <TextInput
                    placeholder="Size"
                    keyboardType="numeric"
                    value={formData.size?.toString() ?? ''}
                    onChangeText={(text) => handleChange('size', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Total Closing Fee (AED) - Optional </Text>
                </View>
                <TextInput
                    placeholder=""
                    keyboardType="numeric"
                    value={formData.closingFee?.toString() ?? ''}
                    onChangeText={(text) => handleChange('closingFee', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Bedrooms </Text>
                </View>
                <TextInput
                    placeholder="Bedrooms"
                    keyboardType="numeric"
                    value={formData.bedrooms?.toString() ?? ''}
                    onChangeText={(text) => handleChange('bedrooms', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Bathrooms </Text>
                </View>
                <TextInput
                    placeholder="Bathrooms"
                    keyboardType="numeric"
                    // value={formData.bathrooms}
                    value={formData.bathrooms?.toString() ?? ''}
                    onChangeText={(text) => handleChange('bathrooms', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Ready by </Text>
                </View>
                {/* Date Picker */}
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                    <Text style={{ color: '#000' }}>
                        {`Ready by: ${formData.readyDate.toLocaleDateString()}`}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={formData.readyDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) handleChange('readyDate', selectedDate);
                        }}
                    />
                )}
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Annual Community Fee (AED) - Optional </Text>
                </View>
                <TextInput
                    placeholder=""
                    keyboardType="numeric"
                    value={formData.annualFee?.toString() ?? ''}
                    onChangeText={(text) => handleChange('annualFee', text)}
                    style={styles.input}
                />

                <View style={{ fontWeight: 'bold', fontSize: 12 }}>
                    <Text>Is it furnished ? </Text>
                </View>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            formData.furnished === true && styles.activeButton,
                        ]}
                        onPress={() => handleChange('furnished', true)}
                    >
                        <Text style={{
                            color: formData.furnished === true ? '#ffffff' : '#000000',
                            fontSize: 12
                        }}>
                            Furnished
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            formData.furnished === false && styles.activeButton,
                        ]}
                        onPress={() => handleChange('furnished', false)}
                    >
                        <Text style={{
                            color: formData.furnished === false ? '#ffffff' : '#000000',
                            fontSize: 12
                        }}>
                            Unfurnished
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Property Reference ID # </Text>
                </View>

                <TextInput
                    placeholder=""
                    value={formData.referenceID?.toString() ?? ''}
                    onChangeText={(text) => handleChange('referenceID', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Buyer Transfer Fee (AED) - Optional </Text>
                </View>

                <TextInput
                    placeholder="Buyer Transfer Fee (AED) - Optional"
                    keyboardType="numeric"
                    value={formData.buyerFee?.toString() ?? ''}
                    onChangeText={(text) => handleChange('buyerFee', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Seller Transfer Fee </Text>
                </View>

                <TextInput
                    placeholder="Seller Transfer Fee"
                    keyboardType="numeric"
                    value={formData.sellerFee?.toString() ?? ''}
                    onChangeText={(text) => handleChange('sellerFee', text)}
                    style={styles.input}
                />
                <View style={{ fontWeight: 'bold', marginBottom: 5 }}>
                    <Text>Maintenance Fee </Text>
                </View>

                <TextInput
                    placeholder="Maintenance Fee"
                    keyboardType="numeric"
                    value={formData.maintenanceFee?.toString() ?? ''}
                    onChangeText={(text) => handleChange('maintenanceFee', text)}
                    style={styles.input}
                />

                <View style={{ fontWeight: 'bold' }}>
                    <Text style={{ fontSize: 12 }}>Occupancy Status ? </Text>
                </View>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            formData.occupancyStatus === 'Vacant' && styles.activeButton,
                        ]}
                        onPress={() => handleChange('occupancyStatus', 'Vacant')}
                    >
                        <Text style={{
                            color: formData.occupancyStatus === 'Vacant' ? '#ffffff' : '#000000',
                            fontSize: 12
                        }}>
                            Vacant
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            formData.occupancyStatus === 'Occupied' && styles.activeButton,
                        ]}
                        onPress={() => handleChange('occupancyStatus', 'Occupied')}
                    >
                        <Text style={{
                            color: formData.occupancyStatus === 'Occupied' ? '#ffffff' : '#000000',
                            fontSize: 12
                        }}>
                            Occupied
                        </Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={styles.sectionTitle}>Amenities</Text>
                </View>
                <View style={styles.amenityContainer}>
                    {amenityOptions.map((item) => {
                        const selected = amenities.includes(item);
                        return (
                            <Pressable
                                key={item}
                                onPress={() => handleAmenityChange(item)}
                                style={[
                                    styles.amenityButton,
                                    selected && styles.amenityButtonSelected
                                ]}
                            >
                                <Text style={[styles.amenityText, selected && { color: "#fff" }]}>
                                    {item}
                                </Text>
                            </Pressable>
                        );
                    })}

                </View>
                <View style={{ marginBottom: 5 }}>
                    <Text style={{
                        fontSize: 12
                    }}> Location </Text>
                </View>

                <TouchableOpacity
                    style={styles.locationWrapper}
                    activeOpacity={0.8}
                    onPress={() => console.log('Implement Google Places Picker here')}
                >
                    {/* LEFT SIDE */}
                    <View style={styles.locationLeft}>
                        <Icon name="map-pin" size={20} color="#555" style={{ marginRight: 6 }} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {formData.location}
                        </Text>
                    </View>

                    {/* RIGHT SIDE getLiveLocation*/}
                    <TouchableOpacity onPress={handleChangeLocation}>
                        <Text style={styles.changeText}>Change</Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                <View style={{
                    height: 200, width: '100%', overflow: 'hidden',
                    marginBottom: 100
                }}>
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        // Use absoluteFillObject so it perfectly matches the 200 height parent
                        style={StyleSheet.absoluteFillObject}
                        region={region}
                        showsUserLocation={true}
                    >
                        <Marker coordinate={marker} />
                    </MapView>
                </View>
                {/* Continue Button */}
            </ScrollView>
            <Toast />

            {
                modalVisible ?
                    <AddressChangeModal
                        visible={modalVisible}
                        onClose={() => setModalVisible(false)}
                        region={region}
                        selectedAddress={formData.location}
                        onSave={(data) => {
                            console.log("Saved Address Data:", data);

                            // ✅ update UI
                            setRegion(data.region);

                            // ✅ update form location
                            setFormData((prev) => ({
                                ...prev,
                                location: data.address,
                            }));

                            setModalVisible(false);
                        }}
                    />
                    : null
            }

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 10,

    },
    phonecontainer: {
        flexDirection: 'row',       // horizontal layout
        alignItems: 'center',       // vertical alignment
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',         // keep border radius neat
    },
    codeText: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#eee',
        borderRightWidth: 1,
        borderRightColor: '#ccc',
        fontWeight: 'bold', width: 60
    },
    inputphone: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        color: '#000',
    },
    inputprice: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        color: '#000', width: '50%'
    },
    inputcurrency: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        color: '#000', width: 100
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginTop: 16, marginBottom: 100
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#000',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#000',
    },
    buttonContainer: {
        padding: 10,
        position: 'absolute',
        bottom: 0,
        zIndex: 1111,
        width: '100%',
        justifyContent: 'center',
        padding: 0,
        alignItems: 'center',
        borderWidth: 0, borderColor: 'green',
        alignSelf: 'center'
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 5,
        backgroundColor: '#eee',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 12
    },
    activeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    amenityContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "space-between",
        marginTop: 10,
    },
    amenityButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#f2f2f2",
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        width: "48%",
    },
    amenityButtonSelected: {
        backgroundColor: "#000",
        borderColor: "#000",
    },
    amenityText: {
        fontSize: 12,
        color: "#444",
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8, marginBottom: 10
    },

    locationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // important for spacing
    },

    locationText: {
        fontSize: 12,
        color: '#333',
        flexShrink: 1, // prevents overflow
    },

    changeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#007BFF',
    },
    phoneContainer: {
        width: "100%",
        height: 40,
        borderWidth: 2, borderColor: '#f2f2f2', marginTop: 4,
        display: 'flex', flexDirection: 'row'
    },
    countryButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        height: "100%",
    },

    callingCodeText: {
        fontSize: 14,
        color: "#000",
        marginLeft: 5,
        fontWeight: "500",
    },

    divider: {
        width: 2,
        height: "60%",
        backgroundColor: "#f2f2f2",
        marginHorizontal: 8,
    },
});
