import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Text } from "react-native";

const PulseLoader = ({ visible, text = "Loading..." }: any) => {
  const scale1 = useRef(new Animated.Value(0.5)).current;
  const scale2 = useRef(new Animated.Value(0.5)).current;
  const scale3 = useRef(new Animated.Value(0.5)).current;

  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const opacity2 = useRef(new Animated.Value(0.5)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (scale: any, opacity: any, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.6,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(scale, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animate(scale1, opacity1, 0).start();
    animate(scale2, opacity2, 400).start();
    animate(scale3, opacity3, 800).start();
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      
      {/* 🔵 Animated Circles */}
      <Animated.View style={[styles.circle, { transform: [{ scale: scale1 }], opacity: opacity1 }]} />
      <Animated.View style={[styles.circle, { transform: [{ scale: scale2 }], opacity: opacity2 }]} />
      <Animated.View style={[styles.circle, { transform: [{ scale: scale3 }], opacity: opacity3 }]} />

      {/* 🔴 Center Content */}
      <View style={styles.centerBox}>
        <View style={styles.innerCircle} />
        <Text style={styles.text}>{text}</Text>
      </View>

    </View>
  );
};


export default PulseLoader;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 999,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  circle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ff6b6b",
  },

  centerBox: {
    justifyContent: "center",
    alignItems: "center",
  },

  innerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff4757",
    elevation: 5,
  },

  text: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});