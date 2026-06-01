import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Image, Dimensions, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');
const VIDEO_WIDTH = (width / 2) - 16;

const RenderVideoItem = ({ item }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(Date.now());

  return (
    <View style={styles.container}>
      {/* Video or Preview */}
      <View style={styles.videoContainer}>
        {isPlaying ? (
         
           <Video
                  source={{ uri: item.url }}
                  style={styles.video}
                  muted={true}
                  resizeMode="cover"
                  repeat={false}
                  paused={false}
                  ignoreSilentSwitch="ignore" // iOS fix
                  controls={false}
                  playInBackground={false}
                  playWhenInactive={false}
                />
        ) : (
          <View style={styles.preview}>
            <Text style={styles.previewText}>Video Preview</Text>
          </View>
        )}

        {/* Play Icon Overlay */}
        {!isPlaying && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setIsPlaying(true)}
            activeOpacity={0.8}
          >
            <Icon name="play-circle" size={50} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stop Button */}
      {isPlaying && (
        <TouchableOpacity
          onPress={() => {
            setIsPlaying(false);
            setKey(Date.now()); // Reset video
          }}
          style={styles.stopButton}
        >
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default RenderVideoItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: 300,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  preview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: 'white',
    fontSize: 16,
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  stopButton: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
