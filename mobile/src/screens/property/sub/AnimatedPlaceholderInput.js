import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Animated,
  Text,
  StyleSheet,
} from 'react-native';

const AnimatedPlaceholderInput = () => {
  const animation = useRef(new Animated.Value(100)).current; // Start off-screen to the right
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isFocused && text === '') {
      Animated.timing(animation, {
        toValue: 0, // Move to normal position
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: -100, // Slide out to the left
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, text]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Animated.Text
          style={[
            styles.placeholder,
            {
              transform: [{ translateX: animation }],
              opacity: animation.interpolate({
                inputRange: [-100, 0],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          Search
        </Animated.Text>
        <TextInput
          style={styles.input}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={setText}
          value={text}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  input: {
    fontSize: 16,
    height: '100%',
    color: '#000',
  },
  placeholder: {
    position: 'absolute',
    left: 10,
    fontSize: 16,
    color: '#888',
  },
});

export default AnimatedPlaceholderInput;
