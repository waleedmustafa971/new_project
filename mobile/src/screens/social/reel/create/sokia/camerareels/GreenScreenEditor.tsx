import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, 
  Image, ScrollView, ActivityIndicator } from 'react-native';
import RNFS from 'react-native-fs';
import NativeSampleModule from '../../../../../../../specs/NativeSampleModule';
//0x00FF00 pure green
import api from '../../../../../../component/api';
//import * as base from '../../../../../../component/api';
import * as base from "../../../../../../component/global";

import axios from 'axios';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';


const BACKGROUNDS = [
  { id: '1', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300' },
  { id: '2', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=300' },
  { id: '3', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=300' },
  { id: '4', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=300' },
  { id: '5', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300' },
  { id: '6', color: '0x00FF00', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=300' },
];
interface GreenScreenEditorProps {
  videoUri: string;
  onFinish: () => void;
  onApply: (outputUri: string) => void; // new callback
}

export default function GreenScreenEditor({
  videoUri,
  onFinish,
  onApply,
}: {
  videoUri: string;
  onFinish?: () => void;
  onApply: (outputUri: string) => void;
}) {

  const [selectedColor, setSelectedColor] = useState('0x00FF00');
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0].url); // Added missing state
  const [processing, setProcessing] = useState(false);
  const [isImage, setIsImage] = useState(true); // true if background is an image


  const handleApply = async () => {
    setProcessing(true)
    const localBgPath = `${RNFS.CachesDirectoryPath}/bg_${Date.now()}.jpg`;

    await RNFS.downloadFile({
      fromUrl: selectedBg,
      toFile: localBgPath,
    }).promise;
    console.log('...downloaded iamge....', localBgPath)
    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      type: 'video/mp4',
      name: 'video.mp4',
    } as any);

    formData.append('background', {
      uri: 'file://' + localBgPath,
      type: 'image/jpeg',
      name: 'bg.jpg',
    } as any);
    formData.append('country', "United Arab Emirates");
    try {
      const response = await fetch(`${base.BASE_URL}/api/videoprocessing/applygreenscreen`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
     /*  const result = await response.json();
      console.log('..response...' + result)
       console.log('result...... ..... ', result)
      // ✅ Send result back to parent
      onApply('file://' + result.videoUrl); */
      const result = await response.json();
      console.log('result:', result);
      if (result.success) {
            onApply(base.BASE_URL + '/' + result.videoUrl); // ✅ HTTP URL. base.BASE_URL
            setProcessing(false)
      }
    } catch (error) {
      console.error(error);
       setProcessing(false)
    }

  };


  const handleApply_off = async () => {
    if (!videoUri || !selectedBg) {
      console.error("Missing video or background selection");
      return;
    }

    setProcessing(true);

    try {
      // 1. Download background image (if image)
      const localBgPath = `${RNFS.CachesDirectoryPath}/temp_bg.jpg`;

      if (isImage) {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: selectedBg, // remote image URL
          toFile: localBgPath,
        }).promise;

        if (downloadResult.statusCode !== 200) {
          throw new Error("Failed to download background image");
        }
      }

      // 2. Prepare paths for native module
      const cleanVideoUri = videoUri.replace('file://', '');
      const cleanBgUri = isImage
        ? localBgPath
        : selectedBg.replace('file://', '');

      const outputPath = `${RNFS.CachesDirectoryPath}/chroma_result.mp4`;
      console.log({
        cleanVideoUri: cleanVideoUri,
        cleanBgUri: cleanBgUri,
        outputPath: outputPath,
        selectedColor: selectedColor,
        isImage: isImage
      });

      if (!(await RNFS.exists(cleanVideoUri))) {
        console.error("Video file not found:", cleanVideoUri);
        return;
      }

      if (!(await RNFS.exists(cleanBgUri))) {
        console.error("Background file not found:", cleanBgUri);
        return;
      }

      // 3. Call native FFmpeg chroma key
      const result = await NativeSampleModule.applyGreenScreen(
        cleanVideoUri,
        cleanBgUri,
        outputPath,
        selectedColor, // e.g. "0x00FF00"
        isImage
      );
      console.log('result...... ..... ', result)
      // ✅ Send result back to parent
      onApply('file://' + result);

    } catch (err) {
      console.error("Bridge Error:", err);
    } finally {
      setProcessing(false);
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Background</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
      >
        {BACKGROUNDS.map((bg) => (
          <TouchableOpacity
            key={bg.id}
            onPress={() => {
              setSelectedColor(bg.color);
              setSelectedBg(bg.url);
              console.log('Green BG .... color... ', bg.color, bg.url)
            }}
            style={[
              styles.colorCircle,
              {
                borderWidth: selectedBg === bg.url ? 3 : 0,
                borderColor: '#00FF00',
              }
            ]}
          >
            <Image
              source={{ uri: bg.url }}
              style={styles.fullImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.applyButton, processing && { backgroundColor: '#444' }]}
        onPress={handleApply}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>APPLY GREEN SCREEN</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 5, borderRadius: 15 },
  title: { color: 'white', marginBottom: 15, fontSize: 12, fontWeight: '600' },
  colorRow: { paddingVertical: 10, gap: 15 },
  colorCircle: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden'
  },
  fullImage: { width: '100%', height: '100%' },
  applyButton: {
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});