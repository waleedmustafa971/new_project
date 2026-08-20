import React, { useState, useEffect } from "react";
import {
    Modal,
    TextInput,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
//import ModalLocation from "./ModalLocation";
import ModalTagPeople from "../../post/ModalTagPeople";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';
import axios from "axios";
import * as base from '../../../../component/global'
import { formatProdErrorMessage } from "@reduxjs/toolkit";
import Video from "react-native-video";

const FinalPostModal = ({
    visible,
    onSelect,
    onClose,
    imageurl,
    navigation, soundurl, posttype, onSubmit, isimagefile,
    soundstatus, emojioverlays, textoverlays
}) => {
    console.log('final image file......' + isimagefile + '...image url...' + imageurl)
    const [caption, setCaption] = useState("");
    const [showFullImage, setShowFullImage] = useState(false);
    const [showMapLocation, setShowMapLocation] = useState(false);
    const [showModalTagpeople, setShowModalTagpeople] = useState(false);
    const [userid, setUserid] = useState(null);
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [shareGroup, setShareGroup] = useState([]);
    const [visibility, setVisibility] = useState("Public");
    const [selectedAddress, setSelectedAddress] = useState("");
    const [isloading, setIsloading] = useState(false)


    const handleTaggedUsers = (users) => {
        console.log("Selected users from child:", users);
        setTaggedUsers(users);
    };

    const handleAddressChange = (address) => {
        console.log('Selected Address from child:', address);
        setSelectedAddress(address);
    };
    //shareNow
    const shareNow = async () => {
        /*
          The author's id, not their email.

          This read AsyncStorage "username", which holds the email address —
          authSlice stores it as setItem("username", email). The server's Reels
          schema declares `username` as an ObjectId ref, so every story upload
          died with "Cast to ObjectId failed for value waleed...@gmail.com".
          The reel path next door already reads userdata._id; this matches it.
        */
        const raw = await AsyncStorage.getItem("userdata");
        const userid = raw ? (JSON.parse(raw)?._id || null) : null;
        if (!userid) {
            Alert.alert("Not signed in", "Sign in again to post a story.");
            setIsloading(false);
            return;
        }
        console.log("..JSON..." + JSON.stringify(imageurl)); //imageurl 
        setIsloading(true);
        if (!imageurl) {
            Alert.alert("No media selected", "Please pick a file to upload.");
            return;
        }
        const formData = new FormData();
        if (isimagefile === "Image") {
            formData.append('file', {
                uri: imageurl,
                type: 'image/png', // or dynamically detect
                name: 'photo.png',  // should be filename like 'photo.png'
            });
        } else {
            formData.append('file', {
                uri: imageurl,
                type: 'video/mp4',
                name: 'video.mp4',   // <-- must be filename like 'video.mp4'
            });
        }
        //soundstatus
        formData.append("videosound", soundstatus); // last update 3 fields
        formData.append("emojioverlays", JSON.stringify(emojioverlays));
        formData.append("textoverlays", JSON.stringify(textoverlays));
        formData.append("videoTitle", caption); //isimagefile
        formData.append("isimagefile", isimagefile); //isimagefile
        formData.append("username", userid);
        formData.append("sound", JSON.stringify(soundurl));
        formData.append("tagpeople", JSON.stringify(taggedUsers));
        formData.append("location", selectedAddress);
        formData.append("sharegroup", JSON.stringify(shareGroup));
        formData.append("posttype", posttype);
        formData.append("ispost", visibility);
        formData.append("posttypechild", "Image and text");
        console.log('...formdata.....' + JSON.stringify(formData))

        try {
            const response = await axios.post(
                base.BASE_URL + "/apis/reel/updateReelpost", ///apis/reel/updateReelpost
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            console.log("User updated:", response.data);
            if (response.data.message == "File uploaded successfully") {

                Toast.show({
                    type: "success",
                    text1: "Post is processing waiting for rechecking",
                    position: "bottom",
                });
                setIsloading(false);
                onClose()
                onSubmit('post successfully')
                navigation.navigate("HomeSocial");
            } else {
                Toast.show({
                    type: "error",
                    text1: "Image Updated",
                    position: "bottom",
                });
                setIsloading(false);
            }
        } catch (error) {
            setIsloading(false);

            if (error.response) {
                // Server responded with a status code outside 2xx
                console.log("🔴 Response data:", error.response.data);
                console.log("🔴 Status:", error.response.status);
                console.log("🔴 Headers:", error.response.headers);
            } else if (error.request) {
                // Request was made but no response received
                console.log("🟡 No response received:", error.request);
            } else {
                // Something happened in setting up the request
                console.log("⚠️ Error message:", error.message);
            }

            Alert.alert("Upload Failed", "Something went wrong on the server.");
        }


    }

    if (isloading) {
        return (
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                zIndex: 999, 
                borderRadius: 0, 
                padding: 20
            }}>
                <ActivityIndicator size="large" color="blue" />
                <Text style={{ color: '#000', fontSize: 18, marginTop: 10 }}>
                    Wait until process is complete
                </Text>
            </View>
        );
    }



    return (
        <Modal visible={visible} animationType="slide">
            <View style={{
                flex: 1,
                backgroundColor: 'white',
                paddingHorizontal: 16, 
                paddingTop: 24          
            }}
            >
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16, 
                }}
                >
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={28} color="black" />
                    </TouchableOpacity>
                    <Text
                        style={{
                            color: 'black',
                            fontSize: 18,        
                            fontWeight: '600',   
                        }}
                    >
                        New Reel Post {imageurl}
                    </Text>

                    <View style={{ width: 28 }} />
                </View>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start', 
                    marginBottom: 16,         
                   
                }}
                >
                    {isimagefile === "Image" ? (
                        <TouchableOpacity onPress={() => setShowFullImage(true)}>
                            <Image
                                source={{ uri: imageurl }}
                                style={{ width: 50, height: 50, borderRadius: 50 }}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ) : (
                        <>
                          
                            <Video
                                source={{ uri: imageurl }}
                                className="w-16 h-16 rounded-md"
                                useNativeControls
                                shouldPlay={false}
                                resizeMode="cover"
                            />
                        </>

                    )}
                    <TextInput
                        style={{
                            flex: 1,
                            color: 'black',
                            fontSize: 16,              
                            borderBottomWidth: 1,      
                            borderBottomColor: '#E5E7EB',
                            paddingBottom: 4,         
                        }}

                        placeholder="Write a caption..."
                        placeholderTextColor="#aaa"
                        multiline
                        value={caption}
                        onChangeText={setCaption}
                    />
                </View>
                <View style={{
                    marginBottom: 24 }}
                >
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 4,     
                            borderBottomWidth: 1,  
                            borderBottomColor: '#E5E7EB', 
                        }}

                        onPress={() => {
                            setVisibility((prev) =>
                                prev === "Public" ? "Private" : "Public"
                            );
                        }}
                    >
                        <Text style={{
                            color: 'black'
                        }}>Who can see the reel?</Text>
                       
                        <View>
                            <Text
                                style={{
                                    color: '#374151',   
                                    fontWeight: '600', 
                                }}
                            >
                                {visibility}
                            </Text>

                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 4,       
                            borderBottomWidth: 1,     
                            borderBottomColor: '#E5E7EB', 
                        }}

                        onPress={() => {
                            setShowMapLocation(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            <Text style={{ color: 'black' }}>Add Location</Text>
                            <Text style={{ marginLeft: 12 }}>{selectedAddress}</Text>  
                        </View>


                        <Ionicons name="location-outline" size={20} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,         
                            borderBottomWidth: 1,       
                            borderBottomColor: '#E5E7EB', 
                        }}

                        onPress={() => {
                            setShowModalTagpeople(true);
                        }}
                    >
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        >
                            <Text style={{
                                color: '#000'
                            }}>Tag People</Text>
                          
                            <View style={{
                                flexDirection: 'row',
                                marginLeft: 8,  
                            }}
                            >
                                {taggedUsers.slice(0, 10).map((user, index) => (
                                    <Image
                                        key={user._id || index}
                                        source={
                                            user.image
                                                ? { uri: user.image }
                                                : require("../../../../assets/user.png")
                                        }
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12, 
                                            marginLeft: index === 0 ? 0 : -8, 
                                            borderWidth: 1,
                                            borderColor: "white", 
                                        }}
                                    />
                                ))}

                                {taggedUsers.length > 10 && (
                                    <View
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: "#ccc",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginLeft: -8,
                                            borderWidth: 1,
                                            borderColor: "white",
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, color: "#000" }}>...</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <Ionicons name="person-add-outline" size={20} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 8,        
                        borderBottomWidth: 1,      
                        borderBottomColor: '#E5E7EB',
                    }}
                    >
                        <Text className="text-black">Share to Group</Text>
                        <Ionicons name="people-outline" size={20} color="black" />
                    </TouchableOpacity>
                </View>

                {/* Footer Buttons */}
                <View style={{
                    position: 'absolute',
                    bottom: 24,        
                    left: 16,         
                    right: 16,        
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}
                >
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#1F2937',
                            paddingHorizontal: 16,   
                            paddingVertical: 8,     
                            borderRadius: 16,      
                        }}
                    >
                        <Text style={{ color: 'white' }}>Save Draft</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: '#2563EB',
                            paddingHorizontal: 24,    
                            paddingVertical: 8,    
                            borderRadius: 16,      
                        }}
                        disabled={isloading}
                        onPress={shareNow}
                    >
                        <Text style={{ color: 'white', fontWeight: '600' }}>
                            Share Now
                        </Text>
                    </TouchableOpacity>

                </View>
            </View>

            {showFullImage && (
                <Modal visible transparent>
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'black',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => setShowFullImage(false)}
                            style={{
                                position: 'absolute',
                                top: 40,      
                                right: 20,  
                                zIndex: 10,
                            }}
                        >
                            <Ionicons name="close-circle" size={36} color="black" />
                        </TouchableOpacity>

                        <Image
                            source={{ uri: imageurl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>

            )}
            {/*   <ModalLocation
        visible={showMapLocation}
        navigation={navigation}
        onAddressSelect={handleAddressChange}
        onClose={() => setShowMapLocation(false)}
      /> */}
            {
                showModalTagpeople ?
                    <ModalTagPeople
                        visible={showModalTagpeople}
                        navigation={navigation}
                        userid={userid}
                        onClose={() => setShowModalTagpeople(false)}
                        onSelectUsers={handleTaggedUsers}
                    /> : null
            }

            <Toast />
        </Modal>
    );
};

export default FinalPostModal;
