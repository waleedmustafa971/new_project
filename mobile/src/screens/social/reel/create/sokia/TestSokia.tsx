import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, Text, FlatList, PermissionsAndroid, Dimensions, Modal,
  Alert,
  ScrollView
} from 'react-native';
import {
  Camera, useCameraDevice, PhotoFile,
  useSkiaFrameProcessor
} from 'react-native-vision-camera';
import AntIcon from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import ReelsImageProcessing from '../ReelsImageProcessing';
import { launchImageLibrary } from 'react-native-image-picker';
import ModalSelector from './camerareels/ModalSelector';
import CameraReelsSidebar from './camerareels/CameraReelsSidebar';
import VideoView from './camerareels/VideoView';
import Video from 'react-native-video';
import VideoNativeffmge from './camerareels/VideoNativeffmge';
import CameraIcon from './cameraicon/CameraIcon';
const { width, height } = Dimensions.get('window');

const LIVE_FILTERS = [
  { id: '1', name: 'Original', type: 'None' },
  { id: '2', name: 'B&W', type: 'Grayscale' },
  { id: '3', name: 'Sepia', type: 'Sepia' },
];
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Canvas,
  Image,
  Skia,
  SkImage,
  ColorMatrix,
  useCanvasRef, Text as SkiaText, useFont, ImageFormat, RoundedRect
} from "@shopify/react-native-skia";
import RNFS from 'react-native-fs';
import VideoEditorCanva from './VideoEditorCanva';
import HeaderReels from './HeaderReels';
import MusicModal from '../../../music/MusicModal';
import ActiveMusicBadge from '../../../music/ActiveMusicBadge';
import * as base from '../../../../../component/global'
import Sound from 'react-native-sound';
import FilterImage from './FilterImage';
//import { VIDEO_FILTERS } from '../../../../constants/videoFilters'
import { VIDEO_FILTERS } from '../../../../../constants/videoFilters'
import SokiaTextEditor from './SokiaTextEditor';
import FinalSubmit from './FinalSubmit';

type MusicList = {
  id: string;
  file: string;
}
Sound.setCategory('Playback');


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
interface StickerLayer {
  id: string;
  uri: string; // The local path or require() for the sticker image
  x: number;
  y: number;
  size: number;
}
const customFontFile = require('../../../../../assets/font/Classica-Bold.ttf'); //../../../../assets/font/Classica-Bold.ttf
interface TextLayer {
  id: string; text: string; color: string; fontSize: number;
  x: number; y: number; bgcolor: string; fontName: string;
  alignment: 'left' | 'center' | 'right'; lastX: number; lastY: number;
  //fontSize, alignment
}


const TestSokia = () => {
  const navigation = useNavigation();
  const [camerapotion, setCamerapotion] = useState<"front" | "back">("front");
  const device = useCameraDevice(camerapotion);
  const cameraRef = useRef<Camera>(null);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [currentFilter, setCurrentFilter] = useState('None');
  const [showLiveEffects, setShowLiveEffects] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentMode, setCurrentMode] = useState<'CAMERA' | 'LOADING' | 'EDITOR' | 'VIDEO' | 'PHOTO'>('CAMERA');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoUrilocal, setVideoUrilocal] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(60);
  const MODES = ["15s", "30s", "40s", "60s", "Photo"];
  const [selectedMode, setSelectedMode] = useState("15s");
  const [tempGalleryFile, setTempGalleryFile] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useCanvasRef();
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musiclist, setMusiclist] = useState<MusicList | null>(null);
  const [selectedMusic, setSelectedMusic] = useState(false);
  const soundRef = useRef<Sound | null>(null);
  const [playingId, setPlayingId] = useState(null); // this is play from child 
  const [showFilterVideo, setShowFilterVideo] = useState(false); // this is play from child 
  const [selectedFilter, setSelectedFilter] = useState(VIDEO_FILTERS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
  const [overlayText, setOverlayText] = useState("");
  const [currentFontSize, setCurrentFontSize] = useState(40);
  const [textbgColorcode, setTextbgColorcode] = useState("transparent");
  const [placedStickers, setPlacedStickers] = useState<StickerLayer[]>([]); // For the Canvas
  const font = useFont(customFontFile, currentFontSize);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  //  const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
  //  const [overlayText, setOverlayText] = useState("");
  //  const [currentFontSize, setCurrentFontSize] = useState(40);
  //  const [textbgColorcode, setTextbgColorcode] = useState("transparent");
  //  const [placedStickers, setPlacedStickers] = useState<StickerLayer[]>([]); // For the Canvas
  //  const font = useFont(customFontFile, currentFontSize);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [showPostModal, setShowPostModal] = useState(false)
  const [posturl,setPosturl] = useState(null) //isimage
  const [isimage,setIsimage] = useState<'VIDEO' | 'PHOTO'>('PHOTO');
  //const [isimage,setPost] = useState(null) //isimage posttype
 


  // Convert mode string (e.g., "15s" or "2m") to total seconds
  const getLimitInSeconds = (mode: string) => {
    if (mode === 'Photo') return 0;
    if (mode.includes('s')) return parseInt(mode);
    if (mode.includes('m')) return parseInt(mode) * 60;
    return 15; // default
  };
  useEffect(() => {
    /*  const checkPermissions = async () => {
       await Camera.requestCameraPermission();
       await Camera.requestMicrophonePermission(); // Don't forget this!
     };
     checkPermissions(); */
    requestPermissions()
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await Camera.requestCameraPermission();
    const microphonePermission = await Camera.requestMicrophonePermission(); // This MUST be granted for video={true}

    if (cameraPermission !== 'granted' || microphonePermission !== 'granted') {
      Alert.alert("Permissions required", "We need camera and mic access to record video.");
    }
  };
  // Monitor the timer to stop recording automatically
  useEffect(() => {
    const limit = getLimitInSeconds(selectedMode);

    if (isRecording && seconds >= limit && limit > 0) {
      stopRecording();
    }
  }, [seconds, isRecording, selectedMode]);

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(0);
      console.log("Recording Finished");
      ///call here video editor to open in sokia
    }
  };

  useEffect(() => {
    // This runs when the component is destroyed
    return () => {
      cleanupTempFiles();
    };
  }, []);

  const cleanupTempFiles = async () => {
    if (tempGalleryFile) {
      try {
        const path = tempGalleryFile.replace('file://', '');
        const exists = await RNFS.exists(path);
        if (exists) {
          await RNFS.unlink(path);
          console.log("🗑️ Temp gallery file deleted");
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      } finally {
        setTempGalleryFile(null);
      }
    }
  };
  //video and photo selection from gallery
  const handleSelectedMedia = (asset: any) => {
    const { uri, type } = asset;

    console.log('....uri data.... ', uri);

    if (!uri || !type) return;

    if (type.startsWith('video/')) {
      setVideoUrilocal(uri);
      // setCurrentMode('EDITOR');
      setCurrentMode('VIDEO');
      setIsimage('VIDEO');
    } else if (type.startsWith('image/')) {
      setPhotoPath(uri);
      setCurrentMode('PHOTO');
      setIsimage('PHOTO');
    }
  };
  const pickVideo = async () => {
    const res = await launchImageLibrary({ mediaType: 'mixed' });

    if (res.didCancel || !res.assets?.length) return;

    const asset = res.assets[0];

    handleSelectedMedia(asset);

    if (asset.duration) {
      setVideoDuration(asset.duration);
    }
  };
  const cameraProcess = async () => {
    if (!cameraRef.current || !isCameraReady) return;

    switch (selectedMode) {
      case "Photo":
        await takePhotobtn(); // Your existing photo function
        break;

      default: // This handles 15s, 30s, 2m, etc.
        if (isRecording) {
          // Manual stop if user presses button again
          await stopRecording();
        } else {
          console.log('video recording is start')
          // Start Recording
          setIsRecording(true);
          setSeconds(0);

          // Start the UI Timer
          timerRef.current = setInterval(() => {
            setSeconds(prev => prev + 1);
          }, 1000);

          await cameraRef.current.startRecording({
            onRecordingFinished: (video) => {
              console.log("Video Saved:", video.path);
              setVideoUri(`file://${video.path}`);
              setCurrentMode('VIDEO'); //EDITOR  currentMode
              setVideoUrilocal(`file://${video.path}`);
              /* Only the gallery-pick path set this, so a clip recorded
                 with the camera kept the initial 'PHOTO' and was stored on
                 the reel as a photo — the log read "final image file
                 ......PHOTO" for a .mov. */
              setIsimage('VIDEO');
            },
            onRecordingError: (error) => console.error(error),
          });
        }
        break;
    }
  };

  const takePhotobtn = async () => {
    if (!cameraRef.current || !isCameraReady) return;
    try {
      const photo = await cameraRef.current.takePhoto();
      const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      setCurrentMode('LOADING');
      setTimeout(() => {
        setPhotoPath(uri);
        setCurrentMode('PHOTO');
        /* The counterpart to setting VIDEO on a recording: taking a photo
           after recording a clip would otherwise keep the earlier value. */
        setIsimage('PHOTO');
      }, 600);
    } catch (e) { console.error(e); }
  };

  /*
    handleRecordPress was removed. It toggled isRecording and logged, without
    touching the camera at all — a decoy that looked like the record handler and
    silently broke every recording it was attached to.
  */

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

  const handleStopSound = () => {
    if (soundRef.current) {
      //  Alert.alert("sound");
      // 1. Stop the playback
      soundRef.current.stop(() => {
        console.log("Playback stopped successfully");

        // 2. Release native resources
        soundRef.current?.release();

        // 3. Nullify the reference
        soundRef.current = null;

        // 4. Update UI
        setPlayingId(null);
      });
    } else {
      // Fallback if the ref is lost but state remained
      setPlayingId(null);
    }
  };
  const handlevolumnSetting = () => {

  }

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


  if (!device) return <View style={styles.center}><ActivityIndicator color="white" /></View>;

  const NextProcess = () => {
    console.log("Next Process......", videoUrilocal);
    /*
      Refuse to continue without a file.

      Nothing checked, so a null path travelled all the way into the multipart
      body as "uri": null and the server was asked to save a video that did not
      exist. Failing here says what is wrong while the person is still on the
      screen that can fix it.
    */
    if (!videoUrilocal && !photoPath) {
      Alert.alert(
        "Nothing recorded yet",
        "Record a clip or take a photo before continuing."
      );
      return;
    }
    setShowPostModal(true)
    //videoUrilocal
   // setVideoUrilocal(videoUrilocal)
  }
  /*
    FinalSubmit calls this after a reel posts successfully. It was a leftover
    stub that raised an empty "Close Modal" alert — so the one moment the
    composer worked ended with a debug dialog. It now clears the capture so
    coming back to the camera does not still hold the clip just published.
  */
  const closeReelmodal = () => {
    setShowPostModal(false);
    setPhotoPath(null);
    setVideoUri(null);
    setVideoUrilocal(null);
    cleanupTempFiles();
    setCurrentMode('CAMERA');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* 
      
      */}
      {currentMode === 'PHOTO' && photoPath ? (
        <>
        
        </>
      ) : (
        <>
         <HeaderReels navigation={navigation} handleExport={NextProcess}
        onBack={() => {
          navigation.goBack()
        }} />
        </>
      )}

     
      {/* Camera first open View*/}
      {
        currentMode === "CAMERA" ?
          <>
            <View style={StyleSheet.absoluteFill}>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device} video={true} audio={true}
                photo={true}
                isActive={true}
                onInitialized={() => setIsCameraReady(true)}
              />


              <ModalSelector modes={MODES} selectedMode={selectedMode} onSelect={setSelectedMode} />
              {/* Bottom Controls */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.galleryBtn} onPress={pickVideo}>
                  <AntIcon name="picture" size={18} color="white" />
                </TouchableOpacity>
                <View style={styles.captureContainer}>
                  {/*
                    While recording, CameraIcon renders its own Pressable and so
                    wins the tap — this outer cameraProcess never runs. It used
                    to be handed handleRecordPress, which only logged
                    "Stop recording" and flipped a flag: it never called
                    cameraRef.stopRecording(), so onRecordingFinished never
                    fired, videoUri stayed null, and Share posted a form with
                    "uri": null. currentMode stayed on PHOTO for the same
                    reason, which is why a recorded video announced itself as
                    "final image file......PHOTO". Both handlers are the real
                    one now.
                  */}
                  <TouchableOpacity onPress={cameraProcess} style={styles.captureOuter}>
                    {
                      isRecording ?
                        <CameraIcon
                          isRecording={isRecording}
                          onPress={cameraProcess}
                        />
                        :
                        <View style={[
                          styles.captureInner,
                          {
                            //  backgroundColor: selectedMode === 'Photo' ? 'white' : 'red',
                            backgroundColor: 'red', borderRadius: 20
                            //  borderRadius: isRecording ? 15 : 15 // Turns into a square while recording
                          }
                        ]}>
                        </View>

                    }
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setCamerapotion(c => c === 'front' ? 'back' : 'front')} style={styles.flipBtn}>
                  <AntIcon name="sync" size={18} color="white" />
                </TouchableOpacity>
              </View>
              {/* Footer recording time will show */}
              {isRecording && (
                <Text style={styles.progressText}>
                  {seconds}s / {selectedMode}
                </Text>
              )}
            </View>
          </>
          : null
      }
      {
        currentMode === "VIDEO" ?
          <>
            <View style={StyleSheet.absoluteFill}>
              <VideoEditorCanva videoUri={videoUrilocal}
                showFilterImage={showFilterVideo}
                selectedFilter={selectedFilter}
                showText={showText}
                onBack={() => {
                  setPhotoPath(null);
                  cleanupTempFiles();
                  setVideoUri(null);
                  setCurrentMode('CAMERA');
                }}
              />
            </View>
          </>
          : null
      }
      {/* Audio for All Image or Video  ActiveMusicBadge */}
      {
        playingId ?
          <View style={{ alignContent: 'center', alignItems: 'center' }}>
            <ActiveMusicBadge
              playingId={playingId}
              onStop={() => {
                console.log("test page");
                handleStopSound()
              }}
              volumnSetting={handlevolumnSetting}
            /></View> :
          null
      }

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
                onPress={() => {
                  setSelectedFilter(filter);
                  console.log('.....filter..for video.... ', JSON.stringify(filter))
                }
                }
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
      
      {
        currentMode === "CAMERA" ?
          null
          : <CameraReelsSidebar
            showLiveEffects={showLiveEffects}
            showMusic={() => {
              setShowMusicModal(true)
            }}
            showText={() => {
              setShowText(true);
              setIsEditingText(true);
              console.log("back from child...... show Text")
            }}
            currentMode={currentMode}
            onFilter={() => {
              console.log('filter show');
              // setShowFilterVideo(true)
              setShowFilters(true)
            }}
            onToggleEffects={() => setShowFilters(!showFilters)}
          />
      }


      {showMusicModal ? (
        <MusicModal
          visible={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          takeMusictoparents={playMusicFromChild}
        />
      ) : (
        ""
      )}

      {/* Old code */}
      {videoUrilocal ? //&& CurrentMode === "EDITOR" 
        <>
          {/*  <Modal
            visible={currentMode === 'EDITOR' && !!videoUrilocal}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setCurrentMode('CAMERA')} 
          >
            <VideoNativeffmge videoUri={videoUrilocal}
              onBack={() => {
                setPhotoPath(null);
                cleanupTempFiles(); 
                setVideoUri(null);
                setCurrentMode('CAMERA');
              }}
            />
          </Modal> */}

        </> : null

      }


      {/* after taking picture */}
      {
        currentMode === "PHOTO" && videoUri ? (
          <Modal
            visible={currentMode === 'PHOTO' && !!videoUri}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setCurrentMode('PHOTO')}
          >
            <VideoView videoUri={videoUri}
              onBack={() => {
                setPhotoPath(null);
                cleanupTempFiles(); // Delete the copy
                setVideoUri(null);
                setCurrentMode('PHOTO');
              }}

            />
          </Modal>
        ) : null
      }
      {/* this is for image if user select image from gallery */}
      {currentMode === 'PHOTO' && photoPath ? (
        <>
          <ReelsImageProcessing photoUri={photoPath}
            onBack={() => { setPhotoPath(null); setCurrentMode('CAMERA'); }}
          />
        </>
      ) : (
        <>
        </>
      )}

      {showPostModal ? (
        <>
          <FinalSubmit
            visible={showPostModal}
            onClose={() => setShowPostModal(false)}
            imageurl={videoUrilocal}
            soundstatus=""
            textoverlays={textLayers}
            emojioverlays={placedStickers}
            isimagefile={isimage}
            soundurl={musiclist}
            posttype="Reel"
            navigation={navigation}
            onSelect={(music : any) => {
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rightSidebar: { position: 'absolute', right: 5, top: '10%', alignItems: 'flex-end' },
  sidebarBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  sidebarLabel: { color: 'white', marginRight: 15, fontSize: 14, fontWeight: '600', textShadowColor: 'black', textShadowRadius: 2 },
  iconCircle: { width: 30, height: 30, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  effectBar: { position: 'absolute', bottom: 10, left: 0, right: 0 },
  filterThumb: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 25, height: 50, marginHorizontal: 10, borderRadius: 25, justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' },
  activeFilter: { backgroundColor: '#FF0050', borderColor: '#FF0050' },
  filterText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  filterBar: { height: 100, bottom: 10, position: 'absolute', width: '100%' },
  video: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  footer_photo_video: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },

  captureInner: {
    width: 30,           // slightly smaller inner circle
    height: 30,
    backgroundColor: 'red',
  },
  galleryBtn: { width: 35, height: 35, borderRadius: 12, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  flipBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  captureBtn: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'white'
  },
  innerCircle: {
    width: 60,
    height: 60,
    backgroundColor: 'white'
  },

  modeOption: {
    marginHorizontal: 15,
    alignItems: 'center',
  },
  modeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeText: {
    color: '#FFD700', // Gold/Yellow when active
  },
  activeDot: {
    width: 4,
    height: 4,
    marginTop: 4
  },
  captureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 0, marginTop: 15,
    textShadowColor: 'black',
    textShadowRadius: 2,
    position: 'absolute',
    bottom: 0, alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 40,           // smaller width
    height: 40,          // smaller height
    borderRadius: 20,    // half of width/height → makes it perfectly round
    borderWidth: 3,      // optional: smaller border
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TestSokia;