import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const helpOptions = [
  { title: 'Help Center', icon: 'lifebuoy' },
  { title: 'Terms and Privacy Policy', icon: 'file-document-outline' },
  { title: 'Channel Reports', icon: 'alert-circle-outline' },
  { title: 'App Info', icon: 'information-outline' },
];

const Help = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => {}}>
      <Icon name={item.icon} size={24} color="#4A4A4A" style={styles.icon} />
      <Text style={styles.title}>{item.title}</Text>
      <Icon name="chevron-right" size={22} color="#B0B0B0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={helpOptions}
        keyExtractor={(item, index) => item.title + index}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

export default Help;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 20,
    width: 28,
    textAlign: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 68,
  },
});
