import React, { useState } from 'react';
import { View, Text } from 'react-native';

const AudioTime = ({ currentTime, duration }) => {
  const formatMilliseconds = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
      <Text>{formatMilliseconds(currentTime)}</Text>
      <Text>{formatMilliseconds(duration)}</Text>
    </View>
  );
};

export default AudioTime;
