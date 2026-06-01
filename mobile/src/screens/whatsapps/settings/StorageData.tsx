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

const StorageData = () => {
  const [useLessData, setUseLessData] = useState(false);
  const [uploadQuality, setUploadQuality] = useState('Auto');

  const DATA = [
    {
      title: '',
      data: [
        { key: 'Manage Storage', icon: 'database' },
        { key: 'Network Usage', icon: 'chart-box-outline' },
      ],
    },
    {
      title: '',
      data: [
        {
          key: 'Use Less Data for Calls',
          icon: 'cellular',
          isSwitch: true,
          value: useLessData,
          onToggle: () => setUseLessData(!useLessData),
        },
        { key: 'Proxy', icon: 'shield-outline' },
      ],
    },
    {
      title: '',
      data: [
        {
          key: 'Media Upload Quality',
          icon: 'upload',
          value: uploadQuality,
          onPress: () => {
            const options = ['Auto', 'Best Quality', 'Data Saver'];
            const nextIndex =
              (options.indexOf(uploadQuality) + 1) % options.length;
            setUploadQuality(options[nextIndex]);
          },
        },
        {
          key: 'Media Auto-download',
          icon: 'download-outline',
        },
      ],
    },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={item.onPress || (() => {})}
      activeOpacity={item.onPress || item.isSwitch ? 0.6 : 1}
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

export default StorageData;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
