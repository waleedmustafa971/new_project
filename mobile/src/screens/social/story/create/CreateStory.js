import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar,
    SafeAreaView,
    Modal,
    Pressable,
    PermissionsAndroid, ScrollView
} from "react-native";
import { launchImageLibrary } from 'react-native-image-picker';
//import CameraRoll from '@react-native-camera-roll/camera-roll';
import { Video } from "react-native-video";
import Entypo from "react-native-vector-icons/Entypo";
import * as base from "../../../../component/global";
import AntDesign from "react-native-vector-icons/AntDesign";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GalleryShow from "../../reel/create/GalleryShow";
import { SafeAreaProvider } from 'react-native-safe-area-context';
//import MusicShowPage from "../../music/MusicShowPage";
import { useNavigation } from '@react-navigation/native';
import { useTypography } from "../../../../constants/fontsize";

const CreateStory = ({ navigation }) => {
    // const navigation = useNavigation();
    const font = useTypography();
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [isloading, setIsloading] = useState(false);
    const [username, setUsername] = useState("");
    const [fullname, setFullname] = useState("");
    const [token, setToken] = useState(null);
    const cameraRef = useRef(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null); // index of selected item
    const [modalVisible, setModalVisible] = useState(false);
    const [modalCanvaVisible, setModalCanvaVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // whole item
    const [cameraMedia, setCameraMedia] = useState([]);
    const [mediaAssets, setMediaAssets] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const videoRefs = useRef({});
    const [showMusicModal, setShowMusicModal] = useState(false)
    const [selectedMusic, setSelectedMusic] = useState(false)
    const [userid,setUserid] = useState(null)

    useEffect(() => {
        // requestStoragePermission();
        userinfo();
        return () => {
            console.log("clean create reel");
            userinfo();
        };
    }, []);


    const userinfo = async () => {
        try {
            // const value = await AsyncStorage.getItem('userinfo');
            const user = await AsyncStorage.getItem("username");
            const fullname = await AsyncStorage.getItem("fullname");
            const token = await AsyncStorage.getItem("token");
            console.log("...token.dashboard ........" + token);
            setUsername(user);
            setFullname(fullname);
            setToken(token);
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (jsonValue != null) 
            {
                const userData = JSON.parse(jsonValue);
                console.log("user id....." + userData._id);
                setUserid(userData._id);
            }
            //    Alert.alert(token)
        } catch (error) {
            // Error retrieving data
        }
    };

    const fetchStories = async () => {
        if (isloading || page > totalPages) return;
        setIsloading(true);
        const userid = await AsyncStorage.getItem("username");
        try {
            console.log(
                base.BASE_URL +
                `/apis/postreel/recentstory?page=${page}&limit=10&username=${userid}&posttype=Reel`
            );
            const response = await fetch(
                base.BASE_URL +
                `/apis/postreel/recentstory?page=${page}&limit=10&username=${userid}&posttype=Reel`
            );
            const json = await response.json();
            console.log("...get reel story" + json.reels);
            setData((prev) => [...prev, ...json.reels]);
            setTotalPages(json.totalPages);
            setPage((prev) => prev + 1);
        } catch (err) {
            // console.error(err);
        } finally {
            setIsloading(false);
        }
    };

    const loadMedia = async () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                selectionLimit: 0, // 0 means unlimited select
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error: ', response.errorMessage);
                } else {
                    console.log('JSON photots...' + response.assets)
                    // response.assets is an array of selected photos
                    setPhotos(response.assets || []);
                }
            }
        );
    }
    const requestPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            console.log("...Permission Denied", "Please allow access to your media.");
        }
    };



    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const closeReelmodal = async () => {
        navigation.navigate("Dashboard");
    };

    const requestStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };


    return (
        <SafeAreaProvider style={styles.container}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 15,
                backgroundColor: '#ffffff'
            }}

            >
                <TouchableOpacity
                    onPress={() => {
                        navigation.goBack();
                    }}
                >
                    <AntDesign name="arrowleft" size={24} color="black" />
                </TouchableOpacity>
                <Text style={{ fontSize: font.sm }}> {font.sm} Create Story</Text>
                <TouchableOpacity
                    onPress={() => {
                        navigation.goBack();
                    }}
                >
                    <AntDesign name="close" size={18} color="black" />
                </TouchableOpacity>
            </View>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 8,
                backgroundColor: '#ffffff'
            }}

            >
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 50,
                            backgroundColor: '#f2f2f2',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            navigation.navigate("CreateStorymusic") // CreateStorymusic.js
                        }}
                    >
                        <Feather name="music" size={font.sm} color="black" />
                    </TouchableOpacity>
                    <Text style={{ marginTop: 1, fontSize: font.sm }}>Music</Text>
                </View>

                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 50,
                            backgroundColor: '#f2f2f2',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        //CreateStorytext NewReelcamera
                        onPress={() => navigation.navigate("CreateStorytext", {
                            typescreen: 'Reel',
                            picture: "888.jpg",
                            imagetype: "image",
                            musictype: 'no',
                            posttype: 'Story'
                        })}
                    >
                        <Text style={{
                            marginTop: 1, fontSize: font.sm,
                        }}>Text</Text>
                    </TouchableOpacity>
                    <Text style={{
                        marginTop: 1, fontSize: font.sm,
                    }}>Text</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 50,
                            backgroundColor: '#f2f2f2',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            navigation.navigate("ListTemplate");
                        }}
                    >
                        <Feather name="layout" size={font.xl} color="black" />

                    </TouchableOpacity>
                    <Text style={{ marginTop: 1, fontSize: font.sm }}>Templates</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 50,
                            backgroundColor: '#f2f2f2',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            navigation.navigate("SavedReel", {
                                userId: userid
                            });
                        }}
                    >
                        <Feather name="bookmark" size={font.xl} color="black" />

                    </TouchableOpacity>
                    <Text style={{ marginTop: 1, fontSize: font.sm }}>Saved</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 50,
                            backgroundColor: '#f2f2f2',
                            justifyContent: 'center',
                            alignItems: 'center',

                        }}
                        onPress={() => {
                            navigation.navigate("ShowReels");
                        }}
                    >
                        <Feather name="folder" size={font.sm} color="black" />
                    </TouchableOpacity>
                    <Text style={{ marginTop: 1, fontSize: font.sm }}>Your Content</Text>

                </View>

            </View>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 0,
            }}>
                   <GalleryShow />
            </View>



        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fffff"
        //flex: 1,
        //  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    title: { fontSize: 12, color: "#000", marginBottom: 3 },
    button: { padding: 12, borderRadius: 8, marginBottom: 20 },
    uploadButton: {
        backgroundColor: "#f2f2f2",
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
        width: 100,
    },
    buttonText: { color: "#000", fontWeight: "bold" },
    mediaContainer: {
        marginRight: 10,
        borderRadius: 8,
        overflow: "hidden",
        padding: 10,
    },
    media: { width: 100, height: 100, borderRadius: 10 },
    videoContainer: {
        flex: 1,
        margin: 5,
        aspectRatio: 1,
    },
    video: {
        width: "100%",
        height: "100%",
        // borderRadius: 10,
    },
    fullMedia: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "100%",
        height: "100%",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
    },
    fullImage: {
        width: "100%",
        height: "100%",
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 10,
        backgroundColor: "#444",
        borderRadius: 20,
    },
    galleryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 16,
    },
    image: {
        width: 100,
        height: 100,
        margin: 4,
        borderRadius: 8,
    },
});

export default CreateStory;
