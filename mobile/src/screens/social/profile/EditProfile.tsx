import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as base from "../../../component/global";
import { useDispatch, useSelector } from "react-redux";
import { profileUserupdate } from "../../../store/slice/authSlice";
import Toast from 'react-native-toast-message';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/navigation';
type ProfileRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../component/api";
import CountryPicker from "react-native-country-picker-modal";
import DatePicker from 'react-native-date-picker'


const EditProfile = () => {
  const navigation = useNavigation();
  const [country, setCountry] = useState(null);
  const [visible, setVisible] = useState(false);
  const [callingCode, setCallingCode] = useState("971"); // default
  const aePhoneRegex = /^(?:\+971|00971|0)?(5[0-9]|[234679])\d{7}$/;
  const dispatch = useDispatch();
  const route = useRoute<ProfileRouteProp>();
  const { userdata } = route.params;
  const [profileImage, setProfileImage] = useState(userdata?.image);
  const [name, setName] = useState(userdata?.name);
  const [username, setUsername] = useState(userdata?.email || '');
  const [bio, setBio] = useState(userdata?.bio);
  const [id, setId] = useState(userdata?._id);
  const [isloading, setIsloading] = useState(false); //userdata
  //const [mobileno, setMobileno] = useState(userdata?.mobileno)
  // const [mobileno, setMobileno] = useState(userdata?.mobileno || '');
  const [mobileno, setMobileno] = useState(userdata?.mobileno ?? '');
  const [date, setDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [age, setAge] = useState(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');


  useEffect(() => {
    const defaultCountry = {
      cca2: "AE",
      callingCode: ["971"],
    };
    setCountry(defaultCountry);
    setCallingCode("971");
  }, []);

  useEffect(() => {
    // setOpen(true);
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



  const pickImage = async () => {
    try {
      // Pick image
      const result: any = await new Promise((resolve, reject) => {
        launchImageLibrary(
          { mediaType: 'photo', selectionLimit: 1 },
          response => {
            if (response.didCancel) reject('User cancelled image picker');
            else if (response.errorCode) reject(response.errorMessage);
            else if (response.assets?.length) resolve(response.assets[0]);
            else reject('No image selected');
          }
        );
      });

      const imageUri = result.uri;

      setProfileImage(imageUri);
      setIsloading(true);

      // Prepare form data
      const formData = new FormData();
      formData.append('email', username);

      formData.append('images', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        type: result.type || 'image/jpeg',
        name: result.fileName || 'profile.jpg',
      } as any);

      // ✅ Use axios.post directly
      const res = await axios.post(
        base.BASE_URL + '/apis/auth/updateProfileImageaws',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            // Optional: add token if your backend needs it
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        }
      );

      if (res.data?.userdata) {
        await AsyncStorage.multiRemove(['userdata', 'userinfo']);
        await AsyncStorage.multiSet([
          ['userdata', JSON.stringify(res.data.userdata)],
          ['userinfo', JSON.stringify(res.data.userdata)],
        ]);

        Toast.show({
          type: 'success',
          text1: 'Image Updated',
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Image Update Failed',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Image Upload Error',
        text2: error?.message || 'Something went wrong',
        position: 'bottom',
      });
    } finally {
      setIsloading(false);
    }
  };


  const handleSave = async () => {
    if (!name || !username || !bio || !mobileno) {
      Alert.alert("Error", "All fields are required!");
      return;
    }
    const email = username;
    setIsloading(true);

    dispatch(profileUserupdate({ id, email, name, bio, mobileno }))
      .unwrap()
      .then(() => {
        setIsloading(false);

        Toast.show({
          type: 'success',
          text1: 'Profile Updated',
          position: 'bottom',
        });
      })
      .catch((err) => {
        setIsloading(false);

        Toast.show({
          type: 'error',
          text1: err,
          position: 'bottom',
        });
      });


  };


  return (
    <View style={styles.container}>
      <View style={styles.profileImageContainer}>
        <TouchableOpacity onPress={pickImage}>
          <View style={styles.imageWrapper}>
            {
              isloading ?
                <ActivityIndicator />
                :
                <Image
                  source={
                    profileImage
                      ? { uri: base.BASE_URL + '/' + profileImage }
                      : require("../../../assets/user.png")
                  }
                  style={styles.profileImage}
                />
            }
          </View>
        </TouchableOpacity>

      </View>
      <View style={styles.inputRow}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          style={styles.input}
        />
      </View>

      {/* Username Input Row */}
      <View style={styles.inputRow}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          style={styles.input}

        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.label}>Mobile No</Text>
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
            style={{ backgroundColor: 'white', width: 200 }}
            placeholder="Phone number"
            keyboardType="numeric"
            value={mobileno}
            onChangeText={(text) => setMobileno(text)}
            placeholderTextColor="#999"
          />
        </View>
      </View>
   

      {/* Bio Input Row */}
      <View style={styles.inputRow}>
        <Text style={styles.label}>Bio </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Write something about yourself"
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          multiline
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        {
          isloading ?
            <ActivityIndicator />
            :
            <Text style={styles.saveButtonText}>Update</Text>
        }

      </TouchableOpacity>
      <Toast />
    </View>

  )
}

export default EditProfile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  dateButton: { padding: 10, backgroundColor: '#ccc', borderRadius: 10 },
  info: { marginTop: 0, fontSize: 12 },
  phoneContainer: {
    width: "100%",
    height: 40,
    borderWidth: 2, borderColor: '#f2f2f2', marginTop: 4,
    display: 'flex', flexDirection: 'row'
  },
  daypickerWrapper: {
    flex: 1,
    marginHorizontal: 0,
    borderWidth: 1,
    width: '100%', height: 40, marginTop: 7,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 40 : 20, // Adjust for status bar
    marginBottom: 20,
  },
  iconContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
  },
  profileImageContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 20,
  },
  inputRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: "#000",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
    width: 2,
    height: "60%",
    backgroundColor: "#f2f2f2",
    marginHorizontal: 8,
  },
});


