import React, { useState, useRef, useEffect } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Platform,
    ActivityIndicator, Text, FlatList, PermissionsAndroid, Dimensions
} from 'react-native';
import {
    Camera, useCameraDevice, PhotoFile,
    useSkiaFrameProcessor
} from 'react-native-vision-camera';
import { Skia } from "@shopify/react-native-skia";
import AntIcon from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import ReelsImageProcessing from '../ReelsImageProcessing';

// --- TABLET OPTIMIZED SHADERS ---
const SEPIA_EFFECT = Skia.RuntimeEffect.Make(`
  uniform shader image;
  half4 main(vec2 pos) {
    vec4 c = image.eval(pos);
    return vec4(
      clamp(c.r * 0.393 + c.g * 0.769 + c.b * 0.189, 0.0, 1.0),
      clamp(c.r * 0.349 + c.g * 0.686 + c.b * 0.168, 0.0, 1.0),
      clamp(c.r * 0.272 + c.g * 0.534 + c.b * 0.131, 0.0, 1.0),
      1.0
    );
  }
`)!;

const GRAYSCALE_EFFECT = Skia.RuntimeEffect.Make(`
  uniform shader image;
  half4 main(vec2 pos) {
    vec4 color = image.eval(pos);
    float avg = (color.r + color.g + color.b) / 3.0;
    return vec4(vec3(avg), 1.0);
  }
`)!;

const LIVE_FILTERS = [
    { id: '1', name: 'Original', type: 'None' },
    { id: '2', name: 'B&W', type: 'Grayscale' },
    { id: '3', name: 'Sepia', type: 'Sepia' },
];

const TestSokia = () => {
    const navigation = useNavigation();
    const [camerapotion, setCamerapotion] = useState<"front" | "back">("front");
    const device = useCameraDevice(camerapotion);
    const cameraRef = useRef<Camera>(null);

    const [currentFilter, setCurrentFilter] = useState('None');
    const [showLiveEffects, setShowLiveEffects] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [currentMode, setCurrentMode] = useState<'CAMERA' | 'LOADING' | 'EDITOR'>('CAMERA');
    const [photoPath, setPhotoPath] = useState<string | null>(null);

/* const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet';
    
    // If currentFilter is "None", this MUST run
    if (currentFilter === 'None') {
        frame.render(); 
        return;
    }

    try {
        const inputImage = frame.shaderBuilder.makeShader();
        const effect = currentFilter === 'Sepia' ? SEPIA_EFFECT : GRAYSCALE_EFFECT;
        const shader = effect.makeShader([], [inputImage]);
        
        const paint = Skia.Paint();
        paint.setShader(shader);
        frame.render(paint);
    } catch (e) {
        // If the shader fails, just show the normal camera
        frame.render();
    }
}, [currentFilter]); */

    const takePhotobtn = async () => {
        if (!cameraRef.current || !isCameraReady) return;
        try {
            const photo = await cameraRef.current.takePhoto();
            const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
            setCurrentMode('LOADING');
            setTimeout(() => {
                setPhotoPath(uri);
                setCurrentMode('EDITOR');
            }, 600);
        } catch (e) { console.error(e); }
    };

    if (!device) return <View style={styles.center}><ActivityIndicator color="white" /></View>;

    return (
        <View style={styles.container}>
            {currentMode === 'EDITOR' && photoPath ? (
                <ReelsImageProcessing photoUri={photoPath} onBack={() => { setPhotoPath(null); setCurrentMode('CAMERA'); }} />
            ) : (
                <View style={StyleSheet.absoluteFill}>
                    <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        photo={true}
                        isActive={true}
                        /* 🔥 On API 30, 'yuv' is often the only format that bridges 
                           the camera and Skia without a black screen */
                        //pixelFormat="yuv"

                        /* This ensures the Skia surface is created correctly on API 30 */
                        //enableBufferCompression={false}

                        onInitialized={() => setIsCameraReady(true)}
                      //  frameProcessor={frameProcessor}
                    />
                    {/* UI - Sidebar (Adjusted for Tablet reachability) */}
                    <View style={styles.rightSidebar}>
                        <SidebarItem icon="music" label="Audio" />
                        <SidebarItem icon="play-circle" label="Speed" />
                        <TouchableOpacity onPress={() => setShowLiveEffects(!showLiveEffects)}>
                            <SidebarItem icon="aperture" label="Effects" active={showLiveEffects} />
                        </TouchableOpacity>
                        <SidebarItem icon="clock" label="Timer" />
                    </View>

                    {/* Filters Bar */}
                    {showLiveEffects && (
                        <View style={styles.effectBar}>
                            <FlatList
                                horizontal
                                data={LIVE_FILTERS}
                                contentContainerStyle={{ paddingHorizontal: 20 }}
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.filterThumb, currentFilter === item.type && styles.activeFilter]}
                                        onPress={() => setCurrentFilter(item.type)}
                                    >
                                        <Text style={styles.filterText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}

                    {/* Bottom Controls */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.galleryBtn}>
                            <AntIcon name="picture" size={25} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={takePhotobtn} style={styles.captureOuter}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setCamerapotion(c => c === 'front' ? 'back' : 'front')} style={styles.flipBtn}>
                            <AntIcon name="sync" size={25} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

// ... SidebarItem and Styles stay the same (ensure galleryBtn is visible on large screen)
const SidebarItem = ({ icon, label, active }: any) => (
    <View style={styles.sidebarBtn}>
        <Text style={styles.sidebarLabel}>{label}</Text>
        <View style={[styles.iconCircle, active && { backgroundColor: '#FF0050' }]}>
            <Feather name={icon} size={17} color="white" />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    rightSidebar: { position: 'absolute', right: 5, top: '10%', alignItems: 'flex-end' },
    sidebarBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    sidebarLabel: { color: 'white', marginRight: 15, fontSize: 14, fontWeight: '600', textShadowColor: 'black', textShadowRadius: 2 },
    iconCircle: { width: 30, height: 30, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    effectBar: { position: 'absolute', bottom: 180, left: 0, right: 0 },
    filterThumb: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 25, height: 50, marginHorizontal: 10, borderRadius: 25, justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' },
    activeFilter: { backgroundColor: '#FF0050', borderColor: '#FF0050' },
    filterText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    footer: { position: 'absolute', bottom: 60, width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
captureOuter: {
  width: 40,           // smaller width
  height: 40,          // smaller height
  borderRadius: 20,    // half of width/height → makes it perfectly round
  borderWidth: 3,      // optional: smaller border
  borderColor: 'white',
  justifyContent: 'center',
  alignItems: 'center',
},

captureInner: {
  width: 30,           // slightly smaller inner circle
  height: 30,
  borderRadius: 15,    // half of inner width/height
  backgroundColor: 'white',
},   
    galleryBtn: { width: 35, height: 35, borderRadius: 12, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
    flipBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }
});

export default TestSokia;