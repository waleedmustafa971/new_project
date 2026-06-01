import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet, StatusBar
} from "react-native";
import PhoneInput from "react-native-phone-number-input";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as base from '../../component/global'
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
// Replace this with your actual API base URL
const BASE_URL = base.BASE_URL;
import Ionicons from "react-native-vector-icons/Ionicons";
import CountryPicker from "react-native-country-picker-modal";

const SignupWithMobile = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formattedValue, setFormattedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const phoneInput = useRef(null);
  const [country, setCountry] = useState(null);
  const [visible, setVisible] = useState(false);
  const [callingCode, setCallingCode] = useState("971"); // default
  const aePhoneRegex = /^(?:\+971|00971|0)?(5[0-9]|[234679])\d{7}$/;

  // ✅ Set default country (UAE)
  useEffect(() => {
    const defaultCountry = {
      cca2: "AE",
      callingCode: ["971"],
    };
    setCountry(defaultCountry);
    setCallingCode("971");
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      phoneInput.current?.focus();
    }, 300); // small delay helps rendering

    return () => clearTimeout(timeout);
  }, []);

  const generateRandom4Digit = () => {
    return Math.floor(1000 + Math.random() * 9000);
  };
  const validateUAEPhone = (phone) => {
    return aePhoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    const fullNumber = `+${callingCode}${phoneNumber}`;
    console.log(fullNumber);
    if (!validateUAEPhone(phoneNumber)) {
      Alert.alert("Invalid", "Please enter a valid UAE phone number");
      return;
    }
    if (!fullNumber) return Alert.alert("Enter a valid phone number");
    try {
      setLoading(true);
     // await AsyncStorage.clear();
      const modulewiselogin = "main apps";
      const randomNumber = '0000';
      const fcmtoken = await AsyncStorage.getItem("fcmtoken");
      /* 
      const locationData = {
      latitude,
      longitude,
      address,
      city,
      country,
      };

      // 💾 Save
      await AsyncStorage.setItem(
      'USER_LOCATION',
      JSON.stringify(locationData)
      );
      */
      const location = await AsyncStorage.getItem('USER_LOCATION');

      const response = await fetch(`${BASE_URL}/apis/auth/mobile_register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "null",
          email: fullNumber,
          password: "x!@aSDet789",
          mobileno: fullNumber, //formattedValue with country code
          type: 'Mobile',
          otpcode: randomNumber,
          modulewiselogin: modulewiselogin,
          fcmtoken: fcmtoken,
          location: location
        }),
      });
      console.log(JSON.stringify({
        name: "null",
        email: phoneNumber,
        password: "x!@aSDet789",
        mobileno: phoneNumber,
        type: 'Mobile',
        otpcode: randomNumber,
        fcmtoken: fcmtoken,
        modulewiselogin: modulewiselogin,
        location: location

      }))
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong");
      console.log('....data.message', data.message)
      if (data.message === "User registered successfully, OTP sent") {
        await AsyncStorage.setItem("tempemail", fullNumber);
        await AsyncStorage.setItem("regtype", "mobile");
        // await AsyncStorage.setItem("token", data.token);
        setLoading(false);
        navigation.navigate("OtpScreen", { mobileno: fullNumber, "isitreg": 'no' });
      } else if (data.message === "Mobile already exists, OTP resent") {
        await AsyncStorage.setItem("tempemail", fullNumber);
        await AsyncStorage.setItem("regtype", "mobile");
        /*  
        await AsyncStorage.setItem("regtype", "mobile");
         await AsyncStorage.setItem("token", data.token);
         await AsyncStorage.setItem('username', data.usersdata.email);
         await AsyncStorage.setItem('userdata', JSON.stringify(data.usersdata));
         await AsyncStorage.setItem('userinfo', JSON.stringify(data.usersdata)); 
        */
        setLoading(false);
        navigation.navigate("OtpScreen", { mobileno: fullNumber, "isitreg": 'yes' });
      } else {
        setLoading(false);
        Toast.show({ type: 'error', text1: 'Failed to register', position: 'bottom' });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error sending OTP:", error);
      Toast.show({ type: 'error', text1: error.message, position: 'bottom' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ padding: 10 }}
      >
        <Ionicons name="chevron-back" size={26} color="#000" />
      </TouchableOpacity>
      <View style={styles.innerContainer}>

        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Let’s get you signed up!</Text>
          <Text style={styles.subtitleText}>
            by signing up, you’re agreeing to our <Text style={styles.boldText}>Terms of Service</Text> and <Text style={styles.boldText}>Privacy Policy</Text>. thanks!
          </Text>
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
            ref={phoneInput}
            style={styles.input}
            placeholder="Phone number"
            keyboardType="numeric"
            onChangeText={(text) => setPhoneNumber(text)}
            placeholderTextColor="#999"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFCF5", // Off-white/cream background from image
  },
  innerContainer: {
    paddingHorizontal: 15,
    paddingTop: 0, borderWidth: 0, borderColor: 'red'
  },
  headerContainer: {
    marginBottom: 8,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 22,
  },
  boldText: {
    fontWeight: "600",
    color: "#333",
  },
  phoneContainer: {
    width: "100%",
    height: 40,
    borderRadius: 30, // Pill shape
    backgroundColor: "#F2F1EA", // Slightly darker than background
    elevation: 0,
    borderWidth: 0,
  },
  textInputContainer: {
    backgroundColor: "transparent",
    paddingVertical: 0,
  },
  codeText: {
    fontSize: 14,
    color: "#333",
  },
  numberInput: {
    fontSize: 14,
    color: "#000",
  },
  codeTextStyle: {
    fontSize: 16,
    fontWeight: "600",
  },

  flagStyle: {
    width: 20,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  /*   flagStyle: {
      width: 20,
      justifyContent: 'center',
      marginLeft: 10,
    },
   */
  button: {
    backgroundColor: "#2C2C2C", // Dark charcoal/black
    paddingVertical: 10, height: 40,
    borderRadius: 30, // Pill shape button
    marginTop: 100, // Spacing to match the screenshot layout
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  loader: {
    marginTop: 240,
  },
  phoneContainer: {
    width: "100%",
    height: 50, // slightly taller for better alignment
    borderRadius: 30,
    backgroundColor: "#F2F1EA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
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
    width: 1,
    height: "60%",
    backgroundColor: "#ccc",
    marginHorizontal: 8,
  },

  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#000",
    paddingVertical: 0,
  },
});

export default SignupWithMobile;