import {
    View, Text, SafeAreaView, StyleSheet, Image, TouchableOpacity, ImageBackground, Alert, ScrollView, ActivityIndicator, Dimensions
} from "react-native";
import React, { useState, useEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons"; // Importing icons from expo vector icons
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
import Spinner from "react-native-loading-spinner-overlay";
import AntDesign from "react-native-vector-icons/AntDesign";
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Footerpage from "../Footerpage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import api from "../../../component/api";
import LanguageModal from "../../lang/LanguageModal";
import { useTranslation } from '../../../screens/lang/TranslationContext';
const { width } = Dimensions.get("window");
const isTablet = width >= 768;
const FONT_SMALL = isTablet ? 13 : 12;
const FONT_TITLE = isTablet ? 16 : 14;

const MyProfile = ({ navigation }) => {
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState(null);
    const [email, setEmail] = useState(null);
    const [bio, setBio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fullname, SetFullname] = useState(null);
    const [follower, setFollower] = useState(null);
    const [following, setFollowing] = useState(null);
    const [coins, setCoins] = useState(null);
    const [userdata, setUserdata] = useState(null);
    const [image, setImage] = useState(null);
    const [userinfo, setUserinfo] = useState([])
    const [userid, setUserid] = useState(null)
    const [modallanguage, setModallanguage] = useState(false)
    const { translate, language } = useTranslation();
    const isRTL = language === 'ar';

    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            _loadname();
            // Re-fetch image or update state here
        }, [])
    );
    useEffect(() => {
        const getLocation = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem('USER_LOCATION');
                if (jsonValue != null) {
                    const locationData = JSON.parse(jsonValue);
                    setCity(locationData.city || '');
                    setCountry(locationData.country || '');
                }
            } catch (e) {
                console.error('Failed to load location', e);
            }
        };

        getLocation();
    }, []);
    const getToken = async () => {
        const tokendata = await AsyncStorage.getItem("token");
        if (tokendata) {
            setToken(tokendata);
        }
    };

    const userLogout = async () => {
        try {
             await AsyncStorage.clear();
          /*   await AsyncStorage.removeItem("username");
            await AsyncStorage.removeItem("userdata");
            await AsyncStorage.removeItem("userinfo");
            await AsyncStorage.removeItem("token"); //studentid
            await AsyncStorage.removeItem("studentid"); //studentid */
            //  Alert.alert('Logout Success!');
            navigation.navigate("HomeScreen");
        } catch (error) {
            console.log("AsyncStorage error: " + error.message);
        }
    };

    const _loadname = async () => {
        try {
            const storedUsername = await AsyncStorage.getItem("username");
            const userinfo = await AsyncStorage.getItem("userinfo");
            const jsonValue = await AsyncStorage.getItem("userdata");

            if (storedUsername === null) {
                // If username is null, show the loader and navigate to HomeScreen
                setLoading(true);
                navigation.navigate("HomeScreen");
            } else {
                if (jsonValue != null) {
                    const userData = JSON.parse(jsonValue);
                    console.log("user id....." + userData._id);
                    setUserid(userData._id);
                    setUserinfo(userData);
                    ProfileData(userData._id);
                    setUsername(userData._id)
                }

            }
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setLoading(false); // Hide loader after fetching
        }
    };

    const ProfileData = async (id) => {
        try {
            const { data } = await api.get(
                `/apis/auth/getProfile?id=${id}`
            );

            setUserdata(data.user);
            SetFullname(data.user.name);
            setEmail(data.user.email);
            setBio(data.user.bio);
            setFollower(data.user.followersCount);
            setFollowing(data.user.followingCount);
            setCoins(data.user.coins);
            setImage(data.user.image);
        } catch (error) {
            console.error("Profile fetch failed", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="blue" />
            </View>
        );
    }

    return (
        <SafeAreaProvider style={{
            backgroundColor: '#ffffff'
        }}>
            <ScrollView>
                {/*   
        <View style={styles.profileContainer}>
                    <View style={{ display: "flex",   
                        flexDirection: isRTL ? 'row-reverse' : "row", }}>
                        <TouchableOpacity
                            style={{
                                marginTop: 10,
                                marginLeft: 20,
                            }}
                            onPress={() =>
                                navigation.navigate("EditProfile", {
                                    userdata: userdata,
                                })
                            }
                        >
                            <Image
                                source={
                                    image
                                        ? { uri: base.BASE_URL + '/' + image }
                                        : require("../../../assets/user.png")
                                }
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 10,
                                    marginTop: 7,
                                }}
                            />
                        </TouchableOpacity>
                        <View style={{ marginTop: 20, marginLeft: 10 }}>
                            <Text style={{ fontSize: 20 }}>{fullname}</Text>
                            <Text>{email} </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={{ marginTop: 35, marginRight: 10 }}
                        onPress={() =>
                            navigation.navigate("EditProfile", {
                                userdata: userdata,
                            })
                        }
                    >
                        <AntDesign name="right" size={18} color="silver" />
                    </TouchableOpacity>
        </View> 
        */}

                <View style={styles.profileContainer}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center" }}>
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("EditProfile", { userdata: userdata })
                            }
                        >
                            <Image
                                source={
                                    image
                                        ? { uri: base.BASE_URL + '/' + image }
                                        : require("../../../assets/user.png")
                                }
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    marginTop: 7,
                                }}
                            />
                        </TouchableOpacity>

                        <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontSize: FONT_TITLE, fontWeight: "bold" }}>
                                {fullname}
                            </Text>
                            <Text style={{ fontSize: FONT_SMALL, color: "#777" }}>
                                {bio ? bio : "Write your interest"}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate("EditProfile", { userdata: userdata })
                        } style={{ marginTop: 10 }}
                    >
                        <AntDesign name="right" size={18} color="#bbb" />
                    </TouchableOpacity>
                </View>

                {/*  <View style={styles.hoursachlangContainer}>
                    <View
                        style={{
                            borderWidth: 1,
                            borderRadius: 10,
                            borderColor: "#f2f2f2",
                            padding: 10,
                            height: 80,
                            width: 100,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 20, fontWeight: "bold" }}>0</Text>
                        <Text className="text-sm">Reel</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate("CurrentUserFollowers", {
                                "username": username
                            })
                        }}
                        style={{
                            borderWidth: 1,
                            borderRadius: 10,
                            borderColor: "#f2f2f2",
                            padding: 10,
                            height: 80,
                            width: 100,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 20, fontWeight: "bold" }}>{follower}</Text>
                        <Text className="text-sm">Followers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            borderWidth: 1,
                            borderRadius: 10,
                            borderColor: "#f2f2f2",
                            padding: 10,
                            height: 80,
                            width: 100,
                            justifyContent: "center",
                            alignItems: "center",
                        }}

                        onPress={() => {
                            navigation.navigate("CurrentUserFollowering", {
                                "username": username
                            })
                        }}
                    >
                        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                            {following}
                        </Text>
                        <Text className="text-sm">Following</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            borderWidth: 1,
                            borderRadius: 10,
                            borderColor: "#f2f2f2",
                            padding: 10,
                            height: 80,
                            width: 100,
                            justifyContent: "center",
                            alignItems: "center",
                        }}

                        onPress={() => {
                            navigation.navigate("GetCoins")
                        }}
                    >
                        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                            {coins}
                        </Text>
                        <Text className="text-sm">Coins</Text>
                    </TouchableOpacity>

                </View> */}

                <View style={styles.hoursachlangContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Reel</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={() => navigation.navigate("CurrentUserFollowers", { username })}
                    >
                        <Text style={styles.statValue}>{follower}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={() => navigation.navigate("CurrentUserFollowering", { username })}
                    >
                        <Text style={styles.statValue}>{following}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={() => navigation.navigate("GetCoins")}
                    >
                        <Text style={styles.statValue}>{coins}</Text>
                        <Text style={styles.statLabel}>Coins</Text>
                    </TouchableOpacity>

                </View>

                <View
                    style={{
                        flexDirection: isRTL ? 'row-reverse' : "row",
                        justifyContent: 'center',
                        padding: 5,
                        gap: 2,
                    }}
                >
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#3B82F6', // Tailwind blue-500
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 9999,
                            flexDirection: 'row',
                            alignItems: 'center',
                            elevation: 3, // shadow for Android
                            shadowColor: '#000', // shadow for iOS
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            marginRight: 12,
                        }}
                    >
                        <Text style={{
                            color: '#ffffff'
                        }}>Reel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('ChatScreen', { userid: userid, userinfo: userinfo });

                        }}
                        style={{
                            backgroundColor: '#22C55E', // Tailwind green-500
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 9999,
                            flexDirection: 'row',
                            alignItems: 'center',
                            elevation: 3,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            marginRight: 12,
                        }}
                    >
                        <Text style={{ color: '#FFFFFF' }}>Inbox</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate("GalleryScreen", {
                                userId: userid
                            })
                        }}
                        style={{
                            backgroundColor: '#8B5CF6', // Tailwind purple-500
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 9999,
                            flexDirection: 'row',
                            alignItems: 'center',
                            elevation: 3,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                        }}
                    >
                        <Text style={{ color: '#FFFFFF' }}>Gallery</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ padding: 5, marginBottom: 10 }}>
                    <View style={styles.dashboardContainer} >

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("GetCoins")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="wallet" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Get Coins</Text>
                                    <Text style={styles.optionSubtitle}>Get Coins to your wallet</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => setModallanguage(true)}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="language" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Languages</Text>
                                    <Text style={styles.optionSubtitle}> {language}</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="location-outline" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Location</Text>
                                    <Text style={styles.optionSubtitle}> {city}, {country}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("ListAds", {
                                userId: userid
                            })}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="pricetag" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Ads</Text>
                                    <Text style={styles.optionSubtitle}>Boost Your Ads</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("CreatePost")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="people" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Create Post</Text>
                                    <Text style={styles.optionSubtitle}>Create Post and share with 
                                        your friends</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("CreateStream")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="radio" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Live</Text>
                                    <Text style={styles.optionSubtitle}>Join live and get coins</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("VideoDashboard")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="videocam" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Video</Text>
                                    <Text style={styles.optionSubtitle}>Watch Video</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>


                        {/*
                          Account privacy, reachable at last.

                          Everything behind this row already existed on the
                          server — private mode, per-area audiences, follow
                          requests, blocking — and nothing in the app linked to
                          any of it. The only "Privacy" screen belonged to the
                          messenger and was a static list of nineteen rows that
                          did nothing.
                        */}
                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("AccountPrivacy")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="lock-closed" size={22} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Account privacy</Text>
                                    <Text style={styles.optionSubtitle}>Go private, control who sees what, manage blocks</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("SavedReelsScreen")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="save" size={22} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Saved</Text>
                                    <Text style={styles.optionSubtitle}>Watch your save data from here</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>


                          <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("CVDesign")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="briefcase" size={22} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Job Profile</Text>
                                    <Text style={styles.optionSubtitle}>Watch your save data from here</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("NotificationPage")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="notifications" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Notification</Text>
                                    <Text style={styles.optionSubtitle}>Enable notification to get permission</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("SettingSocial", {
                                userId: userid
                            })}>
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="settings" size={21} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Setting</Text>
                                    <Text style={styles.optionSubtitle}>setup your all setting here</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={() => navigation.navigate("SettingLang")}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="document-text" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Privacy Policy</Text>
                                    <Text style={styles.optionSubtitle}>Protect your privacy policy</Text>
                                </View>
                            </View>
                            <AntDesign name="right" size={18} color="silver" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionContainer}
                            onPress={userLogout}
                        >
                            <View style={[styles.leftSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="log-out" size={24} color="#000" style={styles.icon} />
                                <View>
                                    <Text style={styles.optionTitle}>Logout</Text>
                                    <Text style={styles.optionSubtitle}>logout from Account</Text>
                                </View>
                            </View>
                            {/*  <AntDesign name="right" size={18} color="silver" /> */}
                        </TouchableOpacity>

                    </View>
                </View>
            </ScrollView>
            {/*  <LanguageModal /> */}
            <LanguageModal visible={modallanguage} onClose={() => setModallanguage(false)} />
            <Footerpage navigation={navigation} />
        </SafeAreaProvider>
    );
};

export default MyProfile;

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    optionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 5,
        marginVertical: 8
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 15,
    },
    optionTitle: {
        color: '#1F1F1F',
        fontSize: 13,
        fontWeight: 'bold',
    },
    optionSubtitle: {
        color: '#898A8D',
        fontSize: 12,
        marginTop: 2,
    },
    container: {
        flexDirection: "row", // Aligns children horizontally
        justifyContent: "space-between", // Space out the left, center, and right items
        alignItems: "center", // Centers items vertically
        paddingHorizontal: 15,
        height: 60, // Header height
        backgroundColor: "#f5f5f5", // Background color
        borderBottomWidth: 1, // Adds a line at the bottom of the header
        borderBottomColor: "#ddd",
    },
    backgroundImage: {
        flex: 1,
        height: 300,
    },
    overlayContainer: {
        // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
        padding: 20,
        borderRadius: 10,
        marginTop: 40,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    profileContainer: {
        // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
        padding: 8,
        borderRadius: 10,
        marginTop: 0,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    hoursachlangContainer: {
        padding: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
    },
    FollowContainer: {
        padding: 20,
        borderRadius: 10,
        marginTop: 5,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderColor: "#000",
        height: 80,
    },
    dashboardContainer: {
        // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
        padding: 20,
        borderRadius: 10,
        marginTop: 2,
        display: "flex",
    },
    myaccountContainer: {
        // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay for better text visibility
        padding: 20,
        borderRadius: 10,
        marginTop: 2,
        display: "flex",
    },
    text: {
        fontSize: 20,
        color: "white",
        textAlign: "center",
    },
    iconContainer: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ffffff",
        flex: 1, // Ensures the text is centered
        textAlign: "center",
    },
    statCard: {
        width: "23%",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },

    statValue: {
        fontSize: FONT_TITLE,
        fontWeight: "bold",
    },
    statLabel: {
        fontSize: FONT_SMALL,
        color: "#777",
    },

});
