import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';

const CameraIcon = ({ isRecording, onPress } : any) => {
  // 0 = Not Recording (Circle), 1 = Recording (Square)
  const recordingValue = useSharedValue(0);

  useEffect(() => {
    recordingValue.value = withSpring(isRecording ? 1 : 0, {
      damping: 15,
      stiffness: 120,
    });
  }, [isRecording]);

  const animatedInnerStyle = useAnimatedStyle(() => {
    return {
      // Transition from 50% borderRadius (Circle) to ~15% (Square)
      borderRadius: interpolate(recordingValue.value, [0, 1], [30, 8]),
      // Scale down slightly when it becomes a square
      transform: [{ scale: interpolate(recordingValue.value, [0, 1], [1, 0.6]) }],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Outer Grey Circle */}
      <View style={styles.outerCircle}>
        {/* Animated Red Core */}
        <Animated.View style={[styles.innerButton, animatedInnerStyle]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: 40,
    height: 40,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Faded white/grey
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerButton: {
    width: 30,
    height: 30,
    backgroundColor: '#ff4b5c', // Facebook Red
  },
});

export default CameraIcon;