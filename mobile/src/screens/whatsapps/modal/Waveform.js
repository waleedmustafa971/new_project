import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Pressable } from 'react-native';

const Waveform = ({
  isPlaying,
  color = '#007AFF',
  barCount = 50,
  currentPosition = 0,
  duration = 1,
  onSeek = () => {},
}) => {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(10))
  ).current;

  const loopRef = useRef(null);

  const animateGroup = () => {
    const height = Math.floor(Math.random() * 30) + 10;
    const animationsList = animations.map(bar =>
      Animated.timing(bar, {
        toValue: height,
        duration: 300,
        useNativeDriver: false,
      })
    );
    return Animated.parallel(animationsList);
  };

  useEffect(() => {
    if (isPlaying) {
      const loop = () => {
        animateGroup().start(() => {
          loopRef.current = setTimeout(loop, 300);
        });
      };
      loop();
    } else {
      if (loopRef.current) {
        clearTimeout(loopRef.current);
      }

      Animated.parallel(
        animations.map(bar =>
          Animated.timing(bar, {
            toValue: 20,
            duration: 200,
            useNativeDriver: false,
          })
        )
      ).start();
    }

    return () => {
      if (loopRef.current) {
        clearTimeout(loopRef.current);
      }
    };
  }, [isPlaying]);

  const handleSeek = (e) => {
    const { locationX, width } = e.nativeEvent;
    const newPosition = (locationX / width) * duration;
    onSeek(newPosition);
  };

  const progress = duration > 0 ? currentPosition / duration : 0;

  return (
    <View>
      {/* Animated Bars */}
      <View style={styles.waveContainer}>
        {animations.map((barHeight, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: color,
              },
            ]}
          />
        ))}
      </View>

      {/* Progress Slider */}
      <Pressable onPress={handleSeek} style={styles.sliderContainer}>
        <View style={styles.track} />
        <Animated.View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  waveContainer: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0, borderColor: 'red',
    marginTop: 5
  },
  bar: {
    width: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  sliderContainer: {
    height: 50,
    justifyContent: 'center',
    width: '100%',
    marginTop: 6,
  },
  track: {
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  progress: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    left: 0,
    top: 0,
  },
});

export default Waveform;
