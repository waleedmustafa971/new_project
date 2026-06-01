import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform, BackHandler } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Canvas, Fill, ColorMatrix, useVideo, ImageShader, RoundedRect,
  SkImage, Text as SkiaText, Image, useFont } from "@shopify/react-native-skia";
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import { VIDEO_FILTERS } from '../../../../../constants/videoFilters';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';

import FilterImage from './FilterImage';
import SokiaTextEditor from './SokiaTextEditor';
const { width, height } = Dimensions.get('window');
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

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

const customFontFile = require('../../../../../assets/font/Classica-Bold.ttf'); //../../../../assets/font/Classica-Bold.ttf

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


export default function VideoEditorCanva({ videoUri, onBack, 
  showFilterImage, selectedFilter, showText,
initialText,initialColor, initialSize, initialbgColor, textdata,
editExistingText  }: any) {
  console.log('selectedFilter...video editor... ', JSON.stringify(selectedFilter))
  console.log("Text data......", JSON.stringify(textdata));
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [paused, setPaused] = useState(false); // autoplay
  //  const [selectedFilter] = useState(VIDEO_FILTERS[0]);
  const soundRef = useRef<Sound | null>(null);
  // const [showFilterImage, setShowFilterImage] = useState(false);
  const [selectedMatrix, setSelectedMatrix] = useState(FILTERS[0].matrix);
  const [skImage, setSkImage] = useState<SkImage | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]); //textdata
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentTextColor, setCurrentTextColor] = useState("#ffffff");
  const [overlayText, setOverlayText] = useState("");
  const [currentFontSize, setCurrentFontSize] = useState(40);
  const [textbgColorcode, setTextbgColorcode] = useState("transparent");
  const [placedStickers, setPlacedStickers] = useState<StickerLayer[]>([]); // For the Canvas
  const font = useFont(customFontFile, currentFontSize);

  // -------------------------------------------------------
  // 1️⃣ Prepare video (download if remote)
  // -------------------------------------------------------
  useEffect(() => {
    const prepareVideo = async () => {
      if (!videoUri) return;

      let localPath = videoUri;

      // If remote video, download to cache
      if (videoUri.startsWith('http')) {
        localPath = `${RNFS.CachesDirectoryPath}/cached_video.mp4`;

        const exists = await RNFS.exists(localPath);
        if (!exists) {
          await RNFS.downloadFile({
            fromUrl: videoUri,
            toFile: localPath,
          }).promise;
        }
      }

      const finalPath =
        Platform.OS === 'android'
          ? localPath
          : localPath.startsWith('file://')
            ? localPath
            : `file://${localPath}`;

      setCurrentUri(finalPath);

      // Load Sound
      const sound = new Sound(localPath, '', (error) => {
        if (error) {
          console.log('Sound load error:', error);
          return;
        }

        if (!paused) {
          sound.play();
        }
      });

      soundRef.current = sound;
    };

    prepareVideo();

    return () => {
      soundRef.current?.stop();
      soundRef.current?.release();
    };
  }, [videoUri]);

  // -------------------------------------------------------
  // 2️⃣ Proper memoized video options
  // -------------------------------------------------------
  const videoOptions = useMemo(() => ({ paused }), [paused]);

  const { currentFrame } = useVideo(currentUri || '', videoOptions);

  // -------------------------------------------------------
  // 3️⃣ Sync sound with paused state (single source of truth)
  // -------------------------------------------------------
  useEffect(() => {
    if (!soundRef.current) return;

    if (paused) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  }, [paused]);

  // -------------------------------------------------------
  // 4️⃣ Play / Pause toggle
  // -------------------------------------------------------
  const togglePlay = () => {
    setPaused(prev => !prev);
  };

  // -------------------------------------------------------
  // 5️⃣ Android back handler
  // -------------------------------------------------------
  useEffect(() => {
    const backAction = () => {
      onBack?.();
      return true;
    };

    const handler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => handler.remove();
  }, []);

    const handleLayerUpdate = useCallback((id: string, x: number, y: number) => {
     //   setTextLayers(prev => prev.map(l => l.id === id ? { ...l, x, y } : l));
    }, []);

    //handleStackerLayerUpdate
    const handleStackerLayerUpdate = useCallback((id: string, x: number, y: number) => {
        setPlacedStickers(prev => prev.map(s =>
            s.id === id ? { ...s, x: x, y: y } : s
        ));
    }, []);
  

  // -------------------------------------------------------
  // 6️⃣ UI
  // -------------------------------------------------------
  return (
    <>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>

        <Canvas style={StyleSheet.absoluteFill}>
          {currentFrame && (
            <Fill>
              <ImageShader
                image={currentFrame}
                fit="cover"
                width={width}
                height={height}
              />
              <ColorMatrix matrix={selectedFilter?.matrix} />
            </Fill>
          )}
          {textdata?.map((layer : any) => {
            const tWidth = font ? font.getTextWidth(layer.text) : 100;
            console.log('....layer.....', layer.text)
            return (
              <React.Fragment key={`draw-${layer.id}`}>
                {layer.bgcolor !== 'transparent' && (
                  <RoundedRect x={layer.x - 12} y={layer.y - (layer.fontSize * 0.85)} 
                  width={tWidth + 24} height={layer.fontSize * 1.2} r={10} 
                  color={layer.bgcolor} />
                )}
                <SkiaText x={layer.x} y={layer.y} text={layer.text} 
                font={font} color={layer.color} />
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
          {textdata?.map((layer : any) => (
            <DraggableLayer key={`hit-${layer.id}`} 
            layer={layer} font={font} onUpdate={handleLayerUpdate} 
            onEdit={editExistingText} />
          ))}
        </View>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {placedStickers?.map((sticker) => (
            <DraggableSticker
              key={`hit-${sticker.id}`}
              sticker={sticker}
              onUpdate={handleStackerLayerUpdate}
            />
          ))}
        </View>

        {/* Play / Pause Button */}
        <View style={styles.overlay}>
          <Pressable onPress={togglePlay}>
            <MaterialIcons
              name={paused ? 'play-arrow' : 'pause'}
              size={70}
              color="#fff"
            />
          </Pressable>
        </View>
      </GestureHandlerRootView>
      {showFilterImage && (
        <View style={styles.filterBar}>
          <FilterImage skImage={skImage} filters={FILTERS} selectedMatrix={selectedMatrix} onSelect={setSelectedMatrix} />
        </View>
      )}
      {/* SokiaTextEditor */}


            {
              showText ?
                <>
                  <SokiaTextEditor
                    visible={isEditingText} initialText={overlayText} initialColor={currentTextColor}
                    initialSize={currentFontSize} initialbgColor={textbgColorcode}
                    onSave={(text: string, color: string, size: string, fontName: string, alignment: string, bgcolor: string) => {
                      if (text.trim() === "") {
                        if (editingId) 
                          setTextLayers(prev => prev.filter(l => l.id !== editingId));
                      } else if (editingId) {
                        setTextLayers(prev => prev.map(l => l.id === editingId ? { ...l, text, color, fontSize: size, bgcolor, fontName, alignment } : l));
                      } else {
                        console.log("....first.....", JSON.stringify(textLayers))
                        setTextLayers([...textLayers, {
                          id: Date.now().toString(),
                          text, color, fontSize: size,
                          bgcolor, fontName,
                          alignment,  
                          x: width / 4, y: height / 2, lastX: width / 4, lastY: height / 2
                        }]);
                      }
                      setIsEditingText(false);
                    }}
                    onClose={() => setIsEditingText(false)}
                    onDelete={() => { setTextLayers(prev => prev.filter(l => l.id !== editingId)); setIsEditingText(false); }}
                  />
                </>
                : null
            }
      
      
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: { height: 100, bottom: 10, position: 'absolute', width: '100%' },

});
