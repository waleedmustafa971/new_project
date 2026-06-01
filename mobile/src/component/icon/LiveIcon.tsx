import React, { useEffect, useRef } from "react";
import { Animated, View, Text } from "react-native";

const LiveIcon = () => {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      
      {/* 🔴 Blinking Dot */}
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#E91E63",
          marginRight: 6,
          opacity: opacityAnim,
        }}
      />

      {/* LIVE Text */}
      <Text style={{ color: "#E91E63", fontWeight: "bold" }}>
        LIVE
      </Text>
    </View>
  );
};

export default LiveIcon;