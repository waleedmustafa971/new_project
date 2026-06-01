import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Emojis } from './EmojiData';

function EmojiComponent({ showEmojioptions,onSelectEmoji }) {
  return (
    <>
      {showEmojioptions && (
        <View style={styles.options}>
          {/* Horizontal scroll to show all emoji options side by side */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(Emojis).map(([key, emoji]) => (
              <TouchableOpacity key={key} style={styles.emoji}    
              //   key={key}
              //  style={styles.emoji}
                onPress={() => onSelectEmoji(emoji)}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

    </>
  )
}

const styles = StyleSheet.create({  
  options: {
    padding: 10,
    backgroundColor: "#edf0f5",
    borderRadius: 10,
  },
  emoji: {
    marginRight: 15,
  },
  emojiText: {
    fontSize: 24,
  }
});

export default EmojiComponent;
