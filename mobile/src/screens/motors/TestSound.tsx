import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

const TestSound = () => {

  const playSoundButton = () => {
    const sound = new Sound(
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  null,
  (error) => {
    if (error) {
      console.log('Sound load error:', error);
      return;
    }

    sound.play((success) => {
      if (success) {
        console.log('Playback finished successfully');
      } else {
        console.log('Playback failed due to decoding errors');
      }
      sound.release();
    });
  }
);

  }


  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={playSoundButton} style={styles.button}>
        <Text style={styles.buttonText}>Play Sound</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16 }
});

export default TestSound;
