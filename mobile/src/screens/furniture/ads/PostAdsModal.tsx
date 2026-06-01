import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform, Image,
    Dimensions, Alert, FlatList, ScrollView,
    ActivityIndicator
} from 'react-native';
//import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/Feather'; // You can also use FontAwesome, MaterialIcons, etc.
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    cities, classifiedCategory, AGE_OPTIONS,
    USAGE_OPTIONS, CONDITIONS_OPTIONS
} from '../../../constants/globalData';
import { launchImageLibrary } from 'react-native-image-picker';
import * as base from '../../../component/global'
import Toast from 'react-native-toast-message';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../../component/api';

const { width } = Dimensions.get("window");
type SubCategory = {
    label: string;
    url: string;
};

type Category = {
    label: string;
    url: string;
    subcategories: SubCategory[];
};

type Props = {
    onClose: () => void;
     onChangevalue: (adId: string) => void;
};

const PostAdsModal: React.FC<Props> = ({ onClose, onChangevalue }) => { 
    const [city, setCity] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [priceTo, setPriceTo] = useState('20000');
    const [selectedCity, setSelectedCity] = useState(""); //item?.city
    const [previousimages, setPreviousimage] = useState([]);//useState(Array.isArray(item?.images) ? item.images : []);
    const [images, setImages] = useState([]); //
    //  const [subCategories, setSubCategories] = useState([]); //setSubCategories
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(""); //item?.mainCategory
    const [selectedSubcategory, setSelectedSubcategory] = useState(""); //item?.subCategory
    const [userid, setUserid] = useState(null)
    const [posttype, setPosttype] = useState('Furniture and Garden')
    const [contactoption, setContactoption] = useState("Messages calls whatsapp");
    const [selectedCurrency, setSelectedCurrency] = useState("AED");
    const [selectedPhoneno, setSelectedPhoneno] = useState('');
    const [phoneNo, setPhoneNo] = useState('')
    const [location, setLocation] = useState('') // 'lat', setLat 'long', setLong
    const [lat, setLat] = useState('') // 'lat', setLat 'long', setLong
    const [long, setLong] = useState('') // 'lat', setLat 'long', setLong
    const [whatsapp, setWhatsapp] = useState('')
    const optionsContacts = [
        "Messages calls whatsapp",
        "whatsapp",
        "calls",
        "message only",
    ];
    const phoneType = [
        'Show Phone No',
        'Hide Phone No',
    ];

    const [selectedPhoneNo, setSelectedPhoneNo] = useState<string>('');
    const [contactOption, setContactOption] = useState<string>('');
    const [localimage, setLocalimage] = useState(false);

    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [selectedUsage, setSelectedUsage] = useState<string | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

    useEffect(() => {
        checkUser()
        // console.log('....ids....' + item);
    }, [])

    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
       /*  console.log(
            ".....USER Data....." +
            JSON.stringify(await AsyncStorage.getItem("userdata"))
        ); */

        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            console.log("user id....." + userData._id);
            setUserid(userData._id);
            // setUserinfo(userData);
            fetchCategory()
        } else {
            console.log("No user data found");
        }

    }
    const fetchCategory = async () => {
        setLoading(true);
        try {
            const res = await api.get("/apis/categories/list?type=Furniture and Garden");
            setCategories(res.data);
            console.log('....furniture & Garden.... ', res.data)
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }

    }


    const handleImagePick = () => {
        if (images.length >= 5) {
            //  Alert.alert('Limit Reached', 'You can only select up to 5 images.');
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
    const handleCitySelect = (cityId: any) => {
        setSelectedCity(cityId);
    };
    const handleDeletedatabaseImage = async ({ imageid, slno, image }: any) => {
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
                            const res = await fetch(`${base.BASE_URL}/apis/property/deleteimage/`, { //${item._id}
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

    const handleDeleteImage = (index: number) => {
        const updatedImages = [...images];
        updatedImages.splice(index, 1);
        setImages(updatedImages);
    };

    const getSubcategories = (item: any) => {
        console.log('...sub categorires', JSON.stringify(item?.subcategories))
        setSubCategories(item?.subcategories)
    };

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
        formData.append('country', "United Arab Emirates");
        formData.append('city', selectedCity);
        formData.append('shortTitle', title);
        formData.append('mainCategory', selectedCategory);
        formData.append('subCategory', selectedSubcategory);
        formData.append('price', price);
        formData.append('contactoptions', contactoption); // phonetype  add_post
        formData.append('add_post', posttype); // phonetype setSelectedPhoneno optiontypes
        formData.append('optiontypes', selectedPhoneno); // phonetype setSelectedPhoneno optiontypes
        formData.append('phoneNo', phoneNo);
        formData.append('whatsapp', whatsapp);
        formData.append('location', location);
        formData.append('currency', selectedCurrency);
        formData.append('userid', userid);
        formData.append('status', 'active');
        formData.append('age', selectedAge);
        formData.append('usage', selectedUsage);
        formData.append('condition', selectedCondition);
     //   console.log(base.BASE_URL + '/apis/property/classifiedadd');
        try {
            const response = await fetch(base.BASE_URL + '/apis/property/classifiedadd', {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = await response.json();
            if (response.ok) {
                console.log('..response...' + result.ad)
               /*  Toast.show({
                    type: 'Success',
                    text1: 'Post Added Successfully',
                    text2: 'success',
                }); */
                //  Alert.alert('Success', 'Property Uploaded Successfully');
                setLoading(false)
                onClose()
                onChangevalue(result?.ad._id);

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



    return (
        <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                    <TouchableOpacity onPress={onClose} style={{
                        flexDirection: 'row'
                    }}>
                        <Ionicons name="chevron-back" size={24} color="#000" />
                        <Text style={styles.headerTitle}>Ads Post</Text>
                    </TouchableOpacity>

                </View>
                <TouchableOpacity onPress={handleContinue} style={styles.applyBtn}>
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Text style={{ color: 'white' }}>Post</Text>
                    )}

                </TouchableOpacity>
            </View>
            <ScrollView style={styles.container}>



                <TouchableOpacity style={styles.imageButton} onPress={handleImagePick}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="camera" size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#000' }}>Add Picture (Max 5)</Text>
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


                {/* City Search */}
                <View style={styles.section}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.inputBox}>
                        <FlatList
                            data={cities}
                            horizontal
                            keyExtractor={(item: any) => item.name}
                            renderItem={({ item }: any) => (
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
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.inputBox}>
                        <FlatList
                            data={categories}
                            horizontal
                            keyExtractor={(item: any) => item.name}
                            renderItem={({ item }: any) => (
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

                <View style={styles.section}>
                    <Text style={styles.label}>Enter a short title</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            placeholder=""
                            value={title}
                            onChangeText={setTitle}
                            style={styles.input}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Product Description</Text>
                    <View style={styles.inputBox}>
                        <TextInput
                            placeholder=""
                            value={description}
                            onChangeText={setDescription}
                            style={styles.inputarea}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>


                {/* Price Filter */}
                <View style={styles.section}>
                    <Text style={styles.label}>Price </Text>
                    <View style={styles.priceRow}>
                        <TextInput
                            placeholder=""
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.twoColumnRow}>

                        {/* Phone Number */}
                        <View style={styles.column}>
                            <Text style={styles.label}>Phone No</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={phoneNo}
                                onChangeText={setPhoneNo}
                                style={styles.priceInput}
                                placeholderTextColor="#000"
                            />
                        </View>

                        {/* WhatsApp Number */}
                        <View style={styles.column}>
                            <Text style={styles.label}>WhatsApp No</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={whatsapp}
                                onChangeText={setWhatsapp}
                                style={styles.priceInput}
                                placeholderTextColor="#000"
                            />
                        </View>

                    </View>
                </View>


                <View style={{ marginBottom: 7, marginTop: 7 }}>
                    <Text style={styles.label}>Do you want to show or hide your phone number?</Text>
                    <View style={styles.priceRow}>
                        {phoneType.map((item) => {
                            const selected = selectedPhoneNo === item;

                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedPhoneNo(item)}
                                    style={[
                                        styles.button,
                                        selected && styles.buttonSelected,
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            selected && styles.buttonTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
                <View>
                    <Text style={styles.label}>Contact Options</Text>

                    <View style={styles.ageContainer}>
                        {optionsContacts?.map((opt: any) => {
                            const selected = contactOption === opt;
                            return (
                                <TouchableOpacity
                                    key={opt}
                                    style={styles.radioRow}
                                    onPress={() => setContactOption(opt)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                                        {selected && <View style={styles.radioInner} />}
                                    </View>

                                    <Text style={styles.radioText}>{opt}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>Age</Text>

                    <View style={styles.ageContainer}>
                        {AGE_OPTIONS?.map((item) => {
                            const isSelected = selectedAge === item;

                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedAge(item)}
                                    style={[
                                        styles.ageItem,
                                        isSelected && styles.ageItemSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.ageText,
                                            isSelected && styles.ageTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Usage</Text>

                    <View style={styles.ageContainer}>
                        {USAGE_OPTIONS?.map((item) => {
                            const isSelected = selectedUsage === item;

                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedUsage(item)}
                                    style={[
                                        styles.ageItem,
                                        isSelected && styles.ageItemSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.ageText,
                                            isSelected && styles.ageTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Condition</Text>
                    <View style={styles.ageContainer}>
                        {CONDITIONS_OPTIONS?.map((item) => {
                            const isSelected = selectedCondition === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => setSelectedCondition(item)}
                                    style={[
                                        styles.ageItem,
                                        isSelected && styles.ageItemSelected,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.ageText,
                                            isSelected && styles.ageTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Location </Text>
                    <View style={styles.priceRow}>
                        <TextInput
                            placeholder=""
                            value={location}
                            onChangeText={setLocation}
                            style={styles.priceInput}
                            placeholderTextColor="#000"
                        />
                    </View>
                </View>
                <View style={{ marginBottom: 50 }} />

            </ScrollView>
            <Toast />
        </KeyboardAvoidingView>
    );
};

export default PostAdsModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        padding: 16, borderTopWidth: 2, borderTopColor: '#f2f2f2'
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#eee', height: 50, padding: 10
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

    headerTitle: {
        fontSize: 12,
        fontWeight: '600', marginLeft: 3, marginTop: 3
    },

    section: {
        marginTop: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },

    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 0,
    },
    input: {
        flex: 1,
        height: 45,
        marginLeft: 0,
        fontSize: 12, color: '#000', backgroundColor: "#f2f2f2",
        borderRadius: 10, padding: 5
    },

    inputarea: {
        flex: 1,
        height: 120,
        marginLeft: 0,
        fontSize: 12, color: '#000', backgroundColor: "#f2f2f2",
        borderRadius: 10, padding: 5
    },


    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceInput: {
        flex: 1,
        height: 45,
        backgroundColor: '#f4f4f4',
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 12,
    },
    toText: {
        marginHorizontal: 10,
        fontSize: 12,
        color: '#777',
    },

    applyBtn: {
        marginTop: 'auto',
        backgroundColor: '#000',
        height: 30, width: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    ageContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },

    ageItem: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f2f2f2',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },

    ageItemSelected: {
        backgroundColor: '#000',
        borderColor: '#000',
    },

    ageText: {
        fontSize: 12,
        color: '#333',
    },

    ageTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    imageButton: {
        padding: 12,
        backgroundColor: '#f2f2f2',
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    cityButton: {
        padding: 12,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginRight: 10,
        height: 40, marginBottom: 10
    },
    selectedButton: {
        backgroundColor: '#000',
    },
    cityText: {
        fontSize: 13,
        color: '#333',
    },
    selectedText: {
        color: '#fff',
        fontWeight: 'bold',
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
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#999',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },

    radioOuterSelected: {
        borderColor: '#000',
    },

    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#000',
    },

    radioText: {
        fontSize: 14,
        color: '#000',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 10,            // RN 0.71+
    },

    button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8, marginRight: 7,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f3f4f6',
    },

    buttonSelected: {
        backgroundColor: '#000', // blue
        borderColor: '#000',
    },

    buttonText: {
        fontSize: 12,
        color: '#000',
    },

    buttonTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    twoColumnRow: {
        flexDirection: 'row',
        gap: 12,           // RN 0.71+
    },

    column: {
        flex: 1,
    },



});

