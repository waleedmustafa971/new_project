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
import Toast from 'react-native-toast-message';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/navigation';
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;


const Profile = () => {
  const navigation = useNavigation();
  const route = useRoute<ProfileRouteProp>();
  const { userid, userinfo } = route.params;
  const [profileImage, setProfileImage] = useState(userinfo?.image);
  const [name, setName] = useState(userinfo?.name);
  const [username, setUsername] = useState(userinfo?.email);
  const [bio, setBio] = useState(userinfo?.bio);
  const [id, setId] = useState(userinfo?._id);
  const [isloading, setIsloading] = useState(false); //userdata
  const [mobileno,setMobileno] = useState(userinfo?.mobileno)


  

const pickImage = async () => {
 
  
};

const handleSave = async () => {
 
  
};

    
  return (
     <View style={styles.container}>
      {/* Header with back icon and title */}
      {/* Profile image upload row */}
      <View style={styles.profileImageContainer}>
        <TouchableOpacity onPress={pickImage}>
          <View style={styles.imageWrapper}>
            {
              isloading ? 
              <ActivityIndicator/>
              :
              <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : require("../../../assets/user.png")
              }
              style={styles.profileImage}
            />
            }
         
           {/*  <Ionicons
              name="camera"
              size={24}
              color="white"
              style={styles.cameraIcon}
            /> */}
          </View>
        </TouchableOpacity>
   
      </View>

      {/* Name Input Row */}
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
          disable
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.label}>Mobile No</Text>
        <TextInput
          value={mobileno}
          onChangeText={setMobileno}
          placeholder="Mobile No"
          style={styles.input}
        />
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
      <TouchableOpacity style={styles.saveButton} >
        <Text style={styles.saveButtonText}>Update</Text>
      </TouchableOpacity>
      <Toast />
    </View>

  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
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
    fontSize: 20,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "bold",
  },
});


