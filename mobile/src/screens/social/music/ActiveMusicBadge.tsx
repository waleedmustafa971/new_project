import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';

// Define the shape of the props
interface ActiveMusicBadgeProps {
  playingId: string | null;
  onStop: () => void;
  volumnSetting: () => void;
}

const ActiveMusicBadge: React.FC<ActiveMusicBadgeProps> = ({ playingId, onStop, volumnSetting }) => {
  // If there is no playingId, we return null (renders nothing)
  if (!playingId) return null;

  return (
    <>
    <View style={styles.container}>

  {/* Clickable text area */}
  <Pressable
    style={{ flex: 1 }}
    onPress={volumnSetting}
  >
    <Text style={styles.text} numberOfLines={1}>
      {playingId.length > 18
        ? playingId.substring(0, 18) + "..."
        : playingId}
    </Text>
  </Pressable>

  {/* Delete button */}
  <TouchableOpacity
    style={styles.deleteButton}
    onPress={onStop}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <AntDesign name="delete" size={20} color="#ffffff" />
  </TouchableOpacity>

</View>

    </>
  );
};

/* 
    <Pressable style={styles.container} onPress={volumnSetting}>
      <Text style={styles.text} numberOfLines={1}>
        {playingId.length > 18 ? playingId.substring(0, 18) + "..." : playingId}
      </Text>

      <TouchableOpacity style={styles.deleteButton} onPress={onStop}>
        <AntDesign name="delete" size={20} color="#ffffff" />
      </TouchableOpacity>
    </Pressable>

*/

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15, width: 150,
    flexDirection: 'row', padding: 8, marginTop: 12,// Keeps the badge from stretching full width
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 16,
  },
});

export default ActiveMusicBadge;