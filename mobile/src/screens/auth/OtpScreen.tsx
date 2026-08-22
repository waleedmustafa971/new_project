import React, { useRef, useState, useEffect } from "react";
import { registerPushToken } from "../../services/pushToken";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifySessionChanged } from "../../component/session";
import * as base from '../../component/global'


const OtpScreen = ({ route }: any) => {
  const { mobileno, isitreg } = route.params;
  const navigation = useNavigation();

  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(40);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIsResendDisabled(false);
    }
  }, [timer]);

  const handleChange = (text, index) => {
    if (isNaN(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move forward
    if (text && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "") {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (enteredOtp) => {
    Keyboard.dismiss();

    const cleanOtp = String(enteredOtp).trim();
    const cleanMobile = String(mobileno).trim();

    if (cleanOtp.length < 4) {
      Alert.alert("Enter all 4 digits");
      return;
    }

    setLoading(true);

    try {
      console.log("FINAL OTP SENT:", `"${cleanOtp}"`, cleanOtp.length);

      const response = await fetch(`${base.BASE_URL}/apis/auth/verify_mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileno: cleanMobile,
          otpcode: cleanOtp
        }),
      });

      const data = await response.json();
      console.log('API RESPONSE:', data);

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (data.message === "Mobile verified successfully") {
        //  Alert.alert("OTP Verified");
        if (
          !data?.usersdata?.name ||
          data.usersdata.name.trim() === "" ||
          data.usersdata.name === "null"
        ) {
          console.log("Name is empty → go StepTwo");
           await AsyncStorage.setItem("username", data.usersdata.email);
            await AsyncStorage.setItem("password", data.usersdata.password);
            await AsyncStorage.setItem("userdata", JSON.stringify(data.usersdata));
            await AsyncStorage.setItem("userinfo", JSON.stringify(data.usersdata));
            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("refreshToken", data.refreshToken);
            // UserContext reads storage; it has to be told that storage moved.
            notifySessionChanged();
            // Same reason as the password sign-in: this is a session starting,
            // so the device has to be registered for push.
            registerPushToken();
          navigation.navigate("StepTwo", { mobileno });

        } else {
          console.log("Name exists → go Home");
            await AsyncStorage.setItem("username", data.usersdata.email);
            await AsyncStorage.setItem("password", data.usersdata.password);
            await AsyncStorage.setItem("userdata", JSON.stringify(data.usersdata));
            await AsyncStorage.setItem("userinfo", JSON.stringify(data.usersdata));
            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("refreshToken", data.refreshToken);
            // UserContext reads storage; it has to be told that storage moved.
            notifySessionChanged();
            // Same reason as the password sign-in: this is a session starting,
            // so the device has to be registered for push.
            registerPushToken();

          navigation.navigate("HomeScreen");
        }
      }
      else if (data.message === "Invalid OTP") {
        Alert.alert("Invalid OTP");
      }
      else {
        Alert.alert("Failed to verify");
      }

    } catch (error) {
      console.log("ERROR:", error.message);
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp(["", "", "", ""]);
    setTimer(40);
    setIsResendDisabled(true);
    Alert.alert("OTP Resent! Check your phone.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subText}>We've sent a 4-digit code to your phone</Text>
      <Text style={styles.subText}>SMS Sent To {mobileno}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={otp[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.verifyButton}
        onPress={() => handleSubmit(otp.join(""))}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.verifyText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <View style={styles.timerContainer}>
        <Text style={styles.resendText}>
          Resend OTP in <Text style={styles.timerText}>{timer}s</Text>
        </Text>

        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={isResendDisabled}
        >
          <Text
            style={[
              styles.resendButtonText,
              { opacity: isResendDisabled ? 0.5 : 1 },
            ]}
          >
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>

      <Toast />
    </SafeAreaView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
    gap: 12,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    backgroundColor: "#FFFFFF",
  },
  verifyButton: {
    backgroundColor: "#000000",
    paddingVertical: 14,
    width: "88%",
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  verifyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "88%",
    marginTop: 20,
    alignItems: "center",
  },
  resendText: {
    color: "#6B7280",
  },
  timerText: {
    fontWeight: "bold",
    color: "#EF4444",
  },
  resendButtonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 14,
  },
});
