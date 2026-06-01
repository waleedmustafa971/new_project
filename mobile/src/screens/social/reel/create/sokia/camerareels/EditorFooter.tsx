import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import React from 'react';

function FooterBtn({
  icon, // Changed this to accept a string (icon name)
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.footerBtn}>
      {/* Updated to use MaterialIcons component */}
      <MaterialIcons name={icon} size={24} color="white" />
      <Text style={styles.footerLabel}>{label}</Text>
    </Pressable>
  );
}

const EditorFooter = ({
  onAddText,
  onAddImage,
  onAddMusic,
  onAddEffect,
}: {
  onAddText: () => void;
  onAddImage: () => void;
  onAddMusic: () => void;
  onAddEffect: () => void;
}) => {
  return (
    <View style={styles.footer}>
      {/* Icon names from Material Design Library */}
      <FooterBtn icon="add-circle-outline" label="Add" onPress={() => {}} />
      <FooterBtn icon="text-fields" label="Text" onPress={onAddText} />
      <FooterBtn icon="image" label="Image" onPress={onAddImage} />
      <FooterBtn icon="music-note" label="Music" onPress={onAddMusic} />
      <FooterBtn icon="auto-fix-high" label="Effect" onPress={onAddEffect} />
    </View>
  );
};

export default EditorFooter;

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Slightly increased for better spacing with icons
    backgroundColor: '#0b0b0b',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
  },
  footerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  footerLabel: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 6, // Added space between icon and text
  },
});