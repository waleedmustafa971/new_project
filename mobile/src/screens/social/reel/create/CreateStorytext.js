import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    PermissionsAndroid,
    Platform, Alert, Image, ScrollView
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
import ColorModal from './ColorModal';
import { Canvas, useFont, Skia } from '@shopify/react-native-skia';

const colors = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
    "#facc15", "#ff7f50", "#ffa500", "#800080", "#4b0082",
    "#00ffff", "#008080", "#ff69b4", "#a52a2a", "#808080",
    "#d2691e", "#1e90ff", "#32cd32", "#ff1493", "#7fffd4",
];

const CreateStorytext = () => {

    const soundRef = useRef(null);
    const viewRef = useRef(null);
    const videoRef = useRef(null);
    const [bgColor, setBgColor] = useState("#000");
    const [cameraPosition, setCameraPosition] = useState('back');
    const [hasPermission, setHasPermission] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const device = useCameraDevice(cameraPosition);
    const [isRecordpicture, setIsRecordpicture] = useState(false);
    const [recordedVideoUri, setRecordedVideoUri] = useState(null);

    const [cameraMode, setCameraMode] = useState('picture');
    const [capturedPhoto, setCapturedPhoto] = useState('text');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [textBoxes, setTextBoxes] = useState([]);
    const [musiclist, setMusiclist] = useState(null);
    const [showEditorModal, setShowEditorModal] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [photoUri, setPhotoUri] = useState(null);
    const [showMusicModal, setShowMusicModal] = useState(null);
    const [selectedMusic, setSelectedMusic] = useState(false);
    const navigation = useNavigation();
    const [colorModal, setColorModal] = useState(false)
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

    const deleteTextBox = (id) => {
        setTextBoxes((prev) => prev.filter((box) => box.id !== id));
    };
    const handleGoBack = () => {
        navigation.goBack();
    };
    const handleExport1 = async () => {
        console.log('dddddd lllllll')
    }
    const handleExport = async () => {
        console.log('dddd', cameraMode)

        if (cameraMode == "picture") {
            const uri = await captureRef(viewRef, {
                format: "png",
                quality: 1,
            });
            setShowPostModal(true);
            setPosturl(uri);
            setIsimage("Image");
            console.log('...here', cameraMode)
            // submitData()
        }
        else if (cameraMode == "video") {
            setShowPostModal(true);
            setPosturl(recordedVideoUri);
            setIsimage("video");
        }
        /*  else {
             setShowPostModal(true);
             setPosturl("");
             setIsimage("");
         }  */
    } // Fixed the closing brace here

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
                selectionLimit: 1,
            },
            (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    console.log('ImagePicker Error:', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                    const selectedImageUri = response.assets[0].uri;
                    setCapturedPhoto(selectedImageUri);
                    setCameraMode('picture')
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
                    const selectedAsset = response.assets[0];
                    const selectedUri = selectedAsset.uri;
                    const selectedType = selectedAsset.type;

                    if (selectedType && selectedType.startsWith('image/')) {
                        setCapturedPhoto(selectedUri);
                        setCameraMode('picture');
                        setIsimage("Image")
                    } else if (selectedType && selectedType.startsWith('video/')) {
                        setCapturedPhoto(null)
                        setRecordedVideoUri(selectedUri);
                        setCameraMode('video');
                        setIsimage("video")
                    }
                }
            }
        );
    }

    useEffect(() => {
        return () => { };
    }, []);

    const playMusicFromChild = (item) => {
        if (soundRef.current) {
            soundRef.current.stop(() => {
                soundRef.current?.release();
                soundRef.current = null;
            });
        }
        const musicUrl = item.musicfile;
        const newSound = new Sound(musicUrl, null, (error) => {
            if (error) return;
            newSound.play((success) => {
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
        <View style={[styles.container, { backgroundColor: bgColor }]}>

            {/* Top Left Close Button */}

            {/* Top Navigation Bar */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    onPress={handleGoBack}
                    style={styles.closeButton}
                >
                    <AntDesign name="close" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleExport}
                    style={styles.nextTopButton}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Next</Text>
                </TouchableOpacity>
            </View>
            {/* Right Side Sidebar (Facebook Style) */}
            <View style={styles.rightSidebar}>

                {/* Text Tool */}
                {cameraMode !== "video" && (
                    <View style={styles.iconWrapper}>
                        <Text style={styles.iconLabel}>Text</Text>
                        <TouchableOpacity
                            style={styles.iconCircle}
                            onPress={() => setShowEditorModal(true)}
                        >
                            <Ionicons name="text" size={20} color="white" />
                        </TouchableOpacity>

                    </View>
                )}

                {/* Music Tool */}
                <View style={styles.iconWrapper}>
                    <Text style={styles.iconLabel}>Music</Text>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={() => setShowMusicModal(true)}
                    >
                        <Feather name="music" size={20} color="white" />
                    </TouchableOpacity>

                </View>

                {/* Background Color / Palette */}
                <View style={styles.iconWrapper}>
                    <Text style={styles.iconLabel}>Color</Text>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={() => setColorModal(true)}
                    >
                        <MaterialCommunityIcons name="palette" size={22} color="white" />
                    </TouchableOpacity>

                </View>

                {/* Gallery Tool */}
                <View style={styles.iconWrapper}>
                    <Text style={styles.iconLabel}>Gallery</Text>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={loadGallery}
                    >
                        <MaterialCommunityIcons name="image" size={20} color="white" />
                    </TouchableOpacity>

                </View>

                {/* Video Gallery Tool */}
                <View style={styles.iconWrapper}>
                    <Text style={styles.iconLabel}>Video</Text>
                    <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={loadVideofrmgallery}
                    >
                        <MaterialCommunityIcons name="video" size={20} color="white" />
                    </TouchableOpacity>

                </View>

                {/* Volume Tool */}
                <View style={styles.iconWrapper}>
                    <Text style={styles.iconLabel}>Volume</Text>
                    <TouchableOpacity style={styles.iconCircle}>
                        <Feather name="volume-2" size={20} color="white" />
                    </TouchableOpacity>

                </View>
            </View>

            {!capturedPhoto ? (
                <View style={styles.emptyContainer} />
            ) : (
                <View style={styles.imagePreviewContainer}>
                    <ViewShot ref={viewRef} style={{ width: "100%", height: "100%" }}>
                        {cameraMode == "video" ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: capturedPhoto }}
                                style={styles.fullMedia}
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
                                    onDelete={deleteTextBox}
                                />
                            ))}
                    </ViewShot>

                    {/* Footer Controls */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleGoBack}
                        >
                            <Text style={styles.footerBtnText}>Back</Text>
                        </TouchableOpacity>


                        {playingId && (
                            <View style={styles.musicStatus}>
                                <Text style={styles.musicText} numberOfLines={1}>
                                    {playingId.length > 18 ? playingId.substring(0, 18) + "..." : playingId}
                                </Text>
                                <TouchableOpacity onPress={StopParentSound}>
                                    <AntDesign name="delete" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}



                    </View>
                </View>
            )}

            {recordedVideoUri && (
                <>
                <Text>Video Player</Text>
                <VideoTextplayer
                    videoUri={recordedVideoUri}
                    onDelete={() => setRecordedVideoUri(null)}
                    onPost={() => handleExport()}
                />
                </>
            )}

            {showMusicModal && (
                <MusicModal
                    visible={showMusicModal}
                    onClose={() => setShowMusicModal(false)}
                    takeMusictoparents={playMusicFromChild}
                    onSelect={(music) => {
                        setSelectedMusic(music);
                        setShowMusicModal(false);
                    }}
                />
            )}

            {showEditorModal && (
                <TextEditor
                    visible={showEditorModal}
                    onClose={() => setShowEditorModal(false)}
                    onDone={(newText) => {
                        const id = Date.now().toString();
                        setTextBoxes((prev) => [
                            ...prev,
                            { ...newText, id, x: 100, y: 100, zIndex: prev.length },
                        ]);
                        setShowEditorModal(false);
                    }}
                />
            )}
            {
                colorModal && (
                    <ColorModal
                        visible={colorModal}
                        onClose={() => setColorModal(false)}
                        onSelect={(color) => setBgColor(color)}
                    />
                )
            }

            {showPostModal && (
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
                    onSubmit={closeReelmodal}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    closeButton: {
        position: 'absolute',
        left: 20,
        top: 50,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 20,
    },
    rightSidebar: {
        position: 'absolute',
        right: 16,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        zIndex: 999,
        alignItems: 'center',
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 20, display: 'flex', flexDirection: 'row'
    },
    iconCircle: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLabel: {
        color: 'white',
        fontSize: 10,
        marginTop: 4,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    imagePreviewContainer: {
        flex: 1,
    },
    imagePreview: {
        width: "100%",
        height: "100%",
        position: 'absolute'
    },
    fullMedia: {
        width: '100%',
        height: '100%',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    backButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    footerBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    nextButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 25,
        padding: 12,
        elevation: 5, width: 50
    },
    musicStatus: {
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        padding: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '50%'
    },
    musicText: {
        color: 'white',
        fontSize: 12,
        marginRight: 10
    },
    emptyContainer: {
        flex: 1
    },
    headerContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 1001, // Higher than Sidebar
        height: 60,   // Give it a defined height
    },
    closeButton: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 20, height: 40
    },
    nextTopButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        justifyContent: 'center',
    },
});

export default CreateStorytext;