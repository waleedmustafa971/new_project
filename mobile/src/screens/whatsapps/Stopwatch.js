import React, { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const Stopwatch = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef(null);
  const startTime = useRef(0);
  
  const handleStart = () => {
    startTime.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000)); // in seconds
    }, 1000);
  };
  
  const handleStop = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
  };
  
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Duration: {minutes} minutes {seconds} seconds
      </Text>
      {!isRunning ? (
        <Button title="Start" onPress={handleStart} />
      ) : (
        <Button title="Stop" onPress={handleStop} />
      )}

    </View>
  )
};

const styles = StyleSheet.create({  
  container: { 
    alignItems:'center',
    padding: 20,
    marginTop:'50%' 
  },
  text: { 
    fontSize: 24, 
    marginBottom: 20 
  }
});

export default Stopwatch;
