import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
} from 'react-native';

const SLIDER_WIDTH = 200; // Adjusted for your sidebar layout
const THUMB_SIZE = 24;
const MIN_FONT = 11;
const MAX_FONT = 30;

const VolumeBar = ({ onChange }) => {
  // We use a normalized value (0 to 100) internally for smoother sliding
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(0);
  
  // Track current font size for the label display
  const [displaySize, setDisplaySize] = React.useState(MIN_FONT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Calculate new X position within bounds
        let x = Math.min(SLIDER_WIDTH, Math.max(0, offsetX.current + gesture.dx));
        translateX.setValue(x);

        // Map X position to Font Size Range
        const percentage = x / SLIDER_WIDTH;
        const newSize = Math.round(MIN_FONT + percentage * (MAX_FONT - MIN_FONT));
        
        setDisplaySize(newSize);
        onChange(newSize);
      },
      onPanResponderRelease: (_, gesture) => {
        // Save the last position
        offsetX.current = Math.min(SLIDER_WIDTH, Math.max(0, offsetX.current + gesture.dx));
      },
    })
  ).current;

  return (
    <View style={styles.outerContainer}>

      <View style={styles.container}>
        {/* Gray Track */}
        <View style={styles.track} />

        {/* Blue Progress Fill */}
        <Animated.View style={[styles.fill, { width: translateX }]} />

        {/* Draggable Thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            { transform: [{ translateX: Animated.subtract(translateX, THUMB_SIZE / 2) }] },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    // This counters the -90deg rotation of the parent in TextEditor
    transform: [{ rotate: '90deg' }], 
    marginBottom: 20,
  },
  labelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  container: {
    width: SLIDER_WIDTH,
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  fill: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#1EB1FC',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#1EB1FC',
    // Center thumb vertically on the track
    top: 0, 
    left: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default VolumeBar;