import React, { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

const LiveBadge = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        backgroundColor: "#E91E63",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        transform: [{ scale }],
      }}
    >
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 12 }}>
        LIVE
      </Text>
    </Animated.View>
  );
};

export default LiveBadge;