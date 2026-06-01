/* Date of Birth */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Alert,
  Platform, ScrollView, ActivityIndicator, Button
} from 'react-native';
import DatePicker from 'react-native-date-picker'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import * as base from '../../component/global'


const StepFour = ({ navigation }) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(''); //setLoading
  const [loading, setLoading] = useState(false); //
  const [selectdate, setSelectdate] = useState('Select Data of Birth')
  const isValid = day && month && year;
  const [formattedDate, setFormattedDate] = useState('');
  const [date, setDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [age, setAge] = useState(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );


  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleContinue_old = async () => {
    const birthDate = date;
    console.log('Date of birth:', birthDate);

    const email = await AsyncStorage.getItem("tempemail");
    const regtype = await AsyncStorage.getItem("regtype");
    const password = await AsyncStorage.getItem("temppassword");
    const name = await AsyncStorage.getItem("tempname");
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
    //   Alert.alert('..Email Address...' + email)
    console.log('Name:', name, 'Email:', email, 'Password:', password, 'fcmtoken:', fcmtoken, 'location:', location);

    if (!email || !password || !name || !birthDate) {
      Toast.show({
        type: 'error',
        text1: 'All fields are required',
        position: 'bottom',
      });
      return;
    }
    //  Alert.alert('reg type ...' + regtype)
    if (regtype === "mobile") {
      setLoading(true);
      console.log(base.BASE_URL + '/apis/auth/update_dateofbirth');
      console.log('Registration Type: ' + regtype + '---mobile no---' + email + '---password---' + password + '-date of birth ' + birthDate);

      try {
        const response = await fetch(base.BASE_URL + '/apis/auth/update_dateofbirth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileno: email,
            password: password,
            dateofbirth: birthDate,
            name: name,
            regtype: "mobile",
            fcmtoken: fcmtoken,
            location: location
          }),
        });
        console.log({
          mobileno: email,
          password: password,
          dateofbirth: birthDate,
          name: name,
          regtype: "mobile",
          fcmtoken: fcmtoken,
          location: location
        })

        const data = await response.json();
        console.log('Server Response:', data);

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }

        if (data.message === "birthdate updated") {
          await AsyncStorage.setItem('username', email);
          await AsyncStorage.setItem('password', password);
          await AsyncStorage.setItem('userdata', JSON.stringify(data.usersdata));
          await AsyncStorage.setItem('userinfo', JSON.stringify(data.usersdata));
          //  await AsyncStorage.setItem("token", data.token);

          // navigation.navigate("HomeScreen");
          navigation.navigate("YourInterestScreen");
        } else if (data.message == "All fields are required") {
          Toast.show({
            type: 'error',
            text1: 'All fields are required',
            position: 'bottom',
          });
        }
        else if (data.message == "mobile no not found") {
          Toast.show({
            type: 'error',
            text1: 'All fields are required',
            position: 'bottom',
          });
        }
        else {
          Toast.show({
            type: 'error',
            text1: 'Failed to update birthdate',
            position: 'bottom',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: error.message,
          position: 'bottom',
        });
        console.error('Error updating birthdate:', error);
      } finally {
        setLoading(false);
      }
    }
    else {
      /////// Email

      setLoading(true);
      console.log(base.BASE_URL + '/apis/auth/update_dateofbirthemail');
      console.log('Registration Type: ' + regtype + '---email---' + email + '---password---' + password + '-date of birth ' + birthDate);

      try {
        const response = await fetch(base.BASE_URL + '/apis/auth/update_dateofbirthemail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            dateofbirth: birthDate,
            name: name,
            regtype: "email",
            fcmtoken: fcmtoken,
            location: location
          }),
        });

        const data = await response.json();
        console.log('Server Response:', data);

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }

        if (data.message === "User registered successfully") {
          navigation.navigate("YourInterestScreen");
        } else if (data.message == "All fields are required") {
          Toast.show({
            type: 'error',
            text1: 'All fields are required',
            position: 'bottom',
          });
        }
        else if (data.message == "email not found") {
          Toast.show({
            type: 'error',
            text1: 'All fields are required',
            position: 'bottom',
          });
        }
        else {
          Toast.show({
            type: 'error',
            text1: 'Failed to update birthdate',
            position: 'bottom',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: error.message,
          position: 'bottom',
        });
        console.error('Error updating birthdate:', error);
      } finally {
        setLoading(false);
      }



      //////
    }
  };

  const handleContinue = async () => {
    try {
      const birthDate = date;
      // 🔥 Get all data at once (faster)
      const keys = [
        "tempemail",
        "regtype",
        "temppassword",
        "tempname",
        "fcmtoken",
        "USER_LOCATION"
      ];
      const result = await AsyncStorage.multiGet(keys);
      const dataMap = Object.fromEntries(result);
      const email = dataMap.tempemail;
      const regtype = dataMap.regtype;
      const password = dataMap.temppassword;
      const name = dataMap.tempname;
      const fcmtoken = dataMap.fcmtoken;
      const location = dataMap.USER_LOCATION
        ? JSON.parse(dataMap.USER_LOCATION)
        : null;

      console.log({ email, regtype, name, birthDate, location });

      // 🔴 Validation
      if (!email || !password || !name || !birthDate) {
        return Toast.show({
          type: 'error',
          text1: 'All fields are required',
          position: 'bottom',
        });
      }

      setLoading(true);

      // 🔥 Dynamic API URL
      const isMobile = regtype === "mobile";

      const url = isMobile
        ? `${base.BASE_URL}/apis/auth/update_dateofbirth`
        : `${base.BASE_URL}/apis/auth/update_dateofbirthemail`;

      // 🔥 Dynamic payload
      const payload = {
        password,
        dateofbirth: birthDate,
        name,
        regtype,
        fcmtoken,
        location,
        ...(isMobile ? { mobileno: email } : { email }),
      };

      console.log("API:", url);
      console.log("Payload:", payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      console.log("Server Response:", resData);

      if (!response.ok) {
        throw new Error(resData.message || 'Something went wrong');
      }

      // ✅ Success handling
      if (
        resData.message === "birthdate updated" ||
        resData.message === "User registered successfully"
      ) {
        // Save user data only once
        await AsyncStorage.multiSet([
          ['username', email],
          ['password', password],
          ['userdata', JSON.stringify(resData.usersdata || {})],
          ['userinfo', JSON.stringify(resData.usersdata || {})],
        ]);

        navigation.navigate("YourInterestScreen");
        return;
      }

      // ❌ Error handling (clean)
      const errorMessages = {
        "All fields are required": "All fields are required",
        "mobile no not found": "Mobile number not found",
        "email not found": "Email not found",
      };

      Toast.show({
        type: 'error',
        text1: errorMessages[resData.message] || 'Failed to update birthdate',
        position: 'bottom',
      });

    } catch (error) {
      console.error("Error:", error);

      Toast.show({
        type: 'error',
        text1: error.message,
        position: 'bottom',
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
        <View style={{ display: 'flex', flexDirection: 'row', padding: 15 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon
              name="chevron-back"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', padding: 15,
          justifyContent: 'space-between'
         }}>
          <View>
          <Text style={{ fontSize: 24,
            fontWeight: 'bold'
           }}>When's  your</Text>  
          <Text style={{ fontSize: 24,
            fontWeight: 'bold'
           }}>birthday?</Text>  
          </View>
          <Icon name="gift-outline" size={50} color="green" />
        </View>

      <ScrollView contentContainerStyle={styles.innerContainer}>
        <View style={styles.pickerRow}>
          <View style={styles.daypickerWrapper}>
            <TouchableOpacity onPress={() => setOpen(true)}>
              <Text style={styles.label}>  {formattedDate || 'Select Date of Birth'} </Text>
            </TouchableOpacity>

            <DatePicker
              modal
              open={open}
              date={date}
              mode='date'
              minimumDate={new Date(2000, 0, 1)}   // ✅ add this
              maximumDate={eighteenYearsAgo}
              onConfirm={(date) => {
                setOpen(false);
                setDate(date);
                const formatted = formatDate(date);
                setFormattedDate(formatted);
                const calculatedAge = calculateAge(date); // Use the original Date object
                setAge(calculatedAge)
                setIsButtonDisabled(calculatedAge >= 18);
                console.log('Selected: ', date);
                console.log('Formatted: ', formatted);
                console.log('Age: ', calculatedAge);
              }}
              onCancel={() => {
                setOpen(false);
              }}
            />
            {formattedDate !== '' && (
              <View style={styles.info}>
               {/*  <Text style={{ fontSize: 12 }}>Selected Date: {formattedDate}</Text> */}
                <Text style={{ fontSize: 12 }}>Your Age: {age}</Text>
              </View>
            )}

          </View>

        </View>
      </ScrollView>

      <TouchableOpacity
        // disabled={isButtonDisabled}
        style={[styles.button, isButtonDisabled && styles.disabledButton]}
        onPress={handleContinue}
      >
        {
          loading ? <ActivityIndicator /> :
            <Text style={styles.buttonText}>Continue</Text>
        }
      </TouchableOpacity>
      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-between",
  },
  innerContainer: {
    padding: 5,
    alignItems: "center",
    justifyContent: "center", marginTop: 10
  },
  icon: {
    marginBottom: 20,
  },
  caption: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginVertical: 20,
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
  },
  daypickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    width: 50,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
  },
  label: {
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
  },
  button: {
    paddingVertical: 16,
    margin: 24,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dateButton: { padding: 10, backgroundColor: '#ccc', borderRadius: 10 },
  info: { marginTop: 20, alignItems: 'center', fontSize: 12 },
  continueButton: {
    marginTop: 30,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  passwordWrapper: {
    position: "relative",
  },

});

export default StepFour;
