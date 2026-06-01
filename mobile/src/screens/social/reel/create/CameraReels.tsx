import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PermissionsAndroid,
    Platform, Alert, Image,
    ActivityIndicator, Animated, FlatList
} from 'react-native';
import {
    Camera, useCameraDevice, useCameraDevices, PhotoFile,
    useCameraFormat
} from 'react-native-vision-camera';
import Entypo from 'react-native-vector-icons/Entypo'
import AntDesign from 'react-native-vector-icons/AntDesign'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import Feather from 'react-native-vector-icons/Feather'
import ViewShot from "react-native-view-shot";
import { captureRef } from "react-native-view-shot";
import Drag from '../../canva/Drag';
import MusicModal from '../../music/MusicModal';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import * as base from '../../../../component/global'
import Sound from 'react-native-sound';
import TextEditor from './TextEditor';
import FinalPostmodal from './FinalPostmodal';
import { launchImageLibrary } from 'react-native-image-picker';
import VideoPlayer from './VideoPlayer';
import CameraReelsSubmit from './CameraReelsSubmit';
const recordlogo = require('../../../../assets/icon/reel_icon.png');
import { Canvas, Image as sokiaImage, useImage, Skia, ColorMatrix } from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue } from "react-native-reanimated"; //skia
import { useWindowDimensions } from 'react-native';
import ReelsImageProcessing from './ReelsImageProcessing';
type MusicList = {
    id: string;
    file: string;
};
type TextBox = {
    id: string;
    text: string;
    fontSize: number;
    fontFamily: string;
    fontColor: string;
    x: number;
    y: number;
    zIndex: number;
};

type MusicItem = {
    _id: string;
    musicfile: string;
    musicname: string;
    id: string;
};
// Define a type for our UI modes
type UIMode = 'Camera' | 'Image' | 'NONE';

const CameraReels = () => {
    const cameraRef = useRef<Camera>(null);
    const soundRef = useRef<Sound | null>(null);
    const viewRef = useRef(null);
    const videoRef = useRef(null);
    const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
    const [hasPermission, setHasPermission] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const device = useCameraDevice(cameraPosition);
    const [flash, setFlash] = useState<"off" | "on" | "auto" | "torch">("on");
    // 1. Find the best format for Reels (1080p + HDR)
    const format = useCameraFormat(device, [
        { videoResolution: { width: 1080, height: 1920 } }, // Reel size
        { fps: 30 },
        { videoHdr: true }, // Makes colors pop and clear
        { photoHdr: true }
    ]);
    const { width, height } = useWindowDimensions();
    const canvasHeight = width * 1.25; // 4:5 ratio facebook
    const [exposure, setExposure] = useState(1.0); // camera brighter filter

    const [isRecordpicture, setIsRecordpicture] = useState(false);

    const [cameraMode, setCameraMode] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
    const [musiclist, setMusiclist] = useState<MusicList | null>(null);
    const [showEditorModal, setShowEditorModal] = useState(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [playingId, setPlayingId] = useState(null); // this is play from child
    const [photoUri, setPhotoUri] = useState<String | null>(null);
    const [showMusicModal, setShowMusicModal] = useState(null);
    const [selectedMusic, setSelectedMusic] = useState(false);
    const navigation = useNavigation();
    const [emojitext, setEmojitext] = useState([
        {
            "emoji": "🔥",
            "position": { "x": 150, "y": 300 },
            "timestamp": 3
        }
    ])
    const [posturl, setPosturl] = useState<String | null>(null);
    const [isimage, setIsimage] = useState<String | null>(null);
    const [videoSoundstatus, setVideoSoundstatus] = useState("disable");
    const [posttype, setPosttype] = useState("Reel");
    // console.log('....Text...FIle here.....' + JSON.stringify(textBoxes))
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const MODES = ["15s", "30s", "40s", "60s", "Photo", "video"];
    const [selectedMode, setSelectedMode] = useState("15s");
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef(null);
    //skia

    const isCapturing = useRef(false);
    const [skImage, setSkImage] = useState<SkImage | null>(null);
    const [uiMode, setUiMode] = useState<UIMode>('Camera');
    const [isProcessing, setIsProcessing] = useState(false);


    //end skia
    const stopVideoRecording_off = () => {
        if (cameraRef.current && isRecording) {
            console.log('Stopping recording...');
            cameraRef.current.stopRecording();
        }
        setIsRecording(false);
        setCameraMode('video');
        setIsimage("video")

    };

    const stopVideoRecording = () => {
        if (cameraRef.current && isRecording) {
            console.log('Stopping recording...');
            cameraRef.current.stopRecording(); // 👈 this will trigger `onRecordingFinished`
            clearInterval(intervalRef.current); // ✅ prevent double stop
            setCountdown(0); // optional safety
        }
    };



    const startVideoRecording = async () => {
        if (!cameraRef.current || isRecording) return;
        //
        let durationSec = 0;
        //  const durationSec = selectedMode === '15s' ? 15 : selectedMode === '60s' ? 60 : 0;
        if (selectedMode === 'Photo') {
            // takePhotobtn();
            navigation.navigate("TestSokia");
            return;
        } else {
            durationSec = parseInt(selectedMode.replace('s', ''), 10) || 0;
        }

        setIsRecording(true);
        setCountdown(durationSec);

        try {
            await cameraRef.current.startRecording({
                flash: 'off',
                onRecordingFinished: (video) => {
                    console.log('Recording finished:', video.path);
                    const uri = video.path.startsWith('file://') ? video.path : `file://${video.path}`;
                    setRecordedVideoUri(uri);
                    //setRecordedVideoUri(video.path);
                    setIsRecording(false);
                    setCountdown(0);
                    setCameraMode('video');
                    setIsimage("video");
                    clearInterval(intervalRef.current); // ✅ clear interval if manually finished
                },
                onRecordingError: (error) => {
                    console.error('Recording error:', error);
                    setIsRecording(false);
                    setCountdown(0);
                    clearInterval(intervalRef.current); // ✅ also clear here
                },
            });

            // ✅ Start countdown
            intervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        stopVideoRecording(); // ⏱️ auto stop
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            setIsRecording(false);
            setCountdown(0);
            clearInterval(intervalRef.current);
        }
    };

    // Flashing Animation
    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } else {
            pulseAnim.setValue(1);
            clearInterval(timerRef.current);
            setRecordingDuration(0);
        }
    }, [isRecording]);

    async function takePhotobtn____() {
        console.log('here....');
        setCameraMode('picture');
        setIsimage("Image");
        if (cameraRef.current) {
            try {
                const photo: PhotoFile = await cameraRef.current.takePhoto({
                    flash: 'off',
                    qualityPrioritization: 'quality',
                });
                console.log('Photo path:', photo.path);
                //  setCapturedPhoto(photo.path);
                setCapturedPhoto(`file://${photo.path}`);
                setIsimage("Image");


            } catch (error) {
                console.error('Failed to take photo:', error);
            }
        } else {
            console.log('cameraRef.current is null');
        }

    }

    const processImageForSkia = async (path: string) => {
        try {
            setIsProcessing(true);

            // 1. Unmount the camera view first to free up the thread
            setUiMode('NONE');

            const uri = Platform.OS === 'android' ? `file://${path}` : path;
            const data = await Skia.Data.fromURI(uri);

            if (!data) throw new Error("Could not load data");
            const image = Skia.Image.MakeImageFromEncoded(data);

            // 2. Wait 100ms to ensure the Camera component is fully destroyed
            setTimeout(() => {
                setSkImage(image);
                setUiMode('Image');
                setIsProcessing(false);
                isCapturing.current = false;
            }, 100);

        } catch (err: any) {
            console.error("Skia Error:", err);
            setUiMode('Camera');
            setIsProcessing(false);
            isCapturing.current = false;
        }
    };
    const takePhotobtn = async () => {
        if (!cameraRef.current || isCapturing.current) return;
        isCapturing.current = true;

        try {
            const photo: PhotoFile = await cameraRef.current.takePhoto({
                flash: 'off',
            });
            await processImageForSkia(photo.path);
        } catch (error) {
            isCapturing.current = false;
            console.error(error);
        }
    };

    function toggleCameraFacing() {
        setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
    }
    const deleteTextBox = (id) => {
        setTextBoxes((prev) => prev.filter((box) => box.id !== id));
    };
    const handleGoBack = () => {
        // StopParentSound();
        navigation.goBack();
    };
    const handleExport = async () => {
        if (cameraMode == "picture") {
            const uri = await captureRef(viewRef, {
                format: "png",
                quality: 1,
            });

            console.log("Captured Image URI:", uri);
            setShowPostModal(true);
            setPosturl(uri);
            setIsimage("Image");
            console.log("...text input" + JSON.stringify(textBoxes));
        } else {
            if (cameraMode == "video") {
                console.log("recordedVideoUri video URI:", recordedVideoUri);
                setShowPostModal(true);
                setPosturl(recordedVideoUri);
                setIsimage("video");
                console.log("...text input" + JSON.stringify(textBoxes));
            }

        }

        // use FFmpeg to create video
    }
    const StopParentSound = async () => {
        if (soundRef.current) {
            soundRef.current.stop(() => {
                soundRef.current?.release();
                soundRef.current = null;
            });


        }
        setPlayingId(null);
    }
    const loadGallery = async () => {
        launchImageLibrary(
            {
                //mediaType: 'photo',
                mediaType: 'mixed', // ✅ Allow both photos and videos
                selectionLimit: 1, // Set to 1 if you only want one photo
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {

                    /*  const selectedImageUri = response.assets[0].uri;
                     console.log('Selected photo URI:', selectedImageUri);
                     setCapturedPhoto(selectedImageUri); */

                    const selectedAsset = response.assets[0];
                    console.log('Selected asset:', selectedAsset);

                    const selectedUri = selectedAsset.uri;
                    const selectedType = selectedAsset.type;

                    if (selectedType && selectedType.startsWith('image/')) {
                        // ✅ It's a photo
                        console.log('Selected Photo URI:', selectedUri);
                        setCapturedPhoto(selectedUri);
                        setCameraMode('picture'); // ✅ Set picture mode
                        // setMediaType('photo');    // ✅ Set photo type
                        setIsimage("Image")
                    } else if (selectedType && selectedType.startsWith('video/')) {
                        // ✅ It's a video
                        console.log('Selected Video URI:', selectedUri);
                        setCapturedPhoto(null)
                        setRecordedVideoUri(selectedUri);
                        setCameraMode('video');   // ✅ Set video mode
                        setIsimage("video")
                        // setMediaType('video');    // ✅ Set video type
                    } else {
                        console.log('Unsupported media type');
                    }



                }
            }
        );
    };

    const playMusicFromChild = (item: MusicItem) => {
        console.log('music list' + JSON.stringify(item))
        // Stop current sound if playing
        if (soundRef.current) {
            soundRef.current.stop(() => {
                soundRef.current?.release();
                soundRef.current = null;
            });
        }

        const musicUrl = item.musicfile;
        const newSound = new Sound(musicUrl, null, (error) => {
            if (error) {
                console.error('Failed to load sound', error);
                return;
            }

            // Play the sound
            newSound.play((success) => {
                if (success) {
                    console.log('Playback finished successfully');
                } else {
                    console.warn('Playback failed due to audio decoding errors');
                }

                // Clean up
                newSound.release();
                soundRef.current = null;
                setPlayingId(null);
            });

            soundRef.current = newSound;
            setPlayingId(item.musicname);
            setMusiclist({ id: item._id, file: item.musicfile });
        });
    };



    const closeReelmodal = async () => {
        //after post parmanet it will go dashboard
        onClose();
        StopParentSound();
        finalSubmit("Final Submit");
        navigation.navigate("HomeSocial");
    };

    // Request Android Permissions
    const requestAndroidCameraPermission = async () => {
        try {
            const cameraGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: 'Camera Permission',
                    message: 'App needs access to your camera',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );

            const audioGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'App needs access to your microphone',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );

            return cameraGranted === PermissionsAndroid.RESULTS.GRANTED && audioGranted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    useEffect(() => {
        const requestPermissions = async () => {
            console.log('Requesting camera permission...');

            if (Platform.OS === 'android') {
                const granted = await requestAndroidCameraPermission();
                if (granted) {
                    console.log('Android camera permission granted');
                    setTimeout(() => setShowCamera(true), 3000);
                } else {
                    console.log('Android permission denied');
                    setPermissionDenied(true);
                }
            } else {
                const status = await Camera.requestCameraPermission();
                if (status === 'authorized') {
                    console.log('iOS camera permission granted');
                    setTimeout(() => setShowCamera(true), 3000);
                } else {
                    console.log('iOS permission denied');
                    setPermissionDenied(true);
                }
            }
        };

        requestPermissions();
    }, []);

    // Handle permission denied case
    /*     if (permissionDenied) {
            return (
                <View style={styles.centered}>
                    <Text style={{ marginBottom: 10 }}>Camera permission is required to use this feature.</Text>
                    <Button title="Open Settings" onPress={() => Linking.openSettings()} />
                </View>
            );
        } */

    // Show loading before camera appears
    if (!showCamera || device == null) {
        return (
            <View style={styles.centered}>
                <Text>Loading Camera...</Text>
                <ActivityIndicator size="large" />
            </View>
        );
    }



    return (
        <View style={styles.container}>
            <View style={styles.topmenu}>
                <View
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        top: 0
                    }}
                >
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <AntDesign name="close" size={17} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => setShowEditorModal(true)}
                    >
                        <Ionicons name="text" size={15} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={loadGallery}
                    >
                        {/*  <Ionicons name="image" size={15} color="white" /> */}
                        <MaterialCommunityIcons name="image" size={15} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            setShowMusicModal(true);
                        }}
                    >
                        <Feather name="music" size={15} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            // Cycle through flash modes
                            setFlash((prev) => {
                                switch (prev) {
                                    case "off":
                                        return "on";
                                    case "on":
                                        return "auto";
                                    case "auto":
                                        return "torch";
                                    case "torch":
                                        return "off";
                                }
                            });
                        }}
                    >
                        <Feather name="zap" size={15}
                            color={flash === "torch" ? "yellow" : "white"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Feather name="volume-2" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {!capturedPhoto ? (
                <>

                    <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        format={format}
                        videoHdr={format?.supportsVideoHdr}
                        photoHdr={format?.supportsPhotoHdr}
                        device={device}
                        photo={true}
                        isActive={true}
                        video={true}
                        audio={true}
                        exposure={1.3} // Increased slightly
                        lowLightBoost={device.supportsLowLightBoost} // 🔥 Critical for "clear" look
                        videoStabilizationMode="cinematic-extended"  // 🔥 Smoother movement
                        enableLocation={false}
                        flash={flash} // 🔥 set flash here

                    />
                    {/* First dev */}

                </>
            ) : (
                /* after Take picture  */
                <View style={styles.imagePreviewContainer}>


                    {/*   <ViewShot ref={viewRef} style={{ width: "100%", height: "100%", marginTop: 0 }}> */}
                    <ViewShot ref={viewRef} style={{ width: "100%", height: "100%", marginTop: 0 }}>
                        {cameraMode == "video" ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: capturedPhoto }}
                                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                                controls={true}
                                paused={true}
                                resizeMode="cover"
                                repeat={true}
                            />
                        ) : (
                            <>
                                {/* <Canvas style={{ width, height }}>
    {skImage && (
        <Image
            image={skImage}
            x={0}
            y={0}
           width={width} 
            height={height}
            fit="cover" 
        />
         
          
    )}
</Canvas> */}

                                <Text>Image her </Text>

                                {/* <Image
                                    source={{ uri: capturedPhoto }}
                                    style={styles.imagePreview}
                                /> */}

                            </>
                        )}

                        {textBoxes
                            .sort((a, b) => a.zIndex - b.zIndex)
                            .map((box) => (
                                <Drag
                                    key={box.id}
                                    id={box.id}
                                    text={box.text}
                                    fontSize={box.fontSize}
                                    fontFamily={box.fontFamily}
                                    fontColor={box.fontColor}
                                    initialX={box.x}
                                    initialY={box.y}
                                    zIndex={box.zIndex}
                                    onPositionChange={(x, y) => {
                                        setTextBoxes((prev) =>
                                            prev.map((item) =>
                                                item.id === box.id ? { ...item, x, y } : item
                                            )
                                        );
                                    }}
                                    onDoubleTap={() => {
                                        setTextBoxes((prev) =>
                                            prev.map((item) =>
                                                item.id === box.id
                                                    ? {
                                                        ...item,
                                                        zIndex:
                                                            Math.max(...prev.map((i) => i.zIndex)) + 1,
                                                    }
                                                    : item
                                            )
                                        );
                                    }}
                                    onDelete={deleteTextBox}
                                />
                            ))}
                    </ViewShot>



                    <View style={{
                        position: 'absolute',
                        zIndex: 10,
                        flexDirection: 'row',
                        bottom: 40, // Tailwind: bottom-20 = 20 * 4 = 80 px
                        padding: 0, // Tailwind: p-5 = 5 * 4 = 20 px
                    }}
                    >
                        <View
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#3B82F6', // Tailwind: bg-blue-500
                                    width: 100,
                                    height: 40,
                                    padding: 10,
                                    alignItems: 'center', marginLeft: 10,
                                    borderRadius: 4, // Tailwind: rounded = 4px default
                                }}
                            >
                                <Text
                                    style={{ color: 'white', fontWeight: 'bold' }}>Back</Text>
                            </TouchableOpacity>

                            {playingId ? (
                                <View
                                    style={{
                                        backgroundColor: '#3B82F6', // Tailwind: bg-blue-500
                                        height: 40,
                                        padding: 10,
                                        borderRadius: 4, // Tailwind: rounded
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FFFFFF', // Tailwind: text-white
                                            fontSize: 14,     // Tailwind: text-sm
                                            fontWeight: '500' // Tailwind: font-medium
                                        }}
                                        numberOfLines={1}
                                    >
                                        {playingId.length > 18 ? playingId.substring(0, 18) + "..." : playingId}
                                    </Text>

                                    <TouchableOpacity style={{ marginLeft: 16 }} onPress={StopParentSound}>
                                        <AntDesign name="delete" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                            ) : (
                                ""
                            )}
                            {/* Next Arrow */}
                            <TouchableOpacity
                                onPress={handleExport}
                                style={{
                                    backgroundColor: '#3B82F6', // Tailwind: bg-blue-500
                                    borderRadius: 9999,         // Tailwind: rounded-full
                                    padding: 13,                // Tailwind: p-3
                                    marginLeft: 0,             // Tailwind: ml-4
                                    shadowColor: '#000',        // Tailwind: shadow-lg
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 4.65,
                                    elevation: 8,
                                    height: 40, width: 40, marginRight: 10
                                }}
                            >
                                <Feather name="arrow-right" size={15} color="white" />
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/*  <Toast /> */}
                </View>
                /* End camera roll POST  */
            )}



            {/* old code */}

            {/* here Camera, Video */}
            {!capturedPhoto ? (
                <>
                    {countdown > 0 && (
                        <View style={{ position: 'absolute', bottom: 120, alignSelf: 'center', flexDirection: 'row', gap: 10 }}>
                            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 10 }}>
                                {countdown}
                            </Text>
                        </View>
                    )}
                    <View style={{ position: 'absolute', bottom: 90, alignSelf: 'center', flexDirection: 'row', gap: 10 }}>
                        <FlatList
                            data={MODES}
                            horizontal
                            showsHorizontalScrollIndicator={false} // hide scroll bar
                            keyExtractor={(item) => item}
                            contentContainerStyle={{
                                paddingHorizontal: 5,       // space from screen edges
                                justifyContent: 'center',    // center the list
                                gap: 5,                     // spacing between items (RN >= 0.70)
                            }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedMode(item)}
                                    style={{
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 20,
                                        backgroundColor: selectedMode === item ? '#fff' : 'transparent',
                                        borderWidth: 0,
                                        borderColor: '#fff',
                                    }}
                                >
                                    <Text style={{
                                        color: selectedMode === item ? '#000' : '#fff'
                                    }}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    <View style={{
                        position: 'absolute',
                        bottom: 40, // Tailwind "bottom-20" = 20 * 4 = 80px
                        width: '100%',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 40
                    }}
                    >

                        <TouchableOpacity
                            onPress={isRecording ? stopVideoRecording : startVideoRecording}
                            style={{
                                padding: 10, // p-4
                                borderRadius: 100, // rounded-full
                                backgroundColor: isRecording ? '#dc2626' : '#ffffff',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {isRecording ? (
                                <>
                                    <Animated.View
                                        style={{
                                            width: 25,
                                            height: 25,
                                            borderRadius: 25,
                                            backgroundColor: '#ffffff',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            opacity: pulseAnim,
                                        }}
                                    >

                                    </Animated.View>

                                </>
                            ) : (
                                <>
                                   
                                        <Image source={recordlogo} />
                                   
                                </>

                            )}
                        </TouchableOpacity>

                    </View>
                </>
            ) : ('')}
            {recordedVideoUri && (
                <VideoPlayer
                    videoUri={recordedVideoUri}
                    onDelete={() => {
                        // Reset video
                        setRecordedVideoUri(null);
                    }}
                    onPost={(videoUri, isMuted) => {
                        // ✅ Handle post logic here
                        console.log('Video posted:', videoUri, 'Muted:', isMuted);
                        // Example: Navigate to next screen, upload video, etc.
                        handleExport();

                    }}
                />
            )}

            {showMusicModal ? (
                <MusicModal
                    visible={showMusicModal}
                    onClose={() => setShowMusicModal(false)}
                    takeMusictoparents={playMusicFromChild}
                    onSelect={(music: any) => {
                        setSelectedMusic(music);
                        setShowMusicModal(false);
                        playSound(music.audio_url); // or store for export
                    }}
                />
            ) : (
                ""
            )}


            {showEditorModal ? (
                <>
                    <TextEditor
                        visible={showEditorModal}
                        onClose={() => setShowEditorModal(false)}
                        onDone={(newText) => {
                            console.log('....new text....' + JSON.stringify(newText))
                            const id = Date.now().toString();
                            setTextBoxes((prev) => [
                                ...prev,
                                {
                                    ...newText,
                                    id,
                                    //  text: newText, //"Text " + prev.length,
                                    x: 100,
                                    y: 100,
                                    zIndex: prev.length,
                                },
                            ]);

                            setShowEditorModal(false);
                        }}
                    />
                </>

            ) : (
                ""
            )}

            {showPostModal ? (
                <>
                    <CameraReelsSubmit
                        visible={showPostModal}
                        onClose={() => setShowPostModal(false)}
                        imageurl={posturl}
                        soundstatus={videoSoundstatus}
                        textoverlays={textBoxes}
                        emojioverlays={emojitext}
                        isimagefile={isimage}
                        soundurl={musiclist}
                        posttype={posttype}
                        navigation={navigation}
                        onSelect={(music) => {
                            setShowPostModal(false);
                        }}
                        onSubmit={() => setShowPostModal(false)} // Pass a function, not the boolean!
                    />
                </>
            ) : (
                ""
            )}


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        textAlign: "center",
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    controls: {
        position: "absolute",
        bottom: 30,
        alignSelf: "center",
        borderWidth: 1,
        borderColor: "#ffffff",
    },
    overlayText: {
        position: "absolute",
        top: "50%",
        alignSelf: "center",
        fontSize: 28,
        fontWeight: "bold",
    },
    textOverlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#000000aa",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    flipButton: {
        position: "absolute",
        right: 20,
        top: 30,
        padding: 10,
        backgroundColor: "#00000055",
        borderRadius: 25,
    },
    topmenu: {
        top: 0,
        position: "absolute",
        padding: 20,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        zIndex: 999
    },
    bottommenus: {
        bottom: 30,
        position: "absolute",
        padding: 20,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    bottommenu: {
        bottom: 30,
        position: "absolute",
        padding: 20,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    input: {
        width: "90%",
        marginVertical: 10,
        padding: 10,
        backgroundColor: "#ffffffaa",
        borderRadius: 10,
    },
    recordButton: {
        backgroundColor: "#ffffff",
        padding: 15,
        borderRadius: 30,
        marginTop: 10,
    },
    buttonText: {
        color: "black",
        fontWeight: "bold",
        fontSize: 18,
    },
    textIcon: {
        position: "absolute",
        bottom: 300,
        right: 20,
        backgroundColor: "#00000055",
        padding: 10,
        borderRadius: 25,
    },



    fullscreenInput: {
        width: "100%",
        fontSize: 36,
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#ccc",
    },

    colorOptions: {
        flexDirection: "row",
        marginVertical: 20,
    },

    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginHorizontal: 10,
        borderWidth: 2,
    },

    closeOverlay: {
        backgroundColor: "#1e90ff",
        padding: 10,
        borderRadius: 10,
    },
    captureButton: {
        backgroundColor: "#d32c2c",
        border: "2px solid whtie",
        borderColor: "#ffffff",
        padding: 20,
        width: 80,
        height: 80,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        position: "absolute",
        bottom: 20,
    },
    imagePreviewContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    imagePreview: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
});
export default CameraReels
