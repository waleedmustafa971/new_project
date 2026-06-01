import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PermissionsAndroid,
    Platform, Alert, Image
} from 'react-native';
import { Camera, useCameraDevice, PhotoFile } from 'react-native-vision-camera';
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../../navigation/navigation';
import { launchImageLibrary } from 'react-native-image-picker';
import VideoTextplayer from './VideoTextplayer';


const StartStory = () => {

    const soundRef = useRef(null);
    const viewRef = useRef(null);
    const videoRef = useRef(null);

    const [cameraPosition, setCameraPosition] = useState('back');
    const [hasPermission, setHasPermission] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const device = useCameraDevice(cameraPosition);
    const [isRecordpicture, setIsRecordpicture] = useState(false);
    const [recordedVideoUri, setRecordedVideoUri] = useState(null);

    const [cameraMode, setCameraMode] = useState('picture');
    const [capturedPhoto, setCapturedPhoto] = useState('text');
    console.log('...captured Photo....' + capturedPhoto)
    const [recordingDuration, setRecordingDuration] = useState(0);
    // const [textBoxes, setTextBoxes] = useState([]);
    const [textBoxes, setTextBoxes] = useState([]);
    const [musiclist, setMusiclist] = useState(true);
    const [showEditorModal, setShowEditorModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [playingId, setPlayingId] = useState(null); // this is play from child
    const [photoUri, setPhotoUri] = useState(null);
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


    const [posturl, setPosturl] = useState(null);
    const [isimage, setIsimage] = useState(null);
    const [videoSoundstatus, setVideoSoundstatus] = useState("disable");
    const [posttype, setPosttype] = useState("Story");


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
          /*   console.log("Captured video URI:", capturedPhoto);
            setShowPostModal(true);
            setPosturl(capturedPhoto);
            setIsimage("video");
            console.log("...text input" + JSON.stringify(textBoxes)); */

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
                    setCapturedPhoto(selectedImageUri);
                    setCameraMode('picture')
                }
            }
        );
    };

    /*     const loadVideofrmgallery = async () => {
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
                        const selectedImageUri = response.assets[0].uri;
                        console.log('Selected photo URI:', selectedImageUri);
                        setCapturedPhoto(selectedImageUri);
                        setCameraMode('video');
                    }
                }
            );
        } */



    const loadVideofrmgallery = async () => {
        /* launchImageLibrary(
            {
                mediaType: 'video',
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
                    setCapturedPhoto(selectedImageUri);
                    setCameraMode('video')
                }
            }
        ); */
        launchImageLibrary(
            {
                //mediaType: 'photo',
                mediaType: 'video', // ✅ Allow both photos and videos
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

    }


    useEffect(() => {
        return () => {
            // This runs when the component unmounts
            /*    navigation.setParams({
                   typescreen: undefined,
                   picture: undefined,
                   imagetype: undefined,
                   musictype: undefined,
               }); */
        };
    }, []);

    const playMusicFromChild = (item) => {
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
        onClose();
        StopParentSound();
        finalSubmit("Final Submit");
    };

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
                            width: 50,
                            height: 50,
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
                            width: 50,
                            height: 50,
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
                            width: 50,
                            height: 50,
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
                            width: 50,
                            height: 50,
                            borderRadius: 25, // Half of width/height for full circle
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Tailwind: bg-black/20
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onPress={loadVideofrmgallery}
                    >
                        {/*  <Ionicons name="image" size={15} color="white" /> */}
                        <MaterialCommunityIcons name="video" size={15} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            width: 50,
                            height: 50,
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
                            width: 50,
                            height: 50,
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
                    {/*   <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        photo={true} // <-- VERY IMPORTANT
                        isActive={true}
                        video={true}
                        audio={true}
                    /> */}
                </>
            ) : (
                /* After camera roll POST  */
                <View style={styles.imagePreviewContainer}>
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
                            <Image
                                source={{ uri: capturedPhoto }}
                                style={styles.imagePreview}
                            />
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

                    </View>
                </>
            ) : ('')}

            {recordedVideoUri && (
                <VideoTextplayer
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
                    onSelect={(music) => {
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
                    <FinalPostmodal
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
                        onSubmit={closeReelmodal}
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
export default StartStory