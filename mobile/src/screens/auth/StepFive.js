/* if already have Email address */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet, ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/slice/authSlice";
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native'


const StepFive = ({ route }) => {

  console.log('...email...' + email)
  const navigation = useNavigation();
  const [email, setEmail] = useState(route.params.email);
  const [password, setPassword] = useState(null);
  const [secure, setSecure] = useState(true);
  const inputRef = useRef(null)

  const safePassword = password || ''; // fallback to empty string if null
  const isNotEmpty = safePassword.trim() !== '';
  const hasMinLength = safePassword.length >= 6;

  // ✅ Combine as needed
  const isValid = isNotEmpty && hasMinLength;
  const dispatch = useDispatch();
  const { loading, error, message } = useSelector((state) => state.auth);


   useFocusEffect(
    React.useCallback(() => {
      const timeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 350) // IMPORTANT delay
  
      return () => clearTimeout(timeout)
    }, [])
  )
  


  const handleSubmit = () => {
    console.log("email...." + email);

    if (email == "" || password == "") {
      console.log('email...password.....' + email + '---password....' + password)

      Toast.show({
        type: 'error',
        text1: 'Insert the Email and Password',
        position: 'bottom',
      });
    } else {
      dispatch(loginUser({ email, password }))
        .unwrap()
        .then((data) => {
          console.log('data...' + data)
          navigation.navigate("HomeScreen");
        })
        .catch((err) => {
          console.log('error......' + err)

          Toast.show({
            type: 'error',
           // text1: err,
            text1: "Invalid Information",
            position: 'bottom',
          });
        });
    }
  };


  return (
     <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.caption}>Enter Your Password</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#000"
            secureTextEntry={secure}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.eyeIcon}>
            <Icon name={secure ? "eye-off" : "eye"} size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Real-time password validation feedback */}
      {/*   <View style={styles.validationContainer}>
          <ValidationItem valid={hasMinLength} text="At least 8 characters" />

        </View> */}

        <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => {
          navigation.navigate("ForgotPasswordScreen")
        }}>
          <Text>Forget Password ?</Text>
        </TouchableOpacity>

      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: isValid ? "#000" : "#ccc" }]}
        onPress={() => handleSubmit()}
          disabled={loading} 
      >
        {
          loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Continue</Text>
        }
      </TouchableOpacity>

      <Toast />

    </KeyboardAvoidingView>
  );
};
const ValidationItem = ({ valid, text }) => (
  <Text style={{ color: valid ? 'green' : 'red', marginBottom: 4 }}>• {text}</Text>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "space-between",
  },
  innerContainer: {
    marginTop: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  passwordWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
    paddingRight: 45, color: '#000'
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    top: 16,
  },
  validationContainer: {
    marginVertical: 10,
  },
  terms: {
    fontSize: 14,
    color: "#555",
    marginTop: 10,
  },
  link: {
    color: "#007bff",
    textDecorationLine: "underline",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default StepFive;
