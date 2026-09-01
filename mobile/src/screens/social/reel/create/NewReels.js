import React, { useEffect, useState, useRef } from "react";
import { FB } from "../../../../theme/social";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HOME_ROUTE } from '../../../../navigation/homeRoute';
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
import { Video } from "react-native-video";
import Entypo from "react-native-vector-icons/Entypo";
import * as base from "../../../../component/global";
import AntDesign from "react-native-vector-icons/AntDesign";
import Feather from "react-native-vector-icons/Feather";
//import ReelModal from "./ReelModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GalleryShow from "./GalleryShow";
import { SafeAreaProvider } from 'react-native-safe-area-context';


const NewReels = ({ navigation }) => {
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [isloading, setIsloading] = useState(false);
    const [username, setUsername] = useState(""); //setUserid
    const [userid, setUserid] = useState(""); //
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

    useEffect(() => {
      //  requestStoragePermission();
        userinfo();
        //loadMedia();
        //  fetchStories();

        return () => {
            console.log("clean create reel");
            userinfo();
            //loadMedia();
            //  fetchStories();
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
            if (jsonValue != null) {
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
/*     const requestPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            console.log("...Permission Denied", "Please allow access to your media.");
        }
    };
 */

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const closeReelmodal = async () => {
        /*
          "Dashboard" is not a registered route -- nothing in the navigator has
          ever been called that. This runs as the finalSubmit callback, so
          posting left you sitting on the create screen with an error in the log
          and no way forward but the back button. Land on the timeline, which is
          where the thing you just posted appears.
        */
        navigation.reset({ index: 0, routes: [{ name: HOME_ROUTE }] });
    };

  /*   const requestStoragePermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    }; */


    return (
        <SafeAreaProvider style={styles.container}>
            {/* Modal to show selected image */}
            {/*  {
                modalVisible ?
                    <ReelModal
                        visible={modalVisible}
                        item={selectedItem}
                        posttype="Reel"
                        onClose={handleCloseModal}
                        finalSubmit={closeReelmodal}
                    /> : ''
            }
 */}
            {/*
              Facebook's create-reel shape: two big choices, then your camera
              roll.

              This was a header with a back arrow AND a close X -- both calling
              goBack() -- over a row of five identical grey circles, so Camera
              and Music, the two ways to actually make a reel, looked exactly
              like the three shortcuts beside them.
            */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={26} color={FB.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create reel</Text>
                <View style={{ width: 26 }} />
            </View>

            <View style={styles.choices}>
                <TouchableOpacity
                    style={styles.choice}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("TestSokia")}
                >
                    <LinearGradient
                        colors={["#F3425F", "#F7B928"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.choiceFill}
                    >
                        <Ionicons name="camera" size={30} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.choiceLabel}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.choice}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("NewReelcamera", {
                        typescreen: 'Reel',
                        picture: "888.jpg",
                        imagetype: "image",
                        musictype: 'yes',
                        posttype: "Reel"
                    })}
                >
                    <LinearGradient
                        colors={["#0EA5E9", "#8B5CF6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.choiceFill}
                    >
                        <Ionicons name="musical-notes" size={30} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.choiceLabel}>Music</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.chips}>
                {[
                    { icon: "grid-outline", label: "Templates", go: () => navigation.navigate("ListTemplate") },
                    { icon: "bookmark-outline", label: "Saved", go: () => navigation.navigate("SavedReel", { userId: userid }) },
                    { icon: "folder-outline", label: "Your content", go: () => navigation.navigate("ShowReels") },
                ].map((c) => (
                    <TouchableOpacity key={c.label} style={styles.chip} onPress={c.go} activeOpacity={0.7}>
                        <Ionicons name={c.icon} size={15} color={FB.textSecondary} />
                        <Text style={styles.chipText}>{c.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Recent</Text>
            {/*
                GalleryShow was commented out, so this screen showed a toolbar and
                nothing else. It is self-contained -- it takes no props, asks for its
                own photo permission and pages the camera roll itself -- so rendering
                it is all that was needed. loadMedia() is deliberately still not called
                on mount: it opens the OS picker via launchImageLibrary, which would
                pop a system dialog every time the screen opened.
            */}
            <View style={{ flex: 1 }}>
                <GalleryShow />
            </View>


        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: FB.divider,
    },
    headerTitle: { ...FB.font.title },
    choices: { flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingTop: 16 },
    choice: { flex: 1 },
    choiceFill: {
        height: 96,
        borderRadius: FB.radius.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    choiceLabel: { ...FB.font.name, fontSize: 14, marginTop: 8, textAlign: "center" },
    chips: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 16 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        height: 32,
        borderRadius: FB.radius.pill,
        backgroundColor: FB.fill,
    },
    chipText: { ...FB.font.meta, fontWeight: "600" },
    sectionLabel: {
        ...FB.font.name,
        fontSize: 15,
        paddingHorizontal: 14,
        paddingTop: 20,
        paddingBottom: 10,
    },
    container: {
        // flex was commented out, so the provider collapsed and every child
        // below the toolbar had zero height -- which is why the gallery never
        // appeared even once it was rendered. "#fffff" was five hex digits.
        flex: 1,
        backgroundColor: "#ffffff",
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

export default NewReels;
