import React, { useState, useRef } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Platform,
    TouchableOpacity,
    ActivityIndicator, Alert
} from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LanguageModal from "./lang/LanguageModal";
import { requestAllPermissions, getLiveLocation } from '../screens/permission/PermissionManager';

type RootStackParamList = {
    HomeSocial: undefined;
    HomeWhatsapp: undefined;
    HomeScreen: undefined;
    FirstScreen: undefined;
    AuthScreen: undefined;
};
type LocationData = {
  latitude: number;
  longitude: number;
  address?: string;
};
type GetLiveLocationProps = {
  onSuccess: (data: LocationData) => void;
  onError: (err: Error) => void;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const { width, height } = Dimensions.get("window");

const slides = [
    {
        key: "one",
        title: "Welcome",
        text: "Let's Connect to each other",
        subtext: "You both liked each other. Start chatting now and see where it goes.",
        image: require("../assets/girl1.png"),
        backgroundColor: "#ffffff",
    },
    {
        key: "two",
        title: "Create Reels, Earn Cash!",
        text: "Create reels and earn money!",
        subtext: "Start creating fun and engaging reels. The more views you get, the more you earn!",
        image: require("../assets/girl22.png"),
        backgroundColor: "#ffffff",
    },
    {
        key: "three",
        title: "Signup right now !",
        text: "Enjoy to Create Reels and fun with ur friends and family",
        subtext: "Lets Connect to each other",
        image: require("../assets/girl33.png"),
        backgroundColor: "#ffffff",
        //  backgroundColor: "#22bcb5",
    },
];

export default function FirstScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [selectedLang, setSelectedLang] = useState("en");
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    // Load user info on screen focus
    useFocusEffect(  
        React.useCallback(() => {      
            loadUserData();
        }, [])
    );
/* const LoadLocation = async() => {
    await getLiveLocation({
            onSuccess: (data: any) => {
                    console.log("📍 Location fetched & saved:", data);
                  //  setLocationdata(data)
                  //  getLocationdata(data)
            },
            onError: (err: any) => {
                    console.log("❌ Location error:", err);
            },
    });
}
 */
const LoadLocation = async (): Promise<void> => {
  await getLiveLocation({
    onSuccess: (data: LocationData) => {
      console.log("📍 Location fetched & saved:", data);
      // setLocationdata(data);
      // getLocationdata(data);
    },
    onError: (err: Error) => {
      console.log("❌ Location error:", err.message);
    },
  });
};

const getLiveLocation = async ({ onSuccess, onError }: GetLiveLocationProps) => {
  try {
    // your logic...
    const data: LocationData = {
      latitude: 0,
      longitude: 0,
    };

    onSuccess(data);
  } catch (error) {
    onError(error as Error);
  }
};

const loadUserData = async () => {
  try {
    const introSeen = await AsyncStorage.getItem('INTRO_SEEN');

    // 🚨 IMPORTANT: stop everything if intro not seen
    if (!introSeen) {
      setLoading(false);
      return;
    }

    const storedUsername = await AsyncStorage.getItem('username');

    setLoading(false);

    if (storedUsername) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } else {
        LoadLocation();
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthScreen' }],
      });
    }

  } catch (error) {
    console.error("Error loading user data:", error);
    setLoading(false);
  }
};


    // Language change handler
    const changeLanguage = (lang: string) => {
        setSelectedLang(lang);
        // i18n.changeLanguage(lang);
    };

const onDone = async () => {
  await AsyncStorage.setItem('INTRO_SEEN', 'true');
  requestAllPermissions(); // move here
  navigation.replace("AuthScreen");
};


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="blue" />
            </View>
        );
    }

    // Render each intro slide
    const renderItem = ({ item }: { item: typeof slides[0] }) => (
        <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <Text style={styles.text}>{item.text}</Text>
            <Text style={styles.subtext}>{item.subtext}</Text>
        </View>
    );

    // Custom buttons
    const renderDoneButton = () => (
        <TouchableOpacity
            style={styles.doneButton} onPress={onDone}
           // onPress={() => navigation.navigate("HomeScreen")}
        >
            <Text style={styles.doneButtonText}>Get Started</Text>
        </TouchableOpacity>
    );

    const renderNextButton = () => (
        <View style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.languageContainer}>
                <TouchableOpacity style={styles.pickerWrapper}
                    onPress={() => setModalVisible(true)}>
                    <Text>English</Text>
                </TouchableOpacity>
            </View>

            <AppIntroSlider
                renderItem={renderItem}
                data={slides}
                onDone={onDone}
                renderDoneButton={renderDoneButton}
                renderNextButton={renderNextButton}
                dotStyle={{
                    backgroundColor: '#ccc', // Inactive dot color
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginHorizontal: 4,
                }}
                activeDotStyle={{
                    backgroundColor: '#000', // Active dot color
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    marginHorizontal: 4,
                }}
            />
            <LanguageModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    image: {
        width: width * 0.8,
        height: 350,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 20
    },
    text: {
        fontSize: 20,
        textAlign: "center",
        color: "#000",
        fontWeight: "bold",
        marginTop: 20
    },
    subtext: {
        fontSize: 16,
        textAlign: "center",
        color: "#000",
        marginTop: 8,
    },
    languageContainer: {
        width: "100%",
        marginTop: 30,
        alignItems: "flex-end",
        position: "absolute",
        zIndex: 10,
    },
    pickerWrapper: {
        height: 50,
        width: 90,
        borderWidth: 1,
        borderColor: "#f2f2f2",
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: "#f2f2f2",
        justifyContent: "center",
        alignContent: 'center',
        alignItems: 'center'
    },
    picker: {
        color: "#000",
        width: "100%",
        fontSize: 12,
    },
    doneButton: {
        padding: 10,
        backgroundColor: "#ffffff",
        borderRadius: 5,
    },
    doneButtonText: {
        color: "#000",
    },
    nextButton: {
        padding: 10,
    },
    nextButtonText: {
        color: "#000",
        fontSize: 16,
    },
});
