import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
};

const SLIDER_WIDTH = 260;
const THUMB_SIZE = 22;

const CustomDistanceSlider: React.FC<Props> = ({
  value,
  min = 1,
  max = 10,
  onChange,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(0);

  // Sync slider when value changes externally
  useEffect(() => {
    const x = ((value - min) / (max - min)) * SLIDER_WIDTH;
    offsetX.current = x;

    Animated.timing(translateX, {
      toValue: x,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [value, min, max]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderMove: (_, gesture) => {
        let x = Math.min(
          SLIDER_WIDTH,
          Math.max(0, offsetX.current + gesture.dx)
        );

        translateX.setValue(x);

        const newValue =
          Math.round((x / SLIDER_WIDTH) * (max - min)) + min;

        onChange(newValue);
      },

      onPanResponderRelease: (_, gesture) => {
        offsetX.current = Math.min(
          SLIDER_WIDTH,
          Math.max(0, offsetX.current + gesture.dx)
        );
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.track} />

      <Animated.View
        style={[styles.fill, { width: translateX }]}
      />

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
};

export default CustomDistanceSlider;
const styles = StyleSheet.create({
  container: {
    width: SLIDER_WIDTH,
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  fill: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#007AFF',
    top: 9,
  },
});
