import { View, Text, StyleSheet, Dimensions, Animated, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, FlatList, Image, Platform, PermissionsAndroid, Alert, Modal } from 'react-native'
import React, { useState, useEffect } from 'react'
import * as colors from '../../../theme/color/Colors';
import * as theme from '../../../theme/Theme';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon, { Icons } from '../../../component/icons/Icons';
import api from '../../../component/api';
import CategoryList from '../../../component/food/CategoryList';
import PromoSlider from '../../../component/food/PromoSlider';
import CuisineList from '../../../component/food/CuisineList';
import RestaurantList from '../../../component/food/RestaurantList';
import BrandList from '../../../component/food/BrandList';
import CustomTabBar from '../../../component/food/CustomTabBar';
import NetInfo from "@react-native-community/netinfo";
import { getLiveLocation, requestAllPermissions } from '../../permission/PermissionManager';
import MapModal from './MapModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapModalChild from './MapModalChild';
import SearchFoodModal from './SearchFoodModal';
import { isConnected } from '../../../constants/network';
import Toast from 'react-native-toast-message';
import DiscountOfferModal from './DiscountOfferModal';
import PulseLoader from '../../../component/loader/PulseLoader';

type RootStackParamList = {
    HomeScreen: undefined;
    FoodDashboard: undefined;
    ShoppingProfile: undefined;
    FoodViewcart: undefined;
    AuthScreen: undefined;
    RestaurantScreen: { restaurant_id: string };
    FoodProfile: undefined;
};

const FoodDashboard = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [loading, setLoading] = useState(false);
    const [banners, setBanners] = useState([]);
    const [categories, setCategories] = useState([]);
    const [topRestaurantsdata, setTopRestaurantsdata] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [notice, setNotice] = useState(false);
    const [favourite_icon, setFavouriteIcon] = useState('heart-outline');
    const [cuisinesdata, setCuisinesdata] = useState([])
    const [selectedLang, setSelectedLang] = useState(false)
    const [childAddressmodal, setChildAddressmodal] = useState(false)
    const [showgooglemap, setShowgooglemap] = useState(false)
    const [_address, set_address] = useState("")
    const [data, setData] = useState<any>(null);
    const [locationdata, setLocationdata] = useState<any[]>([]);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [address, setAddress] = useState(null)
    const colors = ['#EC2578', '#ff7675', '#e84395', '#e17055', '#e84393']; // 3 colors
    const [colorIndex, setColorIndex] = useState(0);
    const [finalAddressDetails, setFinalAddressDetails] = useState(null)
    const [userid, setUserid] = useState<string | null>(null);
    const [userinfo, setUserinfo] = useState<any>({});
    const [showsearchmodal, setShowsearchmodal] = useState(false)
    const [discountresturant, setDiscountresturant] = useState(false)
    const [text, setText] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
        }, 5000); // change every 5 sec

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // important_notice()
        //get_address();
        const unsubscribe = navigation.addListener('focus', async () => {
            //  await get_banners();
            await fetchDashboard(latitude, longitude);
            //  await get_restaurant_list();
        });
        return unsubscribe;
    }, []);

    const withTimeout = (promise, ms = 10000) =>
        Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
        ]);

    useEffect(() => {
        const init = async () => {
            const online = await isConnected();
            if (!online) {
                Toast.show({
                    type: 'error',
                    text1: 'No Internet, Please check your connection.',
                    position: 'top',
                });
                return;
            }
            setLoading(true);
            try {
                await withTimeout(requestAllPermissions());
                const location = await getLiveLocation();
                console.log("✅ location direct:", location);
                setAddress(location?.address);
                setLatitude(location?.latitude);
                setLongitude(location?.longitude);
                fetchDashboard(location.latitude, location.longitude);
            } catch (e) {
                console.log("Init error:", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const fetchDashboard = async (latitude: string, longitude: string) => {
        console.log('longitude......', latitude, longitude)
        if (!latitude || !longitude) {
            console.log("❌ Invalid coordinates:", latitude, longitude);
            return;
        }
        const online = await isConnected();
        if (!online) {
            Toast.show({
                type: 'error',
                text1: 'No Internet, Please check your connection.',
                position: 'top',
            });
            return;
        }
        //setLoading(true); // 🔥 always here
        const jsonValue = await AsyncStorage.getItem('userdata');
        if (jsonValue) {
            setLoading(true)
            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            console.log('userid: ', userData._id);
            setUserinfo(userData);
            try {
                const res = await api.get(`/api/food/getdashboardlist?lat=${latitude}&lng=${longitude}`);
                setData(res.data);
                setDiscountresturant(res?.data?.discountresturant)
            } catch (e) {
                console.log("Dashboard error", e);
            } finally {
                setLoading(false);
            }
        } else {
            navigation.navigate('AuthScreen');
        }
    };

    const openMaps = async () => {
        // Alert.alert("dddd")
        try {
            const jsonValue = await AsyncStorage.getItem('USER_LOCATION');
            if (jsonValue != null) {
                const locationData = JSON.parse(jsonValue);
                const { latitude, longitude, address } = locationData;
                console.log("from Food Dashbaord Latitude:", latitude, "Longitude:", longitude);
                setLatitude(latitude)
                setLongitude(longitude)
                setAddress(address)
                //return { latitude, longitude };
            } else {
                console.log("No location stored");
                return null;
            }
        } catch (error) {
            console.log("Error reading USER_LOCATION:", error);
            return null;
        }
        setShowgooglemap(true)
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle={colorIndex % 2 === 0 ? "light-content" : "dark-content"}
                backgroundColor={colors[colorIndex]}
            />
            {/* 🔥 GLOBAL LOADER */}
            <PulseLoader visible={loading} text="Loading dashboard..." />
            <ScrollView style={{
                padding: 0
            }} showsVerticalScrollIndicator={false} >
                <View style={{ backgroundColor: colors[colorIndex], padding: 10 }}>
                    <View style={{
                        flexDirection: 'row', margin: 2, marginBottom: 6
                    }}>
                        <TouchableOpacity activeOpacity={1} style={{ width: '70%' }} onPress={() => {
                            openMaps()
                        }
                        }>
                            <View style={{ flexDirection: 'row' }}>
                                <Icon type={Icons.Ionicons} name="location"
                                    style={{ fontSize: 20, color: '#ffffff' }} />
                                <View style={{ margin: 2 }} />
                                <Text style={{ color: '#ffffff' }}
                                    numberOfLines={1}>
                                    {address || ''}
                                </Text>
                                <Icon type={Icons.MaterialIcons} name="keyboard-arrow-down"
                                    style={{
                                        fontSize: 25, color: "#ffffff",
                                        marginTop: -1
                                    }} />
                            </View>
                        </TouchableOpacity>
                        <View style={{ width: '30%', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity activeOpacity={1} onPress={() => {
                                navigation.navigate("FoodProfile");
                            }}>
                                <Icon type={Icons.MaterialIcons} name="menu" color="#ffffff"
                                    style={{ fontSize: 22 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                <TouchableOpacity activeOpacity={1} style={styles.textFieldcontainer}
                    onPress={() => setShowsearchmodal(true)}>
                    <View style={{ width: '10%' }}>
                        <Icon style={styles.textFieldIcon} type={Icons.Feather} name="search" />
                    </View>
                    <View style={{ width: '90%' }}>
                        <Text style={{
                            marginLeft: -25
                        }}>
                            Search your menu or restaurant
                        </Text>
                    </View>
                </TouchableOpacity>
                </View>
                <CategoryList categories={data?.categories} address={address} latitude={latitude} longitude={longitude} />
                <PromoSlider promos={data?.promooffer} latitude={latitude} longitude={longitude} />
                <CuisineList cuisines={data?.foodcuisine} latitude={latitude} longitude={longitude} />
                <RestaurantList restaurants={data?.resturant} title="Popular Restaurants" latitude={latitude} longitude={longitude} />
                <RestaurantList restaurants={data?.discountresturant} title="Flat 15% off entire menu" latitude={latitude} longitude={longitude} />
                <BrandList brands={data?.resturantbrand} latitude={latitude} longitude={longitude} />
            </ScrollView>
            <CustomTabBar latitude={latitude} longitude={longitude} />
            {
                showgooglemap ?
                    <MapModal onClose={() => {
                        setShowgooglemap(false)
                    }} latitude={latitude} longitude={longitude}
                        address={address}
                        onLocationSelected={(locationData: any) => {
                            console.log('....location data........', locationData)
                            setLocationdata(locationData)
                            setLatitude(locationData?.latitude)
                            setLongitude(locationData?.longitude)
                            setAddress(locationData.address)
                            setChildAddressmodal(true)
                        }}
                    /> : null
            }
            {
                childAddressmodal ? (
                    <MapModalChild
                        onClose={(data: any) => {
                            if (data) {
                                console.log("Data received from modal:", data);
                                setFinalAddressDetails(data);
                                const dataformat = {
                                    type: data?.label,
                                    location: data?.address,
                                    houseNumber: data?.apartment,
                                    name: data?.label,
                                    mobile: "",
                                    instructions: data?.note,
                                    latitude: data?.coords?.latitude,
                                    longitude: data?.coords?.longitude,
                                    modulename: "food"
                                };
                                try {
                                    const response: any = api.post("/apis/auth/update-address", {
                                        userId: userid,
                                        address: dataformat,
                                    });
                                    console.log('save address....', response?.data)
                                    fetchDashboard(dataformat?.latitude, dataformat?.longitude)
                                } catch (error) {
                                    console.log("Error updating address", error);
                                }
                            }
                            setChildAddressmodal(false);
                        }}
                        latitude={latitude}
                        longitude={longitude}
                        address={address}
                        onLocationSelected={(locationData: any) => {
                            setLocationdata(locationData);
                            setChildAddressmodal(true);
                        }}
                    />
                ) : null
            }

            <Modal
                visible={showsearchmodal}
                animationType="slide"
                onRequestClose={() => setShowsearchmodal(false)}
            >
                <SearchFoodModal
                    query={text}
                    onClose={() => {
                        setShowsearchmodal(false);
                        setText('');
                    }}
                />
            </Modal>
        </SafeAreaView>
    )
}

export default FoodDashboard

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 0
    },
    containertopresturant: {
        backgroundColor: '#f2f2f2',
        paddingVertical: 10,
        height: 255, // enough for 2 rows
        // remove flex: 1
    },
    container_meansfor: {
        backgroundColor: '#f2f2f2',
        paddingVertical: 10, marginTop: 7,
        height: 255, // enough for 2 rows
        // remove flex: 1
    },
    containert_cuisines: {
        backgroundColor: '#ffffff',
        paddingVertical: 10, marginTop: 7,
        height: 270, // enough for 2 rows

    },
    linearGradient: {
        flex: 1,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15, marginTop: 4,
        marginBottom: 12,
    },
    headerText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#000", marginTop: 3
    },
    brandCard: {
        width: Dimensions.get("window").width / 3.5,
        height: 100,
        // backgroundColor: "#333",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    logo: {
        width: 50,
        height: 50,
        resizeMode: "contain",
        marginBottom: 6,
    },
    brandName: {
        color: "#fff",
        fontSize: 12,
        textAlign: "center",
    },
    // textFieldcontainer: {
    //   flex:1,
    //   flexDirection: 'row',
    //   justifyContent: 'center',
    //   alignItems: 'center',
    //   borderRadius: 10,
    //   height: 45,
    //   margin: 10,
    //   backgroundColor: colors.light_grey,
    //   borderRadius:16,
    //   padding:15
    // },
    // textFieldIcon: {
    //   paddingLeft: 10,
    //   paddingRight: 5,
    //   fontSize: 15,
    //   color: colors.theme_fg
    // },
    categoryItem: {
        /*   flexDirection: 'column',
          alignItems: 'center',
        //  width: (Dimensions.get('window').width / 4) - 17,
          width : 70, height: 85,
         // paddingHorizontal: 5,
         marginLeft: -7,
          margin: 0,
          borderRadius: 16, */


        flexDirection: 'column',
        alignItems: 'center',
        width: 70,
        height: 85,
        marginRight: 5,   // spacing between items
        borderRadius: 16,


    },
    categoryImage: {
        height: 50,
        width: 50,

    },
    categoryTitle: {
        fontSize: 12,
        marginTop: 10,
        fontFamily: 'bold',
        color: colors.theme_fg_two,
        textAlign: 'center',

    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '98%',
        backgroundColor: colors.warning_background,
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: 'red'
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: colors.theme_bg_two
    },
    textFieldcontainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 7,
        borderWidth: 0.5,
        borderColor: '#ccc', // Light gray border
        borderRadius: 16, // Rounded corners
        backgroundColor: colors.light_grey, // White background
    },
    textFieldIcon: {
        fontSize: 15, // Icon size
        marginLeft: 5,
        color: colors.theme_fg_black, // Gray color for the icon
    },

});
