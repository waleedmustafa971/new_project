import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Dimensions, SafeAreaView, Platform, FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Canvas, Fill, ImageShader, ColorMatrix, Group, Skia } from "@shopify/react-native-skia";
import { useSharedValue } from 'react-native-reanimated';
import AntIcon from 'react-native-vector-icons/AntDesign';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
// Note: Ensure your useVideo hook is correctly imported from your bridge
// import { useVideo } from "your-skia-video-package";
import { useVideo } from "@shopify/react-native-skia";
import { BackHandler } from 'react-native';
import Video from 'react-native-video';
//import { createVideoExport } from "@azzapp/react-native-skia-video"; // Verify exact export name in your version
import { exportVideoComposition } from "@azzapp/react-native-skia-video";
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;

const FILTERS = [
    { id: '1', name: 'Normal', matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
    { id: '2', name: 'Warm', matrix: [1, 0, 0, 0, 0.1, 0, 1, 0, 0, 0.05, 0, 0, 0.8, 0, 0, 0, 0, 0, 1, 0] },
    { id: '3', name: 'Cool', matrix: [0.8, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 1.2, 0, 0.1, 0, 0, 0, 1, 0] },
    { id: '4', name: 'B&W', matrix: [0.21, 0.72, 0.07, 0, 0, 0.21, 0.72, 0.07, 0, 0, 0.21, 0.72, 0.07, 0, 0, 0, 0, 0, 1, 0] }
];

// 1. Define this OUTSIDE the component


export default function VideoView({ videoUri, onBack }: any) {
    console.log('....load video.... ', videoUri)
    const [isExporting, setIsExporting] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [activeMatrix, setActiveMatrix] = useState(FILTERS[0].matrix);
    const [selectedFilterId, setSelectedFilterId] = useState('1');
    const [multiSliderValue, setMultiSliderValue] = useState([0, 10]);
    const [videoDuration, setVideoDuration] = useState(10);

    // Shared values for Skia Video
    const paused = useSharedValue(true);
    const seek = useSharedValue<null | number>(null);
    const [isPausedState, setIsPausedState] = useState(true);

    // 1. Properly format URI for Android/iOS
    const formattedUri = useMemo(() => {
        if (!videoUri) return null;
        return videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;
    }, [videoUri]);

    // 2. Skia Video Hook
    const { currentFrame } = useVideo(formattedUri, {
        paused,
        seek,
        looping: true,
        volume: 1.0, // 🔥 Explicitly set volume to 100%
    });

    // 3. Toggle Play/Pause
    const togglePlayPause = () => {
        const nextState = !isPausedState;
        paused.value = nextState;
        setIsPausedState(nextState);
    };

    const onLayout = (event: any) => {
        const { width: lWidth, height: lHeight } = event.nativeEvent.layout;
        setCanvasSize({ width: lWidth, height: lHeight });
    };


    // EFFECT: Log to confirm the frame decoder is alive
    useEffect(() => {
        if (currentFrame) {
            console.log("✅ Skia Decoder Active: Frame received");
        }
    }, [currentFrame]);

    // ... inside VideoView ...
    useEffect(() => {
        const backAction = () => {
            // 1. Stop the audio/video immediately
            paused.value = true;

            // 2. Call your back logic (which should set currentMode to 'CAMERA')
            onBack();

            // 3. Return true to stop the app from exiting
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        // CLEANUP: Important to remove listener when leaving the editor
        return () => backHandler.remove();
    }, []);

const handleExport = async () => {
    try {
        // 1. STOP everything
        paused.value = true;
        setIsExporting(true);

        // 2. WAIT for the native player to release the file handle
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log("🚀 Starting Isolated Export...");

        // 3. Run Export with lower resolution to prevent OOM
    /*     await runVideoExport(
            formattedUri!,
            [...activeMatrix],
            multiSliderValue[0],
            multiSliderValue[1],
            720,  // 720p is safer for Android memory
            1280
        ); */

        Alert.alert("Success", "Video exported!");
    } catch (error) {
        Alert.alert("Export Error", String(error));
    } finally {
        setIsExporting(false);
    }
};

    return (
        <SafeAreaView style={styles.container}>
            {/* 🔝 HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    paused.value = true; // Stop the clock
                    onBack();           // Trigger parent to unmount this view
                }}>
                    <Text style={styles.headerText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.titleText}>Edit Video</Text>
                <TouchableOpacity onPress={() => 
{
console.log("Exporting...");
handleExport()
}

                }>
                    <Text style={[styles.headerText, styles.doneText]}>Done</Text>
                </TouchableOpacity>
            </View>

            {/* 🎥 VIDEO PREVIEW */}
            <View style={styles.middle}>


                <TouchableOpacity
                    key={formattedUri}
                    style={[styles.videoWrapper, isTablet && styles.videoWrapperTablet]}
                    onPress={togglePlayPause}
                    activeOpacity={1}
                    onLayout={onLayout}
                >
                    {currentFrame && !isExporting ? (

                        <>
                        <Canvas style={{ flex: 1 }}>
                            <Fill>
                                <ImageShader
                                    image={currentFrame}
                                    x={0} y={0}
                                    width={canvasSize.width}
                                    height={canvasSize.height}
                                    fit="contain"
                                />
                                <ColorMatrix matrix={activeMatrix} />
                            </Fill>
                        </Canvas> 
                        </>
                    ) : (
                        <View style={styles.center}>
                            <ActivityIndicator color="#FFD700" size="large" />
                            <Text style={styles.loadingText}>Loading Video Engine...</Text>
                        </View>
                    )}

                    {/* ⏸ PLAY ICON OVERLAY */}
                    {isPausedState && currentFrame && (
                        <View style={styles.overlayContainer}>
                            <View style={styles.playIconCircle}>
                                <AntIcon name="play" size={40} color="white" style={{ marginLeft: 5 }} />
                            </View>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* 🎞️ FILTERS */}
            <View style={styles.filterSection}>
                <FlatList
                    data={FILTERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => {
                                setActiveMatrix(item.matrix);
                                setSelectedFilterId(item.id);
                            }}
                            style={[styles.filterBtn, selectedFilterId === item.id && styles.activeFilterBtn]}
                        >
                            <Text style={[styles.filterText, selectedFilterId === item.id && styles.activeFilterText]}>
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* ⏱ TIMELINE PANEL */}
            <View style={styles.bottomPanel}>
                <View style={styles.timelineContainer}>
                    <View style={styles.timeLabelRow}>
                        <Text style={styles.timeText}>{multiSliderValue[0].toFixed(1)}s</Text>
                        <Text style={styles.timeText}>{multiSliderValue[1].toFixed(1)}s</Text>
                    </View>
                    <MultiSlider
                        values={[multiSliderValue[0], multiSliderValue[1]]}
                        sliderLength={width - 60}
                        onValuesChange={setMultiSliderValue}
                        min={0}
                        max={videoDuration}
                        step={0.1}
                        selectedStyle={{ backgroundColor: '#FFD700' }}
                        trackStyle={{ height: 4 }}
                        markerStyle={styles.marker}
                    />
                </View>

                <View style={styles.actions}>
                    <ActionBtn icon="🎵" label="Audio" />
                    <ActionBtn icon="T" label="Text" />
                    <ActionBtn icon="✂️" label="Split" />
                    <ActionBtn icon="🔄" label="Replace" />
                </View>
            </View>
        </SafeAreaView>
    );
}

function ActionBtn({ label, icon }: any) {
    return (
        <TouchableOpacity style={styles.actionBtn}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
            <Text style={styles.actionText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { 
         flex: 1,           // 🔥 takes full screen
         backgroundColor: '#000'
    },
    header: { height: 60, flexDirection: 'row', 
        justifyContent: 'space-between', alignItems: 'center', 
        paddingHorizontal: 20, backgroundColor: '#000'
     },
    middle: { 
        flex: 1,           // 🔥 takes ALL remaining space
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
     },
    footer: { 
          height: 100,       // fixed height
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
     },
    headerText: { color: '#ccc', fontSize: 16 },
    doneText: { color: '#FFD700', fontWeight: 'bold' },
    titleText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   // videoWrapper: { width: width * 0.9, height: '100%', maxHeight: height * 0.45, backgroundColor: '#050505', borderRadius: 12, overflow: 'hidden' },
    videoWrapperTablet: { width: width * 0.6 },
    videoWrapper: {
  width: width * 0.6,
  height: width * 1.1, // 👈 MUST exist
  alignSelf: 'center',
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#111',
},
   video: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#555', marginTop: 10, fontSize: 12 },
    overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    playIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    filterSection: { height: 70, marginVertical: 10 },
    filterBtn: { paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
    activeFilterBtn: { borderColor: '#FFD700', backgroundColor: '#222' },
    filterText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
    activeFilterText: { color: '#FFD700' },
    bottomPanel: { backgroundColor: '#080808', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
    timelineContainer: { alignItems: 'center', paddingTop: 15 },
    timeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', width: width - 60 },
    timeText: { color: '#666', fontSize: 11 },
    marker: { height: 20, width: 20, borderRadius: 10, backgroundColor: '#FFD700' },
    actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
    actionBtn: { alignItems: 'center' },
    actionText: { color: '#fff', fontSize: 11 }
});