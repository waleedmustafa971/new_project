import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export function AnimatedRecordingBars() {
  // Create a ref array to hold Animated Values for each bar
  const animatedValues = useRef(
    new Array(20).fill(0).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Animate each bar to move up and down in a loop
    animatedValues.forEach((animated, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animated, {
            toValue: Math.random() * 30 + 10,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(animated, {
            toValue: Math.random() * 30 + 10,
            duration: 500,
            useNativeDriver: false,
          })
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.bars}>
      {animatedValues.map((animated, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: animated }
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({ 
  bars: {
    flexDirection:'row',
    alignItems:'flex-end',
    marginBottom: 10,
    height:40
  },
  bar: {
    width: 5,
    backgroundColor:'lightgreen',
    marginHorizontal: 2,
    borderRadius: 2,
  }
});

// To use:
// <AnimatedRecordingBars />
