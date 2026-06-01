import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
//import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from "@react-native-async-storage/async-storage";

const StepTwo = (props) => {
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*?_]/.test(password);

  const isValid = hasMinLength && hasLetter && hasNumber && hasSpecialChar;


  const Submit = async() => {
   const email = await AsyncStorage.getItem("tempemail");
   // Alert.alert(email);
   console.log('.....' + email + '....password' + password)
   const passwords = await AsyncStorage.setItem("temppassword", password);
   props.navigation.navigate("StepThree"); 

  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.caption}>Create Password</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#888"
            secureTextEntry={secure}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.eyeIcon}>
            <Icon name={secure ? "eye-off" : "eye"} size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Real-time password validation feedback */}
        <View style={styles.validationContainer}>
          <ValidationItem valid={hasMinLength} text="At least 8 characters" />
          <ValidationItem valid={hasLetter} text="At least one letter" />
          <ValidationItem valid={hasNumber} text="At least one number" />
          <ValidationItem valid={hasSpecialChar} text="At least one special character (!@#$%^&*?_)" />
        </View>

      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: isValid ? "#000" : "#ccc" }]}
        disabled={!isValid}
        onPress={Submit}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
    paddingRight: 45,
    color: '#000'
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

export default StepTwo;
