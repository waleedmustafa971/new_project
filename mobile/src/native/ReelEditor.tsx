import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import { launchImageLibrary } from 'react-native-image-picker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;

export default function TestSokia() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [multiSliderValue, setMultiSliderValue] = useState([0, 10]);
  const [videoDuration, setVideoDuration] = useState(60);

  const pickVideo = async () => {
    const res = await launchImageLibrary({ mediaType: 'video' });
    if (res.assets && res.assets[0]?.uri) {
      setVideoUri(res.assets[0].uri);
      if (res.assets[0].duration) setVideoDuration(res.assets[0].duration);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔝 HEADER: Fixed Height */}
      <View style={styles.header}>
        <TouchableOpacity><Text style={styles.headerText}>Cancel</Text></TouchableOpacity>
        <Text style={styles.titleText}>Video Editor</Text>
        <TouchableOpacity><Text style={[styles.headerText, styles.doneText]}>Done</Text></TouchableOpacity>
      </View>

      {/* 🎥 VIDEO PREVIEW: Adaptive height based on screen size */}
      <View style={styles.mainContent}>
        <TouchableOpacity 
          style={[styles.videoWrapper, isTablet && styles.videoWrapperTablet]} 
          onPress={pickVideo}
          activeOpacity={0.9}
        >
          {videoUri ? (
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode="contain"
              repeat
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Tap to select video</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ⏱ BOTTOM PANEL: Holds Timeline & Actions */}
      <View style={styles.bottomPanel}>
        <View style={styles.timelineContainer}>
          <View style={styles.timeLabelRow}>
            <Text style={styles.timeText}>Start: {multiSliderValue[0].toFixed(1)}s</Text>
            <Text style={styles.timeText}>End: {multiSliderValue[1].toFixed(1)}s</Text>
          </View>

          <MultiSlider
            values={[multiSliderValue[0], multiSliderValue[1]]}
            sliderLength={isTablet ? width * 0.7 : width - 60}
            onValuesChange={setMultiSliderValue}
            min={0}
            max={videoDuration}
            step={0.1}
            allowOverlap={false}
            selectedStyle={{ backgroundColor: '#FFD700' }}
            unselectedStyle={{ backgroundColor: '#333' }}
            trackStyle={{ height: 6 }}
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

function ActionBtn({ label, icon }: { label: string; icon: string }) {
  return (
    <TouchableOpacity style={styles.actionBtn}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  headerText: { color: '#ccc', fontSize: 16 },
  doneText: { color: '#FFD700', fontWeight: 'bold' },
  titleText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  videoWrapper: {
    width: width * 0.85,
    height: '100%',
    maxHeight: height * 0.5,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  videoWrapperTablet: {
    width: width * 0.6,
    maxHeight: height * 0.6,
  },
  video: { width: '100%', height: '100%' },
  
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', fontSize: 16 },

  bottomPanel: {
    backgroundColor: '#0A0A0A',
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  timelineContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  timeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 60,
    marginBottom: 10,
  },
  timeText: { color: '#888', fontSize: 12, fontVariant: ['tabular-nums'] },
  
  marker: {
    backgroundColor: '#FFD700',
    height: 20,
    width: 20,
    borderRadius: 10,
    elevation: 3,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  actionBtn: {
    alignItems: 'center',
    minWidth: 70,
  },
  actionIcon: { fontSize: 20, marginBottom: 5 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '500' },
});