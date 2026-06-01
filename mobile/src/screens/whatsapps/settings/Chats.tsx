import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Chats = () => {
  const [enterIsSend, setEnterIsSend] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [mediaVisibility, setMediaVisibility] = useState(true);
  const [fontSize, setFontSize] = useState('Medium');

  const DATA = [
    {
      title: 'Appearance',
      data: [
        { key: 'Display Theme', icon: 'theme-light-dark' },
        { key: 'Default Chat Theme', icon: 'format-color-fill' },
        { key: 'Chat Settings', icon: 'cog-outline' },
        {
          key: 'Font Size',
          icon: 'format-size',
          value: fontSize,
          onPress: () => {
            const sizes = ['Small', 'Medium', 'Large'];
            const nextIndex = (sizes.indexOf(fontSize) + 1) % sizes.length;
            setFontSize(sizes[nextIndex]);
          },
        },
      ],
    },
    {
      title: 'Behavior',
      data: [
        {
          key: 'Enter is Send',
          icon: 'keyboard-return',
          isSwitch: true,
          value: enterIsSend,
          onToggle: () => setEnterIsSend(!enterIsSend),
        },
        {
          key: 'Auto Play Animated Images',
          icon: 'animation-outline',
          isSwitch: true,
          value: autoPlay,
          onToggle: () => setAutoPlay(!autoPlay),
        },
        {
          key: 'Media Visibility',
          icon: 'eye-outline',
          isSwitch: true,
          value: mediaVisibility,
          onToggle: () => setMediaVisibility(!mediaVisibility),
        },
        {
          key: 'Voice Message Transcripts',
          icon: 'microphone-outline',
        },
      ],
    },
    {
      title: 'Data Management',
      data: [
        { key: 'Archived Chats', icon: 'archive-outline' },
        { key: 'Chat Backup', icon: 'cloud-upload-outline' },
        { key: 'Transfer Chats', icon: 'cellphone-transfer' },
        { key: 'Chat History', icon: 'history' },
      ],
    },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={item.onPress || (() => {})}
      activeOpacity={item.onPress ? 0.6 : 1}
    >
      <Icon name={item.icon} size={24} color="#4A4A4A" style={styles.icon} />
      <Text style={styles.label}>{item.key}</Text>
      {item.isSwitch ? (
        <Switch value={item.value} onValueChange={item.onToggle} />
      ) : item.value ? (
        <Text style={styles.valueText}>{item.value}</Text>
      ) : (
        <Icon name="chevron-right" size={20} color="#B0B0B0" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={DATA}
        keyExtractor={(item, index) => item.key + index}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.section}>{title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

export default Chats;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    fontSize: 14,
    fontWeight: '600',
    color: '#777',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  icon: {
    width: 30,
    marginRight: 20,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  valueText: {
    fontSize: 15,
    color: '#666',
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 70,
  },
});
