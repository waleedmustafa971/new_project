import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    TextInput, Button, StyleSheet, Image, ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // You can also use FontAwesome, MaterialIcons, etc.
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as base from '../../../component/global'
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../../component/api';
import axios from 'axios';

type Category = {
  _id: string;
  name: string;
};

type Logs = {
    currency?: string;
    country_name?: string;
}

const cities = [
    { id: '1', name: 'Abu Dhabi' },
    { id: '2', name: 'Ajman' },
    { id: '3', name: 'Al Ain' },
    { id: '4', name: 'Dubai' },
    { id: '5', name: 'Fujairah' },
    { id: '6', name: 'Ras al Khaimah' },
    { id: '7', name: 'Sharjah' },
    { id: '8', name: 'Umm ai Quwain' },
];

const categories = [
    { id: '1', name: 'Cars', subcategories: ['Apartment', 'Villa'] },
    { id: '2', name: 'Motorcycles', subcategories: ['Sport Bike', 'Adventure / Touring', 'Cruiser / Chopper', 'Off-Road', 'Scooter', 'Standard / Commuter', 'Café racer', 'Trike', 'Trailer', 'Karting', 'Mo-Ped', 'Glof Cart', 'Other'] },
    { id: '3', name: 'Auto Accessories & Parts', subcategories: ['Car/4x4 Parts', 'Apparel, Merchandise & Accessories', 'Motorcycle Parts', 'Automotive Tools', 'Boat Parts', 'Other Vehicle Parts'] },
    { id: '4', name: 'Heavy Vehicles', subcategories: ['Trucks', 'Buses', 'Forklifs', 'Trailers', 'Cranes', 'Tankers', 'Parts & Engines', 'Aircrafts', 'Other Heavy Vehicles'] },
    { id: '5', name: 'Boats', subcategories: ['Motorboats', 'Sailboats', 'Row/Paddle Boats'] },
    { id: '6', name: 'Number Plates', subcategories: ['Dubai plate', 'Abu Dhabi plate', 'Sharjah plate', 'Ajman plate', 'Fujairah plate', 'Umm al Quwain plate', 'Ras al Khaimah plate'] },
];

const regionaldata = [
    { id: '1', name: 'GCC Specs' },
    { id: '2', name: 'American Specs' },
    { id: '3', name: "Canadian Specs" },
    { id: '4', name: "European Specs" },
    { id: '5', name: "Japanese Specs" },
    { id: '6', name: "Korean Specs" },
    { id: '7', name: "Chinese Specs" },
    { id: '8', name: "Other" }
];
/* trimdata */
const trimdata = [
    { id: '1', name: 'spider' },
    { id: '2', name: 'other' }
];
/* bodytypedata */
const bodytypedata = [
    { id: '1', name: 'SUV' },
    { id: '2', name: 'Coupe' },
    { id: '3', name: 'Sedan' },
    { id: '4', name: 'Crossover' },
    { id: '5', name: 'Hard Top Convertible' },
    { id: '6', name: 'Pick up Truck' },
    { id: '7', name: 'Hatchback' },
    { id: '8', name: 'Soft Top Convertible' },
    { id: '9', name: 'Sports Car' },
    { id: '10', name: 'Van' },
    { id: '11', name: 'Wagon' },
    { id: '12', name: 'Utility Truck' },
    { id: '13', name: 'Other' }
];

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  TestSound: undefined;
  FilterClassified: undefined;
  SeeAllProduct: { category: string, subcategories: object },
  MotorsAdsdetails: { id: string, itemdetails: object, userid: string }
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MotorsAds() {

    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<any>()
    const { item } = route.params || {}; // prevents crash if params is undefined
    console.log('...city.....' + JSON.stringify(item))
    const [selectedCity, setSelectedCity] = useState(item?.city);
    const [propertyType, setPropertyType] = useState(item?.propertyType);
    const [title, setTitle] = useState(item?.shortTitle); //makemodel
    const [makemodel, setMakemodel] = useState(item?.makemodel); //makemodel currency
   // const [currency, setCurrency] = useState(item?.currency); //makemodel currency
    const [currency, setCurrency] = useState(item?.currency || "AED");

    // const [images, setImages] = useState([]);
    const [previousimages, setPreviousimage] = useState(Array.isArray(item?.images) ? item.images : []);
    const [images, setImages] = useState([]);
    const [localimage, setLocalimage] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState(item?.mainCategory);
    const [selectedSubcategory, setSelectedSubcategory] = useState(item?.subCategory);

    const [selectedagent, setSelectedagent] = useState(item?.landlordAgent); //setSelectedagent
    const [trim, setTrim] = useState(item?.trim);
    const [regional_specs, setRegional_specs] = useState(item?.regional_specs)
    const [year, setYear] = useState(item?.year)
    const [kilometers, setKilometers] = useState(item?.kilometers) //
    const [bodytype, setBodytype] = useState(item?.bodytype) //bodytype
    const [imageUri, setImageUri] = useState(null);
    const [userid, setUserid] = useState(null)
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<Category[]>([]);
    const [logs, setLogs] = useState<Logs[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    
    useEffect(() => {
        checkUser()
        console.log('....ids....' + item);
    }, [])

    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
      /*   console.log(
            ".....USER Data....." +
            JSON.stringify(await AsyncStorage.getItem("userdata"))
        ); */

        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            console.log("user id....." + userData._id);
            setUserid(userData._id);
            // setUserinfo(userData);
             fetchCategory()
             fetchLogs();
        } else {
            console.log("No user data found");
        }

    }
    const fetchCategory = async () => {
        setLoading(true);
        try {
            const res = await api.get("/apis/categories/list?type=Motors");
            setCategories(res.data);
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }

    }

const fetchLogs = async () => {
  /* setLoading(true);
  try {
    const res = await axios.get("https://ipapi.co/json/");
    if (res) {
      setLogs(res.data); // Save the IP info in state
      console.log('Fetched IP info:', res.data);
    }
  } catch (error : any) {
    console.error("Fetch error:", error.message);
    setLogs([]); // reset logs on error
  } finally {
    setLoading(false);
  } */
};


    const handleCitySelect = (cityId : string) => {
        setSelectedCity(cityId);
    };

    const handlePropertyTypeSelect = (type : string) => {
        setPropertyType(type);
    };
    const updatestep1 = async () => {
        console.log('update')

        if (images.length === 0 && previousimages.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Select the image from Add Picture Section',
                text2: 'Upload failed',
            });
            return
        }
        if (userid == null) {
            Toast.show({
                type: 'error',
                text1: 'User ID Not Found',
                text2: 'Validation',
            });
            return
        }
        if (selectedCity == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the City from Select a city',
                text2: 'Upload failed',
            });
            return
        }
       
        if (title == null) {
            Toast.show({
                type: 'error',
                text1: 'Enter the Short Title',
                text2: 'Upload failed',
            });
            return
        }
        if (selectedCategory == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Main category',
                text2: 'Upload failed',
            });
            return
        }
        if (selectedSubcategory == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Sub category',
                text2: 'Upload failed',
            });
            return
        }
      
        setLoading(true)
        const formData = new FormData();
        console.log(JSON.stringify(images))
        images.forEach((imageUri, index) => {
            formData.append('images', {
                uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
                type: 'image/jpeg',
                name: `image${index + 1}.jpg`,
            });
        });
        formData.append('country', "UAE");
        formData.append('city', selectedCity);
        formData.append('shortTitle', title);
        formData.append('mainCategory', selectedCategory);
        formData.append('subCategory', selectedSubcategory);
        formData.append('makemodel', makemodel);
        formData.append('trim', trim);
        formData.append('regional_specs', regional_specs);
        formData.append('year', year);
        formData.append('kilometers', kilometers);
        formData.append('bodytype', bodytype);
        formData.append('userid', userid);
        if (item?._id) {
            formData.append('_id', item._id);
        }
        console.log(base.BASE_URL + '/apis/motors/updatestep1');
        try {
            const response = await fetch(base.BASE_URL + '/apis/motors/updatestep1', {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = await response.json();
            if (response.ok) {
                console.log('..response...' + result.ad)
                //  Alert.alert('Success', 'Property Uploaded Successfully');
                setLoading(false)
                navigation.navigate("MotorsAdsdetails", {
                    id: item._id,
                    itemdetails: item

                });
            } else {
                setLoading(false)
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error(error);
            setLoading(false)
            Alert.alert('Error', 'Failed to upload property');
        }
    }

    const handleContinue = async () => {
        console.log('Add')
        if (images.length === 0) {
            Toast.show({
                type: 'error',
                text1: 'Select the image from Add Picture Section',
                text2: 'Upload failed',
            });
            return
        }

        if (userid == null) {
            Toast.show({
                type: 'error',
                text1: 'User ID Not Found',
                text2: 'Validation',
            });
            return
        }
        if (selectedCity == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the City from Select a city',
                text2: 'Upload failed',
            });
            return
        }
        if (title == null) {
            Toast.show({
                type: 'error',
                text1: 'Enter the Short Title',
                text2: 'Upload failed',
            });
            return
        }
        if (selectedCategory == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Main category',
                text2: 'Upload failed',
            });
            return
        }
        if (selectedSubcategory == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Sub category',
                text2: 'Upload failed',
            });
            return
        }

        setLoading(true)
        const formData = new FormData();
        console.log(JSON.stringify(images))
        images.forEach((imageUri, index) => {
            formData.append('images', {
                uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
                type: 'image/jpeg',
                name: `image${index + 1}.jpg`,
            });
        });
        formData.append('country', 'United Arab Emirates');
        formData.append('city', selectedCity);
        formData.append('shortTitle', title);
        formData.append('mainCategory', selectedCategory);
        formData.append('subCategory', selectedSubcategory);
        formData.append('makemodel', makemodel);
        formData.append('trim', trim);
        formData.append('regional_specs', regional_specs);
        formData.append('year', year);
        formData.append('kilometers', kilometers);
        formData.append('bodytype', bodytype); //add_post
        formData.append('currency', 'AED'); //add_post
        formData.append('add_post', 'Motors');
        formData.append('userid', userid);
        formData.append('status', 'draft');
        formData.append('log', logs);
        console.log(base.BASE_URL + '/apis/motors/addmotors');
        try {
            const response = await fetch(base.BASE_URL + '/apis/motors/addmotors', {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = await response.json();
            if (response.ok) {
                console.log('..response..first step .' + result.ad)
                //  Alert.alert('Success', 'Property Uploaded Successfully');
                setLoading(false)
                navigation.navigate("MotorsAdsdetails", {
                    id: result.ad._id,
                    itemdetails: [],
                    userid: userid

                });
            } else {
                setLoading(false)
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error(error);
            setLoading(false)
            Alert.alert('Error', 'Failed to upload property');
        }
    };

  /*   const getSubcategories = () => {
        const category = categories.find(cat => cat.name === selectedCategory);
        return category ? category.subcategories : [];
    }; */
    const getSubcategories = (item: any) => {
        console.log('...sub categorires', JSON.stringify(item?.subcategories))
        setSubCategories(item?.subcategories)
    };


    const handleImagePick = () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can only select up to 5 images.');
            return;
        }

        launchImageLibrary(
            {
                selectionLimit: 5 - images.length, // Limit remaining slots
                mediaType: 'photo',
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error: ', response.errorMessage);
                } else {
                    const selectedImages = response.assets || [];
                    const newImages = [...images, ...selectedImages.map((img) => img.uri)];
                    setLocalimage(true);
                    if (newImages.length > 5) {
                        Alert.alert('Limit Exceeded', 'You can only add up to 5 images.');
                        setImages(newImages.slice(0, 5));
                    } else {
                        setImages(newImages);
                        setLocalimage(true);
                    }
                }
            }
        );
    };

    const handleDeleteImage = (index : number) => {
        const updatedImages = [...images];
        updatedImages.splice(index, 1);
        setImages(updatedImages);
    };

    const handleDeletedatabaseImage = async (imageid : string, slno : number, image : string) => {
        Alert.alert(
            'Delete Image',
            'Are you sure you want to delete this image?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${base.BASE_URL}/apis/property/deleteimage/${item._id}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    slNo: slno,
                                    imagePath: image,
                                    imageid: imageid
                                }),
                            });


                            const data = await res.json();
                            if (res.ok) {
                                // Update UI, refetch data or remove image from local state
                                console.log('Image deleted:', data);
                            } else {
                                console.error('Delete failed:', data.error);
                            }
                        } catch (err) {
                            console.error('Error deleting image:', err);
                        }
                    },
                },
            ]
        );
    };


    return (

        <View style={{ flex: 1 }}>
            {/* Fixed Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.navigate("Motors")} style={{ flexDirection: 'row' }}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 5 }}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={item?._id ? updatestep1 : handleContinue}
                    disabled={loading}
                    style={styles.nextButton}
                >
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Text style={styles.nextButtonText}>
                            {item?._id ? 'Next' : 'Next'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingTop: 60 }} // add top padding to avoid overlap
                style={styles.container}
            >

                <TouchableOpacity style={styles.imageButton} onPress={handleImagePick}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="camera" size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#000' }}>Add Picture (Max 5)</Text>
                    </View>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
                    {previousimages?.map((uri : string , index : number) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image
                                source={{ uri: base.BASE_URL + `${uri.image}` }}
                                style={styles.imageStyle}
                            />
                            {/*   <Text>{uri.image}</Text> */}
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeletedatabaseImage(uri._id, uri.slNo, uri.image)}
                            >
                                <Icon name="x" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}



                    {/* end previous image */}
                    {images?.map((uri, index) => (
                        <View key={index} style={styles.imageContainer}>
                            {/*  <Image source={{ uri }} style={styles.imageStyle} /> */}
                            {
                                localimage === true ?
                                    <Image source={{ uri: uri }} style={styles.imageStyle} />
                                    :
                                    <Image
                                        source={{ uri: base.BASE_URL + `${uri.image}` }}
                                        style={styles.imageStyle}
                                    />
                            }

                            {/* <Text>{uri.image}</Text> */}
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteImage(index)}
                            >
                                <Icon name="x" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>

                {/* Cities FlatList */}
                <View>
                    <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Select a City</Text>
                    <Text style={{ marginBottom: 15 }}>Where should we place your Ad ?</Text>
                    <FlatList
                        data={cities}
                        horizontal
                        keyExtractor={(item) => item.name}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleCitySelect(item.name)}
                                style={[
                                    styles.cityButton,
                                    selectedCity === item.name && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cityText,
                                        selectedCity === item.name && styles.selectedText,
                                    ]}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 5 }}
                    />
                </View>
                {/* Caption and TextInput */}
                <Text style={styles.caption}>
                    Enter a short title
                </Text>
                <Text style={styles.subCaption}>
                    Make your title informative and attractive.
                </Text>
                <TextInput
                    placeholder="Enter title"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Category Dropdown */}
                <Text style={styles.maincaption}>Select Main Category</Text>

                <View style={styles.dropdown}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat._id}
                                onPress={() => {
                                   setSelectedCategory(cat._id);
                                        setSelectedSubcategory(''); // Reset subcategory
                                        getSubcategories(cat)
                                }}
                                style={[
                                    styles.dropdownItem,
                                    selectedCategory === cat._id && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cityText,
                                        selectedCategory === cat._id && styles.selectedText,
                                    ]}
                                >
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

            {selectedCategory ? (
                <>
                    <View style={styles.section}>
                        <Text style={styles.label}>Sub Category

                        </Text>
                        <FlatList
                            data={subCategories}
                            horizontal
                            keyExtractor={(item) => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedSubcategory(item._id)}
                                    style={[
                                        styles.cityButton,
                                        selectedSubcategory === item._id && styles.selectedButton,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.cityText,
                                            selectedSubcategory === item._id && styles.selectedText,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </View>
                </>) : null}
                
                <Text style={styles.landlordcaption}>Make & Model </Text>
                <TextInput
                    placeholder=""
                    style={styles.input}
                    value={makemodel}
                    onChangeText={setMakemodel}
                />
                <Text style={styles.landlordcaption}>Trim * </Text>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => console.log('You can integrate a custom dropdown here')}>
                    {trimdata?.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                                setTrim(cat.name);
                                // setSelectedSubcategory(''); // Reset subcategory
                            }}
                            style={[
                                styles.dropdownItem,
                                trim === cat.name && styles.selectedButton,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.cityText,
                                    selectedCategory === cat.name && styles.selectedText,
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>

                <Text style={styles.landlordcaption}>Regional Specs * </Text>

                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => console.log('You can integrate a custom dropdown here')}
                >
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownScroll}>
                        {regionaldata?.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => {
                                    setRegional_specs(cat.name);
                                    // setSelectedSubcategory('');
                                }}
                                style={[
                                    styles.dropdownItem,
                                    regional_specs === cat.name && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cityText,
                                        selectedCategory === cat.name && styles.selectedText,
                                    ]}
                                >
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </TouchableOpacity>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between'
                }}>
                    <View style={{ width: '50%', marginRight: 5 }}>
                    <Text style={styles.landlordcaption}>Year * </Text>
                    <TextInput
                        placeholder=""
                        style={styles.input}
                        value={year}
                        onChangeText={setYear}
                    />
                    </View>
                     <View style={{ width: '50%' }}>
                    <Text style={styles.landlordcaption}>Kilometers (KM)* </Text>
                    <TextInput
                        placeholder=""
                        style={styles.input}
                        value={kilometers}
                        onChangeText={setKilometers}
                    />
                    </View>
                </View>
                <Text style={styles.landlordcaption}>Body Type * </Text>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => console.log('You can integrate a custom dropdown here')}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownScroll}>
                    {bodytypedata?.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                                setBodytype(cat.name);
                              
                            }}
                            style={[
                                styles.dropdownItem,
                                bodytype === cat.name && styles.selectedButton,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.cityText,
                                    bodytype === cat.name && styles.selectedText,
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    </ScrollView>
                </TouchableOpacity>



            </ScrollView>

            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16, backgroundColor: '#fff',
        flex: 1
    },
    cityButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginRight: 10,
        height: 40, marginBottom: 10
    },
    selectedButton: {
        backgroundColor: '#007BFF',
    },
    cityText: {
        fontSize: 13,
        color: '#333',
    },
    selectedText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    propertyTypeContainer: {
        flexDirection: 'row',
        // justifyContent: 'space-around',
        marginBottom: 10,
        height: 50,
    },
    propertyButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        width: 170,
        height: 40,
        alignItems: 'center', marginRight: 10
    },
    propertyText: {
        fontSize: 13,
        color: '#333',
    },
    caption: {
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 5,
    },
    landlordcaption:
    {
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 9,

    },
    maincaption: {
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 9,
    },
    subCaption: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
    },
    dropdown: {
        marginBottom: 10, flexDirection: 'row'
    },
    dropdownItem: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginBottom: 10, marginRight: 15
    },
    imageButton: {
        padding: 12,
        backgroundColor: '#f2f2f2',
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20, // push it up above the footer (adjust height as needed)
        zIndex: 1111,
        width: '100%',
        justifyContent: 'center',
        padding: 0,
        alignItems: 'center',
        alignSelf: 'center',
        borderWidth: 0,
        borderColor: 'green',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    imageStyle: {
        width: 120,
        height: 120,
        borderRadius: 8,
    },
    deleteButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 4,
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
        backgroundColor: '#007BFF',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
   section: {
        marginTop: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },

});
