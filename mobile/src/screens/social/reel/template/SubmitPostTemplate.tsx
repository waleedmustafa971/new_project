import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity, Dimensions,
  StyleSheet,
  TouchableWithoutFeedback, ActivityIndicator,
  Keyboard,
} from 'react-native';
import Video from 'react-native-video';
import { BASE_URL } from '../../../../component/global';
const screenWidth = Dimensions.get('window').width;
import Ionicons from 'react-native-vector-icons/Ionicons'; // or any icon library

const SubmitPostTemplate = ({ visible, onClose, onSubmit, loading, videourl }: any) => {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false); //

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>

          {/* Bottom Sheet */}
          <View style={styles.modalContainer}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
              {/*   <Text style={styles.closeText}>Close </Text> */}
                 <Ionicons name="close" size={30} color="black" />
              </TouchableOpacity>

              {/*  <TouchableOpacity onPress={handleSubmit}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity> */}
              <TouchableOpacity onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Text style={styles.submitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.middleSection}>
              <TouchableOpacity
                onPress={() => setIsPlaying(!isPlaying)}
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                <Video
                  source={{ uri: BASE_URL + videourl }}
                  style={styles.video}
                  muted={false}
                  resizeMode="cover"
                  repeat={false}
                  paused={!isPlaying} // ✔️ Control play/pause with state
                  ignoreSilentSwitch="ignore"
                  controls={false}
                  playInBackground={false}
                  playWhenInactive={false}
                  onEnd={() => setIsPlaying(false)}
                />
                  {!isPlaying && (
                              <View style={styles.playIconOverlay}>
                                <Ionicons name="play-circle" size={64} color="white" />
                              </View>
                            )}
                </TouchableOpacity>

            </View>

            {/* Textarea */}
            <TextInput
              style={styles.textArea}
              placeholder="What’s on your mind?"
              placeholderTextColor="#999"
              multiline
              value={text}
              onChangeText={setText}
            />

          </View>

        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SubmitPostTemplate;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
   playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }], // half of icon size (64/2)
  },
  middleSection: {
    width: (screenWidth - 30) / 2, // Adjust width for 2 columns with spacing
    height: 500,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000', marginBottom: 0, borderWidth: 1,
    borderColor: '#000',
    alignContent: 'center', alignItems: 'center', alignSelf: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
    marginBottom: 0
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 250,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeText: {
    color: '#888',
    fontSize: 16,
  },
  submitText: {
    color: '#007AFF', // iOS blue
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
});