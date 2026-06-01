import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

const MIN_SIZE = 13;
const STEP = 5;
const MAX_BARS = 8;
const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 30;

const VolumeVisualizer = ({ onChange }) => {
  const [selectedLevel, setSelectedLevel] = useState(0); // Start at bar 0

  // Calculate font size from bar index (as an integer)
  const fontSize = Math.round(
    MIN_FONT_SIZE +
      (selectedLevel / (MAX_BARS - 1)) * (MAX_FONT_SIZE - MIN_FONT_SIZE)
  );

  const handleSelect = (index) => {
    setSelectedLevel(index);
    if (onChange) {
      onChange(fontSize); // Trigger onChange callback with selected level
    }
  };

  return (
    <View style={{ padding: 0, alignItems: 'center' }}>
      {/* Dynamic Font Size Display */}
      <Text style={{ fontSize: fontSize, marginBottom: 0 }}>
        Font Size: {fontSize}
      </Text>

      {/* Volume Bars */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#f0f0f0',
          borderRadius: 10,
          padding: 10,
        }}
      >
        {Array.from({ length: MAX_BARS }).map((_, index) => {
          const size = MIN_SIZE + index * STEP;
          const isActive = index <= selectedLevel;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleSelect(index)}
              style={{
                width: 10,
                height: size,
                backgroundColor: isActive ? '#007bff' : '#ccc',
                marginRight: 2,
                borderRadius: 2,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

export default VolumeVisualizer;
