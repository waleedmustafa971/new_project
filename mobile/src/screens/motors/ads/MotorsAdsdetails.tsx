import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, ScrollView,
    StyleSheet, TouchableOpacity,
    Pressable, Button, Switch,
    Alert,
    SafeAreaView, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as base from '../../../component/global'
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
    HomeSocial: undefined;
    Motors: undefined;
    HomeWhatsapp: undefined;
    HomeScreen: undefined;
    TestSound: undefined;
    FilterClassified: undefined;
    SeeAllProduct: { category: string, subcategories: object },
    PaymentScreenMotors: { id: string, type: string, userid: string }
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MotorsAdsdetails() {
    //const navigation = useNavigation()
    const navigation = useNavigation<NavigationProp>();
    //  const { id, type, userid } = route.params;

    const route = useRoute<any>()
    const { id, itemdetails, userid } = route.params;
    //  const itemdetails = route.params?.itemdetails;
    console.log('...id...' + id + '....details' + JSON.stringify(itemdetails))
    const [formData, setFormData] = useState({
        phonecode: itemdetails?.phonecode ?? '971',
        youtubeURL: itemdetails?.youtubeURL,
        phoneNo: itemdetails?.phoneNo,
        whatsapp: itemdetails?.whatsapp,
        price: itemdetails?.price,
        description: itemdetails?.description,
        fueltype: itemdetails?.fueltype,
        externalcolor: itemdetails?.externalcolor,
        interior_color: itemdetails?.interior_color,
        warranty: itemdetails?.warranty,
        doors: itemdetails?.doors,
        transmission_types: itemdetails?.transmission_types,
        seating_capacity: itemdetails?.seating_capacity,
        horosepower: itemdetails?.horosepower,
        steering_side: itemdetails?.steering_side,
        add_post: 'Motors',
        location: itemdetails?.location, currency: 'AED'
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [technical_features, setTechnical_features] = useState<string[]>([]);
    const [extra, setExtra] = useState<string[]>([]);
    const [seating_capacity, setSeating_capacity] = useState<string>(itemdetails?.seating_capacity ?? ''); // steering_side
    const [steering_side, setSteering_side] = useState<string>(itemdetails?.steering_side ?? ''); // 
    const [fueltype, setFueltype] = useState<string>(itemdetails?.fueltype ?? '');
    const [externalcolor, setExternalcolor] = useState<string>(itemdetails?.externalcolor ?? '');
    const [interior_color, setInterior_color] = useState<string>(itemdetails?.interior_color ?? '')
    const [warranty, setWarranty] = useState<string>(itemdetails?.warranty ?? '');
    const [doors, setDoors] = useState<string>(itemdetails?.doors ?? '');
    const [transmission_types, setTransmission_types] = useState<string>(itemdetails?.transmission_types ?? '');

    const technicalOptions = ['Front Wheel Drive', 'Tiptronic Gears',
        'Cruise Control', 'Dual Exhaust', 'All Wheel Drive',
        'Power Steering',
        '4 Wheel Drive',
        'Rear Wheel Drive',
        'Anti-Lock Brakes/ABS',
        'Front Airbags',
        'All Wheel Steering', 'Side Airbags', 'N2O System'];

    const extraOptions = ['Satellite Radio', 'Bluetooth System', 'Spoiler', 'Premium Paint',
        'Power Windows', 'Sunroof', 'Keyless Entry', 'Off-Road Tyres', 'Power Seats',
        'Heated Seats', 'Rear View Camera', 'Power Locks', 'Premium Wheels/Rims',
        'Winch', 'Alarm/Anti-Theft System', 'Cooled Seats', 'Keyless Start', 'Body Kit',
        'Navigation System', 'Premium Lights', 'Cassette Player', 'Fog Lights', 'Leather Seats',
        'Roof Rack', 'DVD Player', 'Parking Sensors'
    ];

    useEffect(() => {
        if (itemdetails?.technical_features) {
            try {
                const parsedAmenities = typeof itemdetails.technical_features === 'string'
                    ? JSON.parse(itemdetails.technical_features)
                    : itemdetails.technical_features;

                setTechnical_features(parsedAmenities);
                console.log(parsedAmenities)
            } catch (e) {
                console.error('Invalid amenities JSON:', e);
                setTechnical_features([]);
            }
        }
        if (itemdetails?.extras) {
            try {
                const parsedAmenities = typeof itemdetails.extras === 'string'
                    ? JSON.parse(itemdetails.extras)
                    : itemdetails.extras;

                setExtra(parsedAmenities);
                console.log(parsedAmenities)
            } catch (e) {
                console.error('Invalid amenities JSON:', e);
                setExtra([]);
            }
        }
    }, [itemdetails]);

    const handleChange = (name: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmenityChange = (item: string) => {
        setTechnical_features(prev =>
            prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item]
        );
    };

    const handleExtraChange = (item: string) => {
        setExtra(prev =>
            prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item]
        );
    };


    /* 
        const handleAmenityChange = (key) => {
            setAmenities({ ...amenities, [key]: !amenities[key] });
        }; */


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

        setLoading(true);

        // Prepare plain object for raw JSON
        const formDataPayload = {
            youtubeURL: formData.youtubeURL,
            phoneNo: formData.phoneNo,
            price: formData.price,
            whatsapp: formData.whatsapp,
            description: formData.description,
            fueltype: fueltype,
            externalcolor: externalcolor,
            interior_color: interior_color,
            warranty: warranty,
            doors: doors,
            transmission_types: transmission_types,
            seating_capacity: seating_capacity,
            horosepower: formData.horosepower,
            steering_side: steering_side,
            add_post: 'Motors',
            technical_features: technical_features,
            extras: extra,
            location: formData.location,
            status: 'active',
            id: id
        };
        console.log('Sending JSON:', JSON.stringify(formDataPayload));
        console.log(base.BASE_URL + '/apis/motors/updatemotors');

        try {
            const response = await fetch(base.BASE_URL + '/apis/motors/updatemotors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formDataPayload),
            });

            const result = await response.json();
            console.log('..response.res.details step.', result);

            if (response.ok) {
                console.log('..response...', result.data._id);
                /* open modal popup for payment */
                /*  navigation.navigate("ConfirmAds", {
                     item: 'Motors'
                 }); */
                navigation.navigate('PaymentScreenMotors', {
                    id: result.data._id,
                    type: 'payment', userid: userid
                });
            } else {
                Alert.alert('Error', result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Network Error:', error);
            Alert.alert('Error', 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const handlePropertyTypeSelect = (type : string) => {
        setFueltype(type);
    };
    const handleExtronalColorSelect = (type : string) => {
        setExternalcolor(type);
    };

    const handleInternalColorSelect = (type : string) => {
        setInterior_color(type);
    };
    //
    const handleWarrantySelect = (type : string) => {
        setWarranty(type);
    };
    const handledoorsSelect = (type : string) => {
        setDoors(type);
    };
    const handleTransmissionSelect = (type : string) => {
        setTransmission_types(type);
    };
    //handleTransmissionSelect
    const handleSeatingSelect = (type : string) => {
        setSeating_capacity(type);
    };
    const handleSteeringsideSelect = (type : string) => {
        setSteering_side(type);
    }


    return (
        <SafeAreaView style={{ backgroundColor: '#ffffff' }}>
            {/* Fixed Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.navigate("Motors")} style={{ flexDirection: 'row' }}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                    <Text style={{ fontSize: 16, marginLeft: 5 }}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={loading}
                    style={styles.nextButton}
                >
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Text style={styles.nextButtonText}>
                            Finish
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                {/* Inputs 
                <Text>ID : {id}</Text> */}
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10,
                    marginTop: 55
                }}>

                    <View style={{

                        marginBottom: 5
                    }}>
                        <Text style={{ fontSize: 14, }}>YouTube URL </Text>
                    </View>
                    <TextInput
                        placeholder="YouTube URL"
                        value={formData.youtubeURL}
                        onChangeText={(text) => handleChange('youtubeURL', text)}
                        style={styles.input}
                    />
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{

                        marginBottom: 5
                    }}>
                        <Text style={{ fontSize: 14, }}>Phone No </Text>
                    </View>

                    <View style={styles.phoneWrapper}>
                        {/* Country Code */}
                        <View style={styles.codeContainer}>
                            <TextInput
                                placeholder="+971"
                                keyboardType="phone-pad"
                                value={formData.phonecode ?? ''}
                                onChangeText={(text) => handleChange('phonecode', text)}
                                style={styles.codeInput}
                                maxLength={5}
                            />
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Phone Number */}
                        <TextInput
                            placeholder="Mobile number"
                            keyboardType="phone-pad"
                            value={formData.phoneNo?.toString() ?? ''}
                            onChangeText={(text) => handleChange('phoneNo', text)}
                            style={styles.phoneInput}
                        />
                    </View>

                </View>

                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{

                        marginBottom: 5
                    }}>
                        <Text style={{ fontSize: 14, }}>Whatsapps No</Text>
                    </View>
                   {/*  <TextInput
                        placeholder=""
                        keyboardType="phone-pad"
                        value={formData.whatsapp?.toString() ?? ''}
                        onChangeText={(text) => handleChange('whatsapp', text)}
                        style={styles.input}
                    /> */}
                                        <View style={styles.phoneWrapper}>
                        {/* Country Code */}
                        <View style={styles.codeContainer}>
                            <TextInput
                                placeholder="+971"
                                keyboardType="phone-pad"
                                value={formData.phonecode ?? ''}
                                onChangeText={(text) => handleChange('phonecode', text)}
                                style={styles.codeInput}
                                maxLength={5}
                            />
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Phone Number */}
                        <TextInput
                            placeholder="Mobile number"
                            keyboardType="phone-pad"
                            value={formData.whatsapp?.toString() ?? ''}
                            onChangeText={(text) => handleChange('whatsapp', text)}
                            style={styles.phoneInput}
                        />
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Price </Text>
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
                            style={styles.inputcurrency}
                        />
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Describe </Text>
                    </View>
                    <TextInput
                        placeholder=""
                        value={formData.description}
                        onChangeText={(text) => handleChange('description', text)}
                        style={[styles.input, { height: 100 }]}
                        multiline
                    />
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Fuel Type </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownScroll}>
                            {['Gasoline', 'Diesel', 'Hybrid', 'Electric'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => handlePropertyTypeSelect(type)}
                                    style={[
                                        styles.propertyButton,
                                        fueltype === type && styles.selectedButton,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.propertyText,
                                            fueltype === type && styles.selectedText,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Exterior Color </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['Bronze', 'Pink', 'Black', 'Blue', 'Brown', 'Burgundy', 'Gold', 'Grey', 'Orange', 'Green', 'Purple', 'Red', 'Silver', 'Beige', 'Tan', 'Teal', 'White', 'Yellow', 'Other Color'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleExtronalColorSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    externalcolor === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        externalcolor === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>

                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Interior color </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['Bronze', 'Pink', 'Black', 'Blue', 'Brown', 'Burgundy', 'Gold', 'Grey', 'Orange', 'Green', 'Purple', 'Red', 'Silver', 'Beige', 'Tan', 'Teal', 'White', 'Yellow', 'Other Color'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleInternalColorSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    interior_color === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        interior_color === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>
                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Warranty </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['Yes', 'No', 'Does not apply'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleWarrantySelect(type)}
                                style={[
                                    styles.propertyButton,
                                    warranty === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        warranty === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>
                    <View style={{ marginBottom: 5 }}>
                        <Text style={{ fontSize: 14, }}>Doors </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['2 door', '3 door', '4 door', '5+ door'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handledoorsSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    doors === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        doors === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>
                    <View style={{ marginBottom: 5 }}>
                        <Text style={{
                            fontSize: 14
                        }}>Transmission type </Text>
                    </View> {/* handleTransmissionSelect */}
                    <View style={styles.propertyTypeContainer}>
                        {['Manual Transmission', 'Automatic Transmission'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleTransmissionSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    transmission_types === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        transmission_types === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ borderWidth: 2, borderColor: '#f2f2f2', padding: 10 }}>
                    <View>
                        <Text style={{
                            marginBottom: 7,
                            fontSize: 14,
                        }}>Seating Capacity </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['2 Seater', '4 Seater', '5 Seater', '6 Seater', '7 Seater', '8 Seater', '8+ Seater'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleSeatingSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    seating_capacity === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        seating_capacity === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10
                }}>
                    <View style={{ marginBottom: 5 }}>
                        <Text style={{
                            marginBottom: 7,
                            fontSize: 14,
                        }}>Horsepower </Text>
                    </View>

                    <TextInput
                        placeholder=""
                        value={formData.horosepower?.toString() ?? ''}
                        onChangeText={(text) => handleChange('horosepower', text)}
                        style={styles.input}
                    />
                </View>
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10
                }}>
                    <View style={{ marginBottom: 5 }}>
                        <Text style={{
                            marginBottom: 7,
                            fontSize: 14,
                        }}>Steering Side </Text>
                    </View>
                    <View style={styles.propertyTypeContainer}>
                        {['Left Hand', 'Right Hand'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => handleSteeringsideSelect(type)}
                                style={[
                                    styles.propertyButton,
                                    steering_side === type && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.propertyText,
                                        steering_side === type && styles.selectedText,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10
                }}>
                    <View style={{
                        marginBottom: 5,

                    }}>
                        <Text style={{
                            fontSize: 14,
                        }}>Technical Features </Text>
                    </View>
                    <View style={styles.amenityContainer}>
                        {technicalOptions.map((item) => {
                            const selected = technical_features.includes(item);
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
                </View>
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10
                }}>
                    <View style={{ marginBottom: 7 }}>
                        <Text style={{
                            fontSize: 14,
                        }}>Extras </Text>
                    </View>
                    <View style={styles.amenityContainer}>
                        {extraOptions.map((item) => {
                            const selected = extra.includes(item);
                            return (
                                <Pressable
                                    key={item}
                                    onPress={() => handleExtraChange(item)}
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
                </View>
                <View style={{
                    borderWidth: 2, borderColor: '#f2f2f2',
                    padding: 10
                }}>
                    <View style={{ marginBottom: 0 }}>
                        <Text style={{
                            fontSize: 14,
                        }}> Location </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.locationWrapper}
                        activeOpacity={0.8}
                        onPress={() => console.log('Implement Google Places Picker here')}
                    >
                        <Icon name="map-pin" size={20} color="#555" style={styles.locationIcon} />
                        <TextInput
                            placeholder="Enter Location"
                            placeholderTextColor="#888"
                            value={formData.location}
                            onChangeText={(text) => handleChange('location', text)}
                            style={styles.locationInput}
                            editable={true}
                            pointerEvents="none"
                        />
                    </TouchableOpacity>
                </View>

            </ScrollView>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    inputphonecode: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 5,
        color: '#000', width: 50
    },
    input: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 5,
        color: '#000',
    },
    inputprice: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 5,
        color: '#000', width: '50%'
    },
    inputcurrency: {
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 5,
        color: '#000', width: 100
    },
    sectionTitle: {
        fontSize: 18,

        marginBottom: 8,
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
        fontSize: 18,

        marginBottom: 12,
        color: '#000',
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
    },
    activeButtonText: {
        color: '#fff',

    },
    amenityContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start", // or "space-between" if you want spacing
        gap: 10,
    },
    amenityButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#f2f2f2",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 10,
        alignSelf: "flex-start", // makes button only as wide as content
    },

    amenityButtonSelected: {
        backgroundColor: "#000",
        borderColor: "#000",
    },
    amenityText: {
        fontSize: 14,
        color: "#444",
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1, marginBottom: 50
    },
    locationIcon: {
        marginRight: 10,
    },
    locationInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    propertyTypeContainer: {
        flexDirection: 'row',
        // justifyContent: 'space-around',
        marginBottom: 5,
        height: 50,
    },
    propertyButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        height: 40,
        alignItems: 'center', marginRight: 10
    },
    propertyText: {
        fontSize: 13,
        color: '#333',
    },
    selectedButton: {
        backgroundColor: '#000',
    },
    selectedText: {
        color: '#ffffff'
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: '#fff',
        zIndex: 999,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },

    nextButton: {
        width: 100,
        height: 40,
        backgroundColor: '#000',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    phoneWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        height: 52,
    },

    codeContainer: {
        width: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },

    codeInput: {
        fontSize: 16,
        textAlign: 'center',
        color: '#000',
    },

    divider: {
        width: 1,
        height: '60%',
        backgroundColor: '#ddd',
        marginHorizontal: 8,
    },

    phoneInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: 0,
    },

});
