import React from 'react';
import { View, Text, TextInput } from 'react-native';

const PriceRangeSelector = ({ value, onChange }) => {
  const { min, max } = value;

  const updateMin = (val) => {
    const parsed = parseInt(val) || 0;
    onChange({ min: parsed, max });
  };

  const updateMax = (val) => {
    const parsed = parseInt(val) || 0;
    onChange({ min, max: parsed });
  };

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
        Price Range
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        {/* Min */}
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text>Min</Text>
          <View style={inputWrapper}>
            <TextInput
              value={String(min)}
              onChangeText={updateMin}
              keyboardType="numeric"
              placeholder="0"
              style={input}
            />
            <Text style={currency}>AED</Text>
          </View>
        </View>

        {/* Max */}
        <View style={{ flex: 1 }}>
          <Text>Max</Text>
          <View style={inputWrapper}>
            <TextInput
              value={String(max)}
              onChangeText={updateMax}
              keyboardType="numeric"
              placeholder="0"
              style={input}
            />
            <Text style={currency}>AED</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const inputWrapper = {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 10,
  marginTop: 5,
};

const input = {
  flex: 1,
  paddingVertical: 10,
  fontSize: 16,
};

const currency = {
  color: '#555',
  marginLeft: 8,
};

export default PriceRangeSelector;
