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
import Colors from '../../../constants/colors';
import api from '../../../component/api';

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

/* const categories = [
    { id: '1', name: 'Residential', subcategories: ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Hotel Apartment', 'Residential Building', 'Residential Building', 'Residential Floor', 'Villa Compound'] },
    { id: '2', name: 'Commercial', subcategories: ['Office', 'Retail', 'Industrial', 'Shop', 'Warehouse', 'Commercial Floor', 'Commercial Building', 'Commercial Villa', 'Factory', 'Showroom'] }
];
 */
const agents = [{ id: '1', name: 'Landlord' },
{ id: '2', name: 'Agent' }, { id: '3', name: "Company" }];

export default function CreateAds() {
    const navigation = useNavigation();
    const route = useRoute();
    const { item } = route.params || {}; // prevents crash if params is undefined
    const { location } = route.params || {}; // prevents crash if params is undefined
    console.log('...city.....' + JSON.stringify(item))
    // const [selectedCity, setSelectedCity] = useState(item?.city);
    //  const [selectedCity, setSelectedCity] = useState(item?.city || data?.city || '');
    const [selectedCity, setSelectedCity] = useState(item?.city || location?.city || '');
    const [lat, setLat] = useState(item?.lat || location?.latitude || '');
    const [long, setLong] = useState(item?.long || location?.longitude || '');
    const [propertyType, setPropertyType] = useState(item?.propertyType);
    const [title, setTitle] = useState(item?.shortTitle);
    // const [images, setImages] = useState([]);
    const [previousimages, setPreviousimage] = useState(Array.isArray(item?.images) ? item.images : []);
    const [images, setImages] = useState([]);
    const [localimage, setLocalimage] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState(item?.mainCategory);
    const [selectedagent, setSelectedagent] = useState(item?.landlordAgent);
    const [selectedSubcategory, setSelectedSubcategory] = useState(item?.subCategory);
    const [imageUri, setImageUri] = useState(null);
    const [userid, setUserid] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        checkUser()
        //   fetchCategory()
        console.log('....ids....' + JSON.stringify(item));
        //fetch previous data
        if(item)
        {
        setPropertyType(item?.propertyType);
        fetchCategory(item?.propertyType);
        setSelectedCategory(item?.mainCategory)
       // setSelectedSubcategory(item?.subCategory)
        fetchSubCategoryfrmdb(item?.mainCategory)
       // getSubcategories(item)
        }
    }, [])

    const fetchCategory = async (type) => {
        // Alert.alert(type)
        setLoading(true);
        try {
            const res = await api.get("/apis/categories/list?type=Property"); // fetch all categories

            //   const selecttype = type; // this is your selected type from state
            // Filter categories based on selecttype
            const filteredCategories = res.data.filter(
                (category) => category.propertytype === type
            );
            console.log("Filtered categories:", type, filteredCategories);
            console.log("categories:", res.data);
            /*             
                {
                "_id": "69d2ad435cb6171316e3de2d",
                "name": "Residential",
                "type": "Property",
                "image": null,
                "parentId": null,
                "createdAt": "2026-04-05T18:43:15.920Z",
                "updatedAt": "2026-04-07T10:11:32.565Z",
                "__v": 0,
                "propertytype": "Property for Rent"
                }
            */
            setCategories(filteredCategories);
            
          //  setSelectedSubcategory(res.data[0]?.subcategories)
          //  console.log('.....subcategory data......', res.data[0]?.subcategories)
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubCategoryfrmdb = async (categoryid) => {
        console.log('load sub cat', categoryid)
        // Alert.alert(type)
        setLoading(true);
        try {
            const res = await api.get("/apis/categories/subcategories/" + categoryid); // fetch all categories
            console.log("...sub categorires 2", JSON.stringify(res.data));
            setSubCategories(res.data); 
           } 
        catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };


    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        console.log(
            ".....USER Data....." +
            JSON.stringify(await AsyncStorage.getItem("userdata"))
        );

        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            console.log("user id....." + userData._id);
            setUserid(userData._id);
            // setUserinfo(userData);
        } else {
            console.log("No user data found");
        }

    }


    const handleCitySelect = (cityId) => {
        setSelectedCity(cityId);
    };

    const handlePropertyTypeSelect = (type) => {
        console.log('...here 1 ', type)
        setPropertyType(type);
        fetchCategory(type)
        //  Alert.alert(type)
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
        if (propertyType == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Property Type',
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
        if (selectedagent == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the selected agent',
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
        formData.append('country', "United Arab Emirates");
        formData.append('city', selectedCity);
        formData.append('propertyType', propertyType);
        formData.append('shortTitle', title);
        formData.append('mainCategory', selectedCategory);
        formData.append('subCategory', selectedSubcategory);
        formData.append('landlordAgent', selectedagent);
        formData.append('userid', userid);
        formData.append('add_post', 'Property');
        formData.append('lat', lat);
        formData.append('long', long);
        formData.append('location', location?.address);
        if (item?._id) {
            formData.append('_id', item._id);
        }
        console.log(base.BASE_URL + '/apis/property/updatestep1');
        try {
            const response = await fetch(base.BASE_URL + '/apis/property/updatestep1', {
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
                navigation.navigate("CreateAdsdetails", {
                    id: item._id,
                    itemdetails: item, userid: userid
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
        if (propertyType == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the Property Type',
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
        if (selectedagent == null) {
            Toast.show({
                type: 'error',
                text1: 'Select the selected agent',
                text2: 'Upload failed',
            });
            return
        }
        setLoading(true)
        const formData = new FormData();
        // console.log(JSON.stringify(images))
        images.forEach((imageUri, index) => {
            formData.append('images', {
                uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
                type: 'image/jpeg',
                name: `image${index + 1}.jpg`,
            });
        });
        formData.append('country', location?.country);
        formData.append('city', selectedCity);
        formData.append('propertyType', propertyType);
        formData.append('shortTitle', title);
        formData.append('mainCategory', selectedCategory);
        formData.append('subCategory', selectedSubcategory);
        formData.append('landlordAgent', selectedagent);
        formData.append('userid', userid);
        formData.append('add_post', 'Property');
        formData.append('lat', lat);
        formData.append('long', long);
        formData.append('location', location?.address);
        if (item?._id) {
            formData.append('id', item._id);
        }
        try {
            const response = await fetch(base.BASE_URL + '/apis/property/addproperty', {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = await response.json();
            if (response.ok) {
                console.log('..response...' + result.ad)
                setLoading(false)
                navigation.navigate("CreateAdsdetails", {
                    id: result.ad._id,
                    itemdetails: null, userid: userid

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

    /*     const getSubcategories = () => {
            const category = categories.find(cat => cat.name === selectedCategory);
            return category ? category.subcategories : [];
        };
     */
    const getSubcategories = (item) => {
        console.log('...sub categorires 1', JSON.stringify(item?.subcategories))
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

    const handleDeleteImage = (index) => {
        const updatedImages = [...images];
        updatedImages.splice(index, 1);
        setImages(updatedImages);
    };

    const handleDeletedatabaseImage = async (image) => {
        console.log("Deleting image:", image);
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
                            const res = await api.post(
                                `/apis/property/deleteimage/${item._id}`,
                                {
                                    imageId: image?._id,
                                    imagePath: image?.image,
                                }
                            );

                            console.log("Image deleted:", res.data);
                          //  Alert.alert(res.data.message)

                            // ✅ 🔥 UPDATE UI HERE setPreviousimage
                            setPreviousimage((prev) =>
                                prev.filter((img) => img._id !== image._id)
                            );

                            Alert.alert("Success", res.data.message);
                            // after deleted image how to update
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
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    height: 40
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
                    <TouchableOpacity onPress={() => {
                        navigation.navigate("MyAds")
                    }}>
                        {/*  <Text style={{
                        fontSize: 12,
                        fontWeight: 'bold'
                    }}>Draft</Text> */}
                    </TouchableOpacity>
                </View>
                {/* Cities FlatList */}
                <View>
                    <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Select a City
                    </Text>
                    <Text style={{ marginBottom: 15, fontSize: 11 }}>Where should we place your Ad ?</Text>
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
                <Text style={styles.caption}>
                    Select Type
                </Text>
                <View style={styles.propertyTypeContainer}>
                    {['Property for Rent', 'Property for Sale', 'Off-plan Properties'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => handlePropertyTypeSelect(type)}
                            style={[
                                styles.propertyButton,
                                propertyType === type && styles.selectedButton,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.propertyText,
                                    propertyType === type && styles.selectedText,
                                ]}
                            >
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
                <Text style={styles.maincaption}>Select Main Category</Text>
                <View style={{ height: 60 }}>
                    <FlatList
                        data={categories}
                        horizontal
                        keyExtractor={(item) => item.name}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedCategory(item._id);
                                    setSelectedSubcategory('');
                                    getSubcategories(item)
                                }}
                                style={[
                                    styles.cityButton,
                                    selectedCategory === item._id && styles.selectedButton,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cityText,
                                        selectedCategory === item._id && styles.selectedText,
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
                {/* Subcategory Dropdown */}
                <View>
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

                </View>

                <Text style={styles.landlordcaption}>Are you a landlord or an agent ? </Text>
                <FlatList
                    data={agents}
                    horizontal
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedagent(item.name)}
                            style={[
                                styles.cityButton,
                                selectedagent === item.name && styles.selectedButton,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.cityText,
                                    selectedagent === item.name && styles.selectedText,
                                ]}
                            >
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 10 }}
                />

                <TouchableOpacity style={styles.imageButton} onPress={handleImagePick}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="camera" size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#000', fontSize: 12 }}>Add Picture (Max 5)</Text>
                    </View>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
                    {previousimages?.map((uri, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image
                                source={{ uri: base.BASE_URL + `${uri.image}` }}
                                style={styles.imageStyle}
                            />
                            {/*   <Text>{uri.image}</Text> */}
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeletedatabaseImage(uri)}
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



                <Toast />
            </ScrollView>
            {/* Continue Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={item?._id ? updatestep1 : handleContinue}
                    // onPress={handleContinue}
                    disabled={loading}
                    style={[
                        styles.button,
                        { backgroundColor: loading ? Colors.disabled : Colors.black }
                    ]}
                >
                    {
                        loading ?
                            <ActivityIndicator color={Colors.white} />
                            :
                            <Text style={styles.buttonText}>
                                {item?._id ? 'Continue Editing' : 'Continue'}
                            </Text>
                    }

                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16, backgroundColor: '#fff',
    },
    cityButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginRight: 10,
        height: 40, marginBottom: 10
    },
    selectedButton: {
        backgroundColor: Colors.black,
    },
    cityText: {
        fontSize: 12,
        color: Colors.black,
    },
    cityText1: {
        fontSize: 12,
        color: Colors.white,
    },

    selectedText: {
        color: Colors.white,
        fontWeight: 'bold',
    },
    selectedText1: {
        color: Colors.black,
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
        height: 40,
        alignItems: 'center', marginRight: 10
    },
    propertyText: {
        fontSize: 11,
        color: '#333',
    },
    caption: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 5,
    },
    landlordcaption:
    {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 9,

    },
    maincaption: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 9,
    },
    subCaption: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 20, fontSize: 12
    },
    dropdown: {
        marginBottom: 10, flexDirection: 'row'
    },
    dropdownItem: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginBottom: 10, marginRight: 15,
        color: '#000'
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
        bottom: 0,
        width: '100%',
        justifyContent: 'center',
        padding: 0,
        alignItems: 'center',
        alignSelf: 'center'
    },
    button: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    imageButton: {
        padding: 12,
        backgroundColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
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
    label: {
        fontSize: 12, fontWeight: 'bold'
    }
});
