import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import {
    View, Text, StyleSheet,
    TouchableOpacity, PermissionsAndroid, Platform, Alert, useWindowDimensions,
    ActivityIndicator,
    Linking,
    ScrollView
} from 'react-native';
import { Camera, useCameraDevice, PhotoFile } from 'react-native-vision-camera';
import AntDesign from 'react-native-vector-icons/AntDesign'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import Feather from 'react-native-vector-icons/Feather'
import MusicModal from '../../music/MusicModal';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import * as base from '../../../../component/global'
import Sound from 'react-native-sound';
import TextEditor from './TextEditor';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../../navigation/navigation';
import { launchImageLibrary } from 'react-native-image-picker';
import CameraReelsSubmit from './CameraReelsSubmit';

import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import {
    Canvas, Skia, SkImage, ColorMatrix, useCanvasRef, Image,
    Text as SkiaText, useFont, ImageFormat, RoundedRect, Fill, useVideo,
    ImageShader
} from "@shopify/react-native-skia";
//import { useVideo } from "@azzapp/react-native-skia-video";
import RNFS from 'react-native-fs';
import FilterImage from '../create/sokia/FilterImage'; 
import SokiaTextEditor from '../create/sokia/SokiaTextEditor';
import { VIDEO_FILTERS } from '../../../../constants/videoFilters'

const FILTERS = [
    { id: '1', name: 'Normal', matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '2', name: 'Fade', matrix: [1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.1, 0, 0, 1, 0, 0.1, 0, 0, 0, 0.8, 0] },
    { id: '3', name: 'Fade Warm', matrix: [1.1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.05, 0, 0, 0.9, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '4', name: 'Fade Cool', matrix: [0.9, 0, 0, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 1.2, 0, 0.1, 0, 0, 0, 1, 0] },
    { id: '5', name: 'Simple', matrix: [1.1, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '6', name: 'Simple Warm', matrix: [1.2, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 1, 0] },
    { id: '7', name: 'Simple Cool', matrix: [0.9, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1.3, 0, 0, 0, 0, 0, 1, 0] },
    { id: '8', name: 'Boost', matrix: [1.3, 0, 0, 0, -0.1, 0, 1.3, 0, 0, -0.1, 0, 0, 1.3, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '9', name: 'Boost Warm', matrix: [1.4, 0, 0, 0, -0.1, 0, 1.2, 0, 0, -0.1, 0, 0, 1, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '10', name: 'Boost Cool', matrix: [1, 0, 0, 0, -0.1, 0, 1.2, 0, 0, -0.1, 0, 0, 1.5, 0, -0.1, 0, 0, 0, 1, 0] },
    { id: '11', name: 'Graphite', matrix: [0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0, 0, 0, 1, 0] },
    { id: '12', name: 'Hyper', matrix: [1.5, 0, 0, 0, -0.2, 0, 1.5, 0, 0, -0.2, 0, 0, 1.5, 0, -0.2, 0, 0, 0, 1, 0] },
    { id: '13', name: 'Rosy', matrix: [1.3, 0, 0, 0, 0.1, 0, 1.1, 0, 0, 0, 0, 0, 1.2, 0, 0.1, 0, 0, 0, 1, 0] },
    { id: '14', name: 'Emerald', matrix: [0.9, 0, 0, 0, 0, 0, 1.3, 0, 0, 0.1, 0, 0, 1.1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '15', name: 'Midnight', matrix: [0.5, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 1, 0] },
    { id: '16', name: 'Los Angeles', matrix: [1.2, 0, 0.1, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 0.9, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '17', name: 'Beauty', matrix: [1.1, 0, 0, 0, 0.1, 0, 1.1, 0, 0, 0.1, 0, 0, 1.0, 0, 0.05, 0, 0, 0, 1, 0] },
    { id: '18', name: 'Soft Glow', matrix: [1, 0, 0, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 1, 0, 0.05, 0, 0, 0, 1, 0] },
];


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
interface TextLayer {
    id: string; text: string; color: string; fontSize: number;
    x: number; y: number; bgcolor: string; fontName: string;
    alignment: 'left' | 'center' | 'right'; lastX: number; lastY: number;
}
interface StickerLayer {
    id: string;
    uri: string; // The local path or require() for the sticker image
    x: number;
    y: number;
    size: number;
}


type NewReelcameraRouteProp = RouteProp<RootStackParamList, 'NewReelcamera'>;
const customFontFile = require('../../../../assets/font/Classica-Bold.ttf'); //../../../../assets/font/Classica-Bold.ttf

const DraggableSticker = memo(({ sticker, onUpdate }: any) => {
    const x = useSharedValue(sticker.x);
    const y = useSharedValue(sticker.y);
    const context = useSharedValue({ x: 0, y: 0 });

    const pan = Gesture.Pan()
        .onStart(() => {
            'use worklet';
            context.value = { x: x.value, y: y.value };
        })
        .onUpdate((e) => {
            'use worklet';
            x.value = context.value.x + e.translationX;
            y.value = context.value.y + e.translationY;
        })
        .onEnd(() => {
            'use worklet';
            runOnJS(onUpdate)(sticker.id, x.value, y.value);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { translateY: y.value }
        ],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                style={[
                    animatedStyle,
                    {
                        position: 'absolute',
                        width: sticker.size,
                        height: sticker.size,
                        backgroundColor: 'transparent'
                    }
                ]}
            />
        </GestureDetector>
    );
});


const DraggableLayer = memo(({ layer, font, onUpdate, onEdit }: any) => {
    const x = useSharedValue(layer.x);
    const y = useSharedValue(layer.y);
    const context = useSharedValue({ x: 0, y: 0 });

    useEffect(() => {
        x.value = layer.x;
        y.value = layer.y;
    }, [layer.x, layer.y]);

    const pan = Gesture.Pan()
        .onStart(() => {
            'use worklet';
            context.value = { x: x.value, y: y.value };
        })
        .onUpdate((e) => {
            'use worklet';
            x.value = context.value.x + e.translationX;
            y.value = context.value.y + e.translationY;
        })
        .onEnd(() => {
            'use worklet';
            runOnJS(onUpdate)(layer.id, x.value, y.value);
        });

    const tap = Gesture.Tap().onEnd(() => {
        'use worklet';
        runOnJS(onEdit)(layer);
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }, { translateY: y.value - (layer.fontSize * 0.8) }],
    }));

    const textWidth = font ? font.getTextWidth(layer.text) : 100;

    return (
        <GestureDetector gesture={Gesture.Race(pan, tap)}>
            <Animated.View
                style={[
                    animatedStyle,
                    { position: 'absolute', width: textWidth + 24, height: layer.fontSize * 1.2, backgroundColor: 'transparent', left: -12 }
                ]}
            />
        </GestureDetector>
    );
});


const CreateStorymusic = () => {
    const soundRef = useRef<Sound | null>(null);
    const viewRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useCanvasRef();
    const { width, height } = useWindowDimensions();
    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
    const [hasPermission, setHasPermission] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const device = useCameraDevice(cameraPosition);
    const [isRecordpicture, setIsRecordpicture] = useState(false);
    const [skImage, setSkImage] = useState<SkImage | null>(null);
    const [selectedMatrix, setSelectedMatrix] = useState(FILTERS[0].matrix);
    const [showFilterImage, setShowFilterImage] = useState(false);
    const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
    const [isEditingText, setIsEditingText] = useState(false);

    const [cameraMode, setCameraMode] = useState<'image' | 'video' | null>(null);
    //  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState('picture');
    //  console.log('...captured Photo....' + capturedPhoto)
    const [recordingDuration, setRecordingDuration] = useState(0);
    // const [textBoxes, setTextBoxes] = useState([]);
    const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
    const [musiclist, setMusiclist] = useState<MusicList | null>(null);
    const [showEditorModal, setShowEditorModal] = useState<boolean | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState(null); // this is play from child
    const [photoUri, setPhotoUri] = useState<String | null>(null);
    // const [showMusicModal, setShowMusicModal] = useState<boolean | null>(null);
    const [showMusicModal, setShowMusicModal] = useState(true);
    const [selectedMusic, setSelectedMusic] = useState(false);
    const navigation = useNavigation();
    const [emojitext, setEmojitext] = useState([
        {
            "emoji": "🔥",
            "position": { "x": 150, "y": 300 },
            "timestamp": 3
        }
    ])
    const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);


    const [posturl, setPosturl] = useState<String | null>(null);
    const [isimage, setIsimage] = useState<String | null>(null);
    const [videoSoundstatus, setVideoSoundstatus] = useState("disable");
    const [posttype, setPosttype] = useState("Reel");
    const [overlayText, setOverlayText] = useState("");
    const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
    const [currentFontSize, setCurrentFontSize] = useState(40);
    const [textbgColorcode, setTextbgColorcode] = useState("transparent");
    const [editingId, setEditingId] = useState<string | null>(null);
    const font = useFont(customFontFile, currentFontSize);

    // Inside your component:
    const [stickers, setStickers] = useState<StickerLayer[]>([]);
    const [showStickerPicker, setShowStickerPicker] = useState(false);

    // Change this in your main component
    const [availableStickers, setAvailableStickers] = useState([]); // For the FlatList
    const [placedStickers, setPlacedStickers] = useState<StickerLayer[]>([]); // For the Canvas
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [paused, setPaused] = useState(false);

    const { currentFrame } = useVideo(
        videoUri ?? undefined,
        { paused }
    );
    /*  const { currentFrame, seekToTime } = useVideo(videoUri, { paused }); */
    const FPS = 30;
    const DURATION_SECONDS = 5; // or calculate from video
    const TOTAL_FRAMES = FPS * DURATION_SECONDS;
    const [videoDuration, setVideoDuration] = useState(0);

    const [selectedFilter, setSelectedFilter] = useState(VIDEO_FILTERS[0]);
    const [showFilters, setShowFilters] = useState(false);


    useEffect(() => {
        const requestPermissions = async () => {
            const cameraPermission = await Camera.requestCameraPermission();
            const micPermission = await Camera.requestMicrophonePermission();

            if (Platform.OS === 'android' && Platform.Version >= 33) {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                ]);
            }

            setHasPermission(
                cameraPermission === 'authorized' && micPermission === 'authorized'
            );
        };

        requestPermissions();
    }, []);



    if (device == null) return <Text />

    if (!device) {
        return (
            <View>
                <Text>Loading camera device...</Text>
            </View>
        );
    }

    const deleteTextBox = (id: any) => {
        setTextBoxes((prev) => prev.filter((box) => box.id !== id));
    };
    const handleGoBack = () => {
        // StopParentSound();
        navigation.goBack();
    };
    const handleExport = async () => {
        if (!canvasRef.current) return;

        if (cameraMode == "picture") {
            console.log('')
            const snapshot = canvasRef.current.makeImageSnapshot();
            if (!snapshot) throw new Error('Snapshot failed');
            const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);
            /** 2️⃣ Save image to file (REQUIRED for multer) */
            const imagePath = `${RNFS.CachesDirectoryPath}/canvas_${Date.now()}.jpg`;
            await RNFS.writeFile(imagePath, base64, 'base64');

            console.log("Captured Image URI:", 'file://' + imagePath);
            setShowPostModal(true);
            setPosturl('file://' + imagePath);
            setIsimage("Image");
            console.log("...text input" + JSON.stringify(textBoxes));
        } else {
           /*   */
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
                mediaType: 'photo',
                selectionLimit: 1, // Set to 1 if you only want one photo
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                    const selectedImageUri = response.assets[0].uri;
                    console.log('Selected photo URI:', selectedImageUri);

                    Skia.Data.fromURI(selectedImageUri).then((data) => {
                        if (data) {
                            const img = Skia.Image.MakeImageFromEncoded(data);
                            setSkImage(img);
                        }
                    });

                    setCapturedPhoto(selectedImageUri);
                    setCameraMode('picture');
                    setIsimage("Image")
                    setVideoUri(null)

                }
            }
        );
    };

    const loadVideofrmgallery = async () => {
        launchImageLibrary(
            {
                mediaType: 'video',
                selectionLimit: 1,
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                    const selectedVideo = response.assets[0];
                    const selectedVideoUri = selectedVideo.uri;
                    const videoDuration = selectedVideo.duration ?? 0; // Duration in seconds

                    console.log('Selected video URI:', selectedVideoUri);
                    console.log('Video duration (seconds):', videoDuration);

                    setCapturedPhoto(selectedVideoUri);
                    setRecordedVideoUri(selectedVideoUri);
                    setCameraMode('video');
                    setIsimage("video");
                    setVideoUri(selectedVideoUri);

                    // Save duration in state for downloadExport
                    setVideoDuration(videoDuration);
                }
            }
        );
    };


    useEffect(() => {
        return () => {
        };
    }, []);

    const playMusicFromChild = (item: any) => {
        console.log('music list', item);
        // Stop current sound if playing
        if (soundRef.current) {
            soundRef.current.stop(() => {
                soundRef.current?.release();
                soundRef.current = null;
            });
        }

        const musicUrl = base.BASE_URL + item.musicfile;
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
            setMusiclist({ id: item._id, file: musicUrl });
        });
    };


    const closeReelmodal = async () => {
        onClose();
        StopParentSound();
        finalSubmit("Final Submit");
    };

    const handleLayerUpdate = useCallback((id: string, x: number, y: number) => {
        setTextLayers(prev => prev.map(l => l.id === id ? { ...l, x, y } : l));
    }, []);

    //handleStackerLayerUpdate
    const handleStackerLayerUpdate = useCallback((id: string, x: number, y: number) => {
        setPlacedStickers(prev => prev.map(s =>
            s.id === id ? { ...s, x: x, y: y } : s
        ));
    }, []);


    const editExistingText = useCallback((layer: TextLayer) => {
        setOverlayText(layer.text);
        setCurrentTextColor(layer.color);
        setCurrentFontSize(layer.fontSize);
        setTextbgColorcode(layer.bgcolor);
        setEditingId(layer.id);
        setIsEditingText(true);
    }, []);

    const addSticker = async (uri: string) => {
        console.log('...adding sticker to canvas... ', uri);
        try {
            const data = await Skia.Data.fromURI(uri);
            const image = Skia.Image.MakeImageFromEncoded(data);

            if (image) {
                const newSticker: StickerLayer = {
                    id: Date.now().toString(),
                    skImage: image, // This is the SkImage object for Skia
                    x: width / 2 - 50,
                    y: height / 2 - 50,
                    size: 100,
                };
                // UPDATE THIS LINE to match your Canvas state name
                setPlacedStickers(prev => [...prev, newSticker]);
                setShowStickerPicker(false);
            }
        } catch (err) {
            console.error("Error loading sticker into Skia:", err);
        }
    };

    const handleOpenStickers = async () => {
        const nextState = !showStickerPicker;
        setShowStickerPicker(nextState);

        if (nextState) setShowFilterImage(false);

        // Use availableStickers here, not the canvas stickers
        if (nextState && availableStickers.length === 0) {
            setLoading(true);
            try {
                const response = await fetch(`${base.BASE_URL}/apis/auth/stickers`);
                const data = await response.json();
                setAvailableStickers(data); // Save to the gallery state
            } catch (error) {
                console.error("Error fetching stickers:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const seekToFrame = async (frameIndex: number) => {
        const time = frameIndex / FPS;
        videoRef.current?.seek(time);
        await new Promise(r => setTimeout(r, 40));
    };

    const downloadExport = async () => {
        if (cameraMode == "video") 
        {
        console.log("recordedVideoUri video URI:", recordedVideoUri);
        setShowPostModal(true);
        setPosturl(recordedVideoUri);
        setIsimage("video");
        console.log("...text input" + JSON.stringify(textBoxes));
        }
    };

    /* 
          //  Alert.alert("video process")

    
    
    */


    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
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
                        //   onPress={() => setShowEditorModal(true)} isEditingText
                        onPress={() => setIsEditingText(true)}
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
                        <MaterialCommunityIcons name="image" size={15} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={loadVideofrmgallery}
                    >
                        <MaterialCommunityIcons name="video" size={15} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            setShowMusicModal(true);
                        }}
                    >
                        <Feather name="music" size={15} color="white" />
                    </TouchableOpacity>
                    {
                        cameraMode == 'picture' && isimage == "Image" ?
                            <>
                                <TouchableOpacity
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 25,
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        setShowFilterImage(prev => !prev);
                                    }}>

                                    <Feather name="filter" size={15} color="#ffffff" />
                                </TouchableOpacity>
                            </>
                            :
                            <>
                                <TouchableOpacity
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 25,
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        setShowFilters(prev => !prev);
                                    }}>

                                    <Feather name="filter" size={15} color="#ffffff" />
                                </TouchableOpacity>

                            </>

                    }

                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={() => {
                            // setShowStickerPicker(prev => !prev);
                            handleOpenStickers()
                            setShowStickerPicker(!showStickerPicker);
                            setShowFilterImage(false);
                        }}>

                        <Feather name="smile" size={15} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 25,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
                </>
            ) : (
                /* After camera roll POST  */
                <View style={styles.imagePreviewContainer}>
                    <View style={{ flex: 1 }}>
                        <Canvas ref={canvasRef} style={{ width, height }}>
                            {videoUri && currentFrame && (
                                <Fill>
                                    <ImageShader
                                        image={currentFrame}
                                        fit="cover"
                                        x={0}
                                        y={0}
                                        width={width}
                                        height={height}
                                    />
                                    {/* Video Effect */}
                                    <ColorMatrix
                                        matrix={selectedFilter.matrix}
                                    />
                                    {/*  <ColorMatrix matrix={selectedFilter.matrix} /> */}
                                </Fill>
                            )}

                            {/* IMAGE (only when not video) */}
                            {!videoUri && skImage && (
                                <Image
                                    image={skImage}
                                    x={0}
                                    y={0}
                                    width={width}
                                    height={height}
                                    fit="cover"
                                >
                                    <ColorMatrix matrix={selectedMatrix} />
                                </Image>
                            )}
                            {currentFrame && (
                                <ImageShader
                                    image={currentFrame}
                                    fit="cover"
                                    x={0}
                                    y={0}
                                    width={width}
                                    height={height}
                                />
                            )}
                            {textLayers.map((layer) => {
                                const tWidth = font ? font.getTextWidth(layer.text) : 100;
                                return (
                                    <React.Fragment key={`draw-${layer.id}`}>
                                        {layer.bgcolor !== 'transparent' && (
                                            <RoundedRect x={layer.x - 12} y={layer.y - (layer.fontSize * 0.85)} width={tWidth + 24} height={layer.fontSize * 1.2} r={10} color={layer.bgcolor} />
                                        )}
                                        <SkiaText x={layer.x} y={layer.y} text={layer.text} font={font} color={layer.color} />
                                    </React.Fragment>
                                );
                            })}
                            {placedStickers.map((sticker) => (
                                <Image
                                    key={sticker.id}
                                    image={sticker.skImage}
                                    x={sticker.x}
                                    y={sticker.y}
                                    width={sticker.size}
                                    height={sticker.size}
                                />
                            ))}
                        </Canvas>

                    </View>
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {textLayers.map((layer) => (
                            <DraggableLayer key={`hit-${layer.id}`} layer={layer} font={font} onUpdate={handleLayerUpdate} onEdit={editExistingText} />
                        ))}
                    </View>
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {placedStickers.map((sticker) => (
                            <DraggableSticker
                                key={`hit-${sticker.id}`}
                                sticker={sticker}
                                onUpdate={handleStackerLayerUpdate}
                            />
                        ))}
                    </View>

                </View>
                /* End camera roll POST  */
            )}
            {/* Footer */}
            <View style={{
                backgroundColor: '#000',
                flexDirection: 'row',
                padding: 7
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
                            borderRadius: 25,
                            padding: 10,
                            alignItems: 'center', marginLeft: 10,
                            // borderRadius: 4, // Tailwind: rounded = 4px default
                        }}
                    >
                        <Text
                            style={{
                                color: 'white',
                                fontSize: 12
                            }}>Back</Text>
                    </TouchableOpacity>

                    {playingId ? (
                        <View
                            style={{
                                backgroundColor: '#3B82F6', // Tailwind: bg-blue-500
                                height: 40,
                                padding: 10,
                                borderRadius: 25, // Tailwind: rounded
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: '#FFFFFF', // Tailwind: text-white
                                    fontSize: 10,     // Tailwind: text-sm
                                    fontWeight: '500' // Tailwind: font-medium
                                }}
                                numberOfLines={1}
                            >
                                {playingId.length > 18 ? playingId.substring(0, 18) + "..." : playingId}
                            </Text>

                            <TouchableOpacity style={{ marginLeft: 16 }} onPress={StopParentSound}>
                                <AntDesign name="delete" size={15} color="white" />
                            </TouchableOpacity>
                        </View>

                    ) : (
                        ""
                    )}

                    {
                        cameraMode == "picture" ?
                           <TouchableOpacity
                                onPress={handleExport}
                                style={styles.nextbutton}
                            >
                                <Feather name="arrow-right" size={15} color="white" />
                            </TouchableOpacity>
                            :
                             <TouchableOpacity
                                onPress={downloadExport}
                                style={styles.nextbutton}
                            >
                                <Feather name="arrow-right" size={15} color="white" />
                            </TouchableOpacity>
                            
                    }
                </View>
            </View>
            {showMusicModal && <MusicModal visible={showMusicModal} onClose={() => setShowMusicModal(false)} takeMusictoparents={playMusicFromChild} />}
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

            {
                showStickerPicker ?
                    <View style={styles.filterBar}>
                        <FlatList
                            horizontal
                            data={availableStickers} // Use the fetched API data here
                            keyExtractor={(item) => item?.id?.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => addSticker(`${base.BASE_URL}${item.uri}`)}
                                    style={styles.stickerThumb}
                                >
                                    <Animated.Image
                                        source={{ uri: `${base.BASE_URL}${item.uri}` }}
                                        style={{ width: 60, height: 60, borderRadius: 10 }}
                                    />
                                </TouchableOpacity>
                            )}
                        />
                    </View> : null
            }


            {showPostModal ? (
                <>
                    <CameraReelsSubmit
                        visible={showPostModal}
                        onClose={() => setShowPostModal(false)}
                        imageurl={posturl}
                        soundstatus={videoSoundstatus}
                        textoverlays={textLayers} 
                        emojioverlays={placedStickers}
                        isimagefile={isimage}
                        soundurl={musiclist}
                        posttype={posttype}
                        navigation={navigation}
                        onSelect={(music) => {
                            setShowPostModal(false);
                        }}
                        onSubmit={closeReelmodal}
                    />
                </>
            ) : (
                ""
            )}
            {showFilterImage && (
                <View style={styles.filterBar}>
                    <FilterImage skImage={skImage} filters={FILTERS} selectedMatrix={selectedMatrix} onSelect={setSelectedMatrix} />
                </View>
            )}
            {/* SokiaTextEditor */}
            <SokiaTextEditor
                visible={isEditingText} initialText={overlayText} initialColor={currentTextColor} initialSize={currentFontSize} initialbgColor={textbgColorcode}
                onSave={(text: string, color: string, size: string, fontName: string, alignment: string, bgcolor: string) => {
                    if (text.trim() === "") {
                        if (editingId) setTextLayers(prev => prev.filter(l => l.id !== editingId));
                    } else if (editingId) {
                        setTextLayers(prev => prev.map(l => l.id === editingId ? { ...l, text, color, fontSize: size, bgcolor, fontName, alignment } : l));
                    } else {
                        setTextLayers([...textLayers, { id: Date.now().toString(), text, color, fontSize: size, bgcolor, fontName, alignment, x: width / 4, y: height / 2, lastX: width / 4, lastY: height / 2 }]);
                    }
                    setIsEditingText(false);
                }}
                onClose={() => setIsEditingText(false)}
                onDelete={() => { setTextLayers(prev => prev.filter(l => l.id !== editingId)); setIsEditingText(false); }}
            />

            {showFilters && (
                <View style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    backgroundColor: "#000",
                    paddingVertical: 12,
                }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {VIDEO_FILTERS.map(filter => (
                            <TouchableOpacity
                                key={filter.id}
                                onPress={() => setSelectedFilter(filter)}
                                style={{
                                    marginHorizontal: 10,
                                    alignItems: "center",
                                    opacity: selectedFilter.id === filter.id ? 1 : 0.6,
                                }}
                            >
                                {/* Preview Circle */}
                                <View style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 27,
                                    backgroundColor: "#333",
                                    borderWidth: selectedFilter.id === filter.id ? 2 : 0,
                                    borderColor: "#fff",
                                }} />
                                <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
                                    {filter.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}


        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterBar: { height: 100, bottom: 10, position: 'absolute', width: '100%' },
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
        padding: 20,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        zIndex: 999, backgroundColor: '#000'
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
        // borderWidth: 3, borderColor: 'red'
    },
    imagePreview: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
    stickerThumb: {
        width: 70,
        height: 70,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // Elevation for Android
        elevation: 5,
        overflow: 'hidden', // Ensures the image stays within the border radius
    },
    stickerImage: {
        width: '90%', // Slight padding inside the white box
        height: '90%',
        resizeMode: 'contain',
    },
    nextbutton: {
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
    }

});
export default CreateStorymusic