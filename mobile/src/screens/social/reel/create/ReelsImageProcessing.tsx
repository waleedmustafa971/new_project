import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import {
    View, useWindowDimensions, TouchableOpacity, Text, StyleSheet,
    ActivityIndicator, Alert, Platform, FlatList,
    Modal
} from 'react-native';
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
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- CHILD COMPONENT PATHS RESTORED ---
import FilterImage from './sokia/FilterImage';
import HeaderControls from './sokia/HeaderControls';
import SokiaTextEditor from './sokia/SokiaTextEditor';
import RightMenuIcon from './sokia/RightMenuIcon';
import Sound from 'react-native-sound';
import MusicModal from '../../music/MusicModal';
import api from '../../../../component/api';
import * as base from '../../../../component/global';
import TimerModal from '../../music/TimerModal';
import VolumenControll from '../../music/VolumenControll';
import FinalProcess from './FinalProcess';
import { useNavigation } from '@react-navigation/native';

type MusicList = { id: string; file: string; };
type MusicItem = { _id: string; musicfile: string; musicname: string; id: string; };

const customFontFile = require('../../../../assets/font/Classica-Bold.ttf');

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

interface Props { photoUri: string; onBack: () => void; }
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

Sound.setCategory('Playback');

const ReelsImageProcessing = ({ photoUri, onBack }: Props) => {
    console.log('.....ReelsImageProcessing..... ', photoUri)
    const { width, height } = useWindowDimensions();
    const navigation = useNavigation();
    const canvasRef = useCanvasRef();
    const soundRef = useRef<Sound | null>(null);
    //  const [stickers, setStickers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [skImage, setSkImage] = useState<SkImage | null>(null);
    const [selectedMatrix, setSelectedMatrix] = useState(FILTERS[0].matrix);
    const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [musiclist, setMusiclist] = useState<MusicList | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState({ startTime: 0, endTime: 50 });
    const [isEditingText, setIsEditingText] = useState(false);
    const [showFilterImage, setShowFilterImage] = useState(false);
    const [showMusicModal, setShowMusicModal] = useState(false);
    const [volumenModal, setVolumenModal] = useState(false);
    const [timesmodal, setTimesmodal] = useState(false);
    const [finalModal, setFinalModal] = useState(false);
    const [overlayText, setOverlayText] = useState("");
    const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
    const [currentFontSize, setCurrentFontSize] = useState(40);
    const [textbgColorcode, setTextbgColorcode] = useState("transparent");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [textValue, setTextValue] = useState('');

    const font = useFont(customFontFile, currentFontSize);



    // Inside your component:
    const [stickers, setStickers] = useState<StickerLayer[]>([]);
    const [showStickerPicker, setShowStickerPicker] = useState(false);

    // Change this in your main component
    const [availableStickers, setAvailableStickers] = useState([]); // For the FlatList
    const [placedStickers, setPlacedStickers] = useState<StickerLayer[]>([]); // For the Canvas

    useEffect(() => {
        let isCancelled = false;
        Skia.Data.fromURI(photoUri).then((data) => {
            if (data && !isCancelled) {
                const img = Skia.Image.MakeImageFromEncoded(data);
                setSkImage(img);
            }
        });
        return () => { isCancelled = true; };
    }, [photoUri]);

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

    const addNewText = () => {
        setOverlayText("");
        setEditingId(null);
        setTextbgColorcode("transparent");
        setIsEditingText(true);
    };


    const handleExport_offf = async () => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        try {
            /** 1️⃣ Capture canvas image */
            const snapshot = canvasRef.current.makeImageSnapshot();
            if (!snapshot) throw new Error('Snapshot failed');

            const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);

            /** 2️⃣ Save image to file (REQUIRED for multer) */
            const imagePath = `${RNFS.CachesDirectoryPath}/canvas_${Date.now()}.jpg`;
            await RNFS.writeFile(imagePath, base64, 'base64');

            /** 3️⃣ Download audio if not exists */
            const audioUrl = musiclist.file;
            const localAudio = `${RNFS.CachesDirectoryPath}/audio_temp.mp3`;

            const audioExists = await RNFS.exists(localAudio);
            if (!audioExists) {
                const download = await RNFS.downloadFile({
                    fromUrl: audioUrl,
                    toFile: localAudio,
                }).promise;

                if (download.statusCode !== 200) {
                    throw new Error('Audio download failed');
                }
            }

            /** 4️⃣ Build multipart form */
            const formData = new FormData();

            formData.append('audio', {
                uri: 'file://' + localAudio,
                type: 'audio/mpeg',
                name: 'audio.mp3',
            } as any);

            formData.append('image', {
                uri: 'file://' + imagePath,
                type: 'image/jpeg',
                name: 'image.jpg',
            } as any);

            formData.append('text', 'United Arab Emirates');

            /** 5️⃣ POST to backend (DO NOT set Content-Type) */
            const response = await fetch(
                base.BASE_URL + '/api/videoprocessing/image-audio-text-process',
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const result = await response.json();
            console.log('SERVER RESPONSE:', result);

            if (!response.ok) {
                throw new Error(result?.error || 'Server error');
            }
            // ✅ START POLLING
            checkStatus(result.jobId);
            // Alert.alert('Success', 'Video processing started successfully');

        } catch (err: any) {
            console.error('EXPORT ERROR:', err);
            Alert.alert('Error', err.message || 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
        let imagePath: string | null = null;
        let localAudio: string | null = null;

        /** 1️⃣ Capture canvas image (optional) */
        const snapshot = canvasRef.current.makeImageSnapshot();

        if (snapshot) {
            const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);
            imagePath = `${RNFS.CachesDirectoryPath}/canvas_${Date.now()}.jpg`;
            await RNFS.writeFile(imagePath, base64, 'base64');
        }

        /** 2️⃣ Download audio only if exists */
        if (musiclist?.file) {
            const audioUrl = musiclist.file;
            localAudio = `${RNFS.CachesDirectoryPath}/audio_temp.mp3`;

            const audioExists = await RNFS.exists(localAudio);
            if (!audioExists) {
                const download = await RNFS.downloadFile({
                    fromUrl: audioUrl,
                    toFile: localAudio,
                }).promise;

                if (download.statusCode !== 200) {
                    throw new Error('Audio download failed');
                }
            }
        }

        /** 3️⃣ Build multipart form */
        const formData = new FormData();

        if (localAudio) {
            formData.append('audio', {
                uri: 'file://' + localAudio,
                type: 'audio/mpeg',
                name: 'audio.mp3',
            } as any);
        }

        if (imagePath) {
            formData.append('image', {
                uri: 'file://' + imagePath,
                type: 'image/jpeg',
                name: 'image.jpg',
            } as any);
        }

        if (textValue) {
            formData.append('text', textValue);
        }

        /** 4️⃣ Send request */
        const response = await fetch(
            base.BASE_URL + '/api/videoprocessing/image-audio-text-process',
            {
                method: 'POST',
                body: formData,
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result?.message || 'Server error');
        }

        checkStatus(result.jobId);

    } catch (err: any) {
        console.error('EXPORT ERROR:', err);
        Alert.alert('Error', err.message || 'Export failed');
    } finally {
        setIsExporting(false);
    }
};


    const checkStatus = (jobId: string) => {
        console.log('⏳ Checking status for job:', jobId);

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(
                    base.BASE_URL + `/api/videoprocessing/job-status/${jobId}`
                );

                const data = await res.json();

                console.log('📡 Job status:', data);

                if (data.status === 'completed') {
                    clearInterval(intervalId);

                    //    Alert.alert('🎉 Video Ready');

                    // 🔥 This is your final video
                    //   setVideoUri(data.output);
                    console.log('...final video....', data.output)
                    await AsyncStorage.setItem("jobId", jobId);
                    await AsyncStorage.setItem("output", data.output);
                    setFinalModal(true);
                    // optional callback
                    //   onApply?.(data.output);
                }

                if (data.status === 'failed') {
                    clearInterval(intervalId);
                    Alert.alert('Error', 'Video processing failed');
                }

            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 5000); // every 5 seconds
    };




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

    // Inside ReelsImageProcessing component:

    const toggleFilters = () => {
        setShowFilterImage(!showFilterImage); // If true becomes false, if false becomes true
    };

    const toggleAudio = () => {
        setShowMusicModal(!showMusicModal);
    };


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

    if (!skImage) return <View style={styles.fullBlack}><ActivityIndicator size="large" color="white" /></View>;


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
    const handleTimerUpdate = (data: any) => {
        console.log("Start Time:", data.startTime);
        console.log("End Time:", data.endTime);
        console.log("Total Duration:", data.duration);
        // Save this to your state to use for video processing/trimming
        setSelectedTimeSlot(data);
    };

    const handleStopSound = () => {
        Alert.alert("sound stop")
        if (soundRef.current) {
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

    const handleShareSuccess = () => {
        setFinalModal(false); // ✅ close popup
        if (soundRef.current) {
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
        navigation.reset({
            index: 0,
            routes: [{ name: "HomeSocial" }],
        });
    };

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.container}>
                <Canvas ref={canvasRef} style={{ width, height }}>
                    <Image image={skImage} x={0} y={0} width={width} height={height} fit="cover">
                        <ColorMatrix matrix={selectedMatrix} />
                    </Image>
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
                <HeaderControls onBack={onBack} onExport={handleExport}
                    onAddText={addNewText} isExporting={isExporting}
                    playingId={playingId}
                    onStopSound={handleStopSound} // stop sound from Child
                    volumnSetting={() => {
                        setVolumenModal(true)
                        console.log('...modal Test...',)
                    }}
                />
                <View style={styles.toprighticon} pointerEvents="box-none">
                    <RightMenuIcon
                        onOpenFilters={() => {
                            setShowFilterImage(!showFilterImage);
                            setShowStickerPicker(false); // Close stickers if filters open
                        }}
                        onOpenStickers={() => {
                            handleOpenStickers()
                            setShowStickerPicker(!showStickerPicker);
                            setShowFilterImage(false); // Close filters if stickers open
                        }}
                        isFilterOpen={showFilterImage}
                        isStickersOpen={showStickerPicker} // Pass this to RightMenuIcon
                        onOpenAudio={() => setShowMusicModal(!showMusicModal)}
                        onOpenTimer={() => setTimesmodal(!timesmodal)}
                        onOpenText={addNewText}
                    />
                </View>

                {showFilterImage && (
                    <View style={styles.filterBar}>
                        <FilterImage skImage={skImage} filters={FILTERS} selectedMatrix={selectedMatrix} onSelect={setSelectedMatrix} />
                    </View>
                )}

                {showStickerPicker && (
                    <View style={styles.filterBar}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
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
                        )}
                    </View>
                )}
                <SokiaTextEditor
                    visible={isEditingText} initialText={overlayText} initialColor={currentTextColor} initialSize={currentFontSize} initialbgColor={textbgColorcode}
                    onSave={(text, color, size, fontName, alignment, bgcolor) => {
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

                {showMusicModal && <MusicModal visible={showMusicModal} onClose={() => setShowMusicModal(false)} takeMusictoparents={playMusicFromChild} />}
                {timesmodal && <TimerModal visible={timesmodal}
                    onClose={() => setTimesmodal(false)}
                    videoDuration={60}
                    takeTimerToParent={handleTimerUpdate}
                />}
                {
                    volumenModal && <VolumenControll visible={volumenModal}
                        onClose={() => setVolumenModal(false)}
                        videoDuration={60}
                        takeTimerToParent={handleTimerUpdate} />
                }
                {
                    finalModal ?
                        <FinalProcess visible={finalModal}
                            onClose={() => setFinalModal(false)}
                            onSuccess={handleShareSuccess} /> : null
                }
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    fullBlack: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    filterBar: { height: 100, bottom: 10, position: 'absolute', width: '100%' },
    toprighticon: { position: 'absolute', top: 60, bottom: 100, right: 3, justifyContent: 'center', zIndex: 999 },
    retakeBtn: { position: 'absolute', bottom: 10, alignSelf: 'center', padding: 10 },
    retakeText: { color: '#666', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
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
    }
});

export default ReelsImageProcessing;