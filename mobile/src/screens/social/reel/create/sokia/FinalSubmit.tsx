import React, { useState, useEffect } from "react";
import {
    Modal,
    TextInput,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
//import ModalLocation from "./ModalLocation";
//import ModalTagPeople from "../../post/ModalTagPeople";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';
import axios from "axios";
import * as base from '../../../../../component/global'
import { formatProdErrorMessage } from "@reduxjs/toolkit";
import Video from "react-native-video";

const FinalSubmit = ({ visible, onSelect, onClose,
    imageurl, navigation, soundurl, posttype, onSubmit,
    isimagefile, soundstatus, emojioverlays, textoverlays
} : any) => {
    console.log('final image file......' + isimagefile + '...image url...' + imageurl)
    const [caption, setCaption] = useState("");
    const [showFullImage, setShowFullImage] = useState(false);
    const [showMapLocation, setShowMapLocation] = useState(false);
    const [showModalTagpeople, setShowModalTagpeople] = useState(false);
    const [userid, setUserid] = useState(null);
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [shareGroup, setShareGroup] = useState([]);
    const [visibility, setVisibility] = useState("Public"); //  setStatus("Draft")
    const [status, setStatus] = useState("Publish"); //  setStatus("Draft")
    const [selectedAddress, setSelectedAddress] = useState("");
    const [isloading, setIsloading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0); // Add this

    const handleTaggedUsers = (users : any) => {
        console.log("Selected users from child:", users);
        setTaggedUsers(users);
    };

    const handleAddressChange = (address : any) => {
        console.log('Selected Address from child:', address);
        setSelectedAddress(address);
    };

    //save as draft 
    const saveDraft = async() => {
        if (isimagefile == "Image") {
            ImageProcesstomakevideo();
        }
        else {
            //video to video process
            videoProcess()
        }  
    }
    const shareNow = async () => {
        if (isimagefile == "Image") {
            ImageProcesstomakevideo();
        }
        else {
            //video to video process
            videoProcess()
        }
    };
    const ImageProcesstomakevideo = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (!jsonValue) {
                Alert.alert("Error", "User not logged in");
                return;
            }

            const userData = JSON.parse(jsonValue);

            if (isimagefile !== "Image") {
                Alert.alert("Only image upload supported here");
                return;
            }

            if (!imageurl) {
                Alert.alert("No media selected", "Please pick an image.");
                return;
            }
            setIsloading(true)
            const formData = new FormData();

            // 🔹 MAIN IMAGE (IMPORTANT: use `images`, NOT `file`)
            formData.append("images", {
                uri: imageurl,
                name: "main_image.png",
                type: "image/png",
            });

            // 🔹 STICKER / EMOJI IMAGES
            if (Array.isArray(emojioverlays)) {
                emojioverlays.forEach((img, index) => {
                    if (img?.uri) {
                        formData.append("images", {
                            uri: img.uri,
                            name: `sticker_${index}.png`,
                            type: "image/png",
                        });
                    }
                });
            }

            // 🔹 AUDIO FILE
            if (soundurl?.file) {
                formData.append("audio", {
                    uri: soundurl.file,
                    name: "audio.mp3",
                    type: "audio/mpeg",
                });
            }

            // 🔹 TEXT LAYERS
            const layers = Array.isArray(textoverlays)
                ? textoverlays.map(layer => ({
                    text: layer.text,
                    x: Math.round(layer.x),
                    y: Math.round(layer.y),
                    fontSize: layer.fontSize || 48,
                    color: layer.color || "white",
                }))
                : [];

            // 🔹 NORMAL FIELDS
            formData.append("videoTitle", caption || "");
            formData.append("username", userData._id);
            formData.append("isimagefile", isimagefile);
            formData.append("videosound", soundstatus || "");
            formData.append("sound", JSON.stringify(soundurl || {}));
            formData.append("tagpeople", JSON.stringify(taggedUsers || []));
            formData.append("sharegroup", JSON.stringify(shareGroup || []));
            formData.append("emojioverlays", JSON.stringify(emojioverlays || []));
            formData.append("textoverlays", JSON.stringify(layers));
            formData.append("location", selectedAddress || "");
            formData.append("posttype", posttype || "");
            formData.append("posttypechild", "Image and text");
            formData.append("ispost", visibility || "");
             formData.append("status_draft_publish", status); 
            console.log("📤 Uploading formData...");

            const response = await axios.post(
                `${base.BASE_URL}/api/videoprocessing/export-music-audio`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            console.log("✅ Upload success:", response.data);
            //  Alert.alert("Success", "Post uploaded successfully");
            if (response.data.message == "Reel uploaded, processing in background") {
                setIsloading(false)
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

        } catch (error : any) {
            console.error("❌ Upload error:", error);
            if (error.response) {
                console.log("🔴 Server response:", error.response.data);
            }
            setIsloading(false);
            Alert.alert("Upload Failed", "Something went wrong.");
        }

    }

    const videoProcess = async () => {
        console.log("video processing------")
      //  try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (!jsonValue) {
                Alert.alert("Error", "User not logged in");
                return;
            }

            const userData = JSON.parse(jsonValue);
            setIsloading(true)
            const formData = new FormData();
            formData.append("video", {
                uri: imageurl, // this is video URL
                name: "input.mp4",
                type: "video/mp4",
            });
            emojioverlays.forEach((img, i) => {
                formData.append("images", {
                    uri: img.uri,
                    name: `sticker_${i}.png`,
                    type: "image/png",
                });
            });
            if (soundurl?.file) {
                formData.append("audio", {
                    uri: soundurl.file,
                    name: "audio.mp3",
                    type: "audio/mpeg",
                });
            }
            const layers = textoverlays.map(layer => ({
                type: "text",
                value: layer.text,
                x: Math.round(layer.x),
                y: Math.round(layer.y),
                fontSize: layer.fontSize || 48,
                color: layer.color || "white",
            }));

            formData.append("layers", JSON.stringify(layers));
            formData.append("videoTitle", caption || "");
            formData.append("username", userData._id);
            formData.append("isimagefile", isimagefile);
            formData.append("videosound", soundstatus || "");
            formData.append("sound", JSON.stringify(soundurl || {}));
            formData.append("tagpeople", JSON.stringify(taggedUsers || []));
            formData.append("sharegroup", JSON.stringify(shareGroup || []));
            formData.append("emojioverlays", JSON.stringify(emojioverlays || []));
            formData.append("textoverlays", JSON.stringify(layers));
            formData.append("location", selectedAddress || "");
            formData.append("posttype", posttype || "");
            formData.append("posttypechild", "Image and text");
            formData.append("ispost", visibility || ""); 
            formData.append("status_draft_publish", status); 

            console.log("..formdata..", JSON.stringify(formData))
             const response = await fetch(
                base.BASE_URL + "/api/videoprocessing/export-music-video",
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await response.json();
            console.log("Exported video URL:", data.videoUrl);
            if (data.message == "Reel uploaded, processing HLS in background") {
                setIsloading(false)
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
            setIsloading(false) 
    }


    const uploadRecordedVideo = async (imageurl, userid) => {
        setIsloading(true);
        setUploadProgress(0); // Reset at start
        try {
            const response = await fetch(base.BASE_URL + '/apis/reel/generate-upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userid,       // আপনার userId
                    prompt: caption   // আপনার ভিডিও টাইটেল
                })
            });

            const data = await response.json();
            const uploadUrl = data.uploadUrl;

            if (!uploadUrl) throw new Error("Could not get upload URL");

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', 'video/quicktime');

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(progress); // Update the UI state here
                        console.log(`Upload Progress: ${progress}%`);
                    }
                };

                xhr.onload = () => {
                    setIsloading(false);
                    onSubmit('post successfully') // this is i am rquestion to close popup
                    if (xhr.status === 200 || xhr.status === 201) {
                        resolve(data.uploadId);

                        // i think here i need to use webhook to get real asset ID
                    } else {
                        reject(`Upload failed: ${xhr.status}`);
                    }
                };

                xhr.onerror = (err) => {
                    setIsloading(false);
                    reject(err);
                };

                xhr.send({
                    uri: imageurl,
                    type: 'video/quicktime',
                    name: 'reel.mov',
                });
            });
        } catch (error) {
            setIsloading(false);
            console.error('Upload Process Error:', error);
        }
    };

    if (isloading) {
        return (
            <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                zIndex: 999,
                padding: 20
            }}>
                <ActivityIndicator size="large" color="blue" />

                {/*    <Text style={{ color: '#000', fontSize: 22, fontWeight: 'bold', marginTop: 20 }}>
                {uploadProgress}%
            </Text> */}

                <Text style={{ color: '#555', fontSize: 16, marginTop: 10, textAlign: 'center' }}>
                    Uploading your reel... please don't close the app.
                </Text>

                {/* Optional: Simple Progress Bar Background */}
                <View style={{ width: '100%', height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, marginTop: 20 }}>
                    <View style={{
                        width: `${uploadProgress}%`,
                        height: 10,
                        backgroundColor: 'blue',
                        borderRadius: 5
                    }} />
                </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={28} color="black" />
                    </TouchableOpacity>
                    <Text style={{ color: 'black', fontSize: 18, fontWeight: '600' }}> New Reel </Text>
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
                            {/*  <Text>Video URL {imageurl}</Text> */}
                            <Video
                                source={{ uri: imageurl }} // Double check imageurl is exactly "file:///..."
                                style={{ width: 64, height: 64 }} // Using style instead of className for testing
                                useNativeControls
                                resizeMode="cover"
                                onError={(e) => console.log("Video Error: ", e)} // Add this to see the actual error
                            />
                        </>

                    )}
                    <TextInput
                        style={{
                            flex: 1,
                            color: 'black',
                            fontSize: 16, marginLeft: 10,
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
                    marginBottom: 24
                }}
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


                  {/*   <TouchableOpacity>
                        <Text>{JSON.stringify(soundurl)}</Text>
                        <Text>{JSON.stringify(textoverlays)}</Text>
                        <Text>{JSON.stringify(emojioverlays)}</Text>
                    </TouchableOpacity> */}

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
                        }}  disabled={isloading} onPress={() => {
                            setStatus("Draft")
                            saveDraft()
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
                        {
                            isloading ?
                                <ActivityIndicator />
                                :
                                <Text style={{ color: 'white', fontWeight: '600' }}>
                                    Share Now
                                </Text>
                        }

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
            <Toast />
        </Modal>
    );
};

export default FinalSubmit;
