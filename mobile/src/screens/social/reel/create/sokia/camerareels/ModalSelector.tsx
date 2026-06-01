import React, { memo } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

const ModalSelector = ({ modes, selectedMode, onSelect }: any) => {
  return (
   <View style={styles.footer_photo_video}>
      <FlatList
        data={modes}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={[styles.modeTab, selectedMode === item && styles.activeTab]}
          >
            <Text style={[styles.modeText, { color: selectedMode === item ? '#000' : '#fff' }]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

export default ModalSelector

const styles = StyleSheet.create({
  footer_photo_video: { 
    position: 'absolute', bottom: 110, left: '40%', right: 0 },
  listContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  modeTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  activeTab: { backgroundColor: '#fff' },
  modeText: { fontWeight: 'bold', fontSize: 13 },
});