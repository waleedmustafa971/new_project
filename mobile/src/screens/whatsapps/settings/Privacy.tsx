import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const privacyOptions = [
  { title: 'Who can see my personal info', icon: 'eye' },
  { title: 'Last seen & online', icon: 'clock-outline' },
  { title: 'Profile photo', icon: 'account-circle-outline' },
  { title: 'About', icon: 'information-outline' },
  { title: 'Links', icon: 'link-variant' },
  { title: 'Status', icon: 'dots-horizontal' },
  { title: 'Read receipts', icon: 'check-all' },
  { title: 'Disappearing messages', icon: 'timer-sand-empty' },
  { title: 'Groups', icon: 'account-group-outline' },
  { title: 'Avatar', icon: 'emoticon' },
  { title: 'Stickers', icon: 'sticker-emoji' },
  { title: 'Live location', icon: 'map-marker' },
  { title: 'Calls', icon: 'phone-outline' },
  { title: 'Contacts', icon: 'contacts' },
  { title: 'App Lock', icon: 'lock-outline' },
  { title: 'Chat Look', icon: 'palette-outline' },
  { title: 'Allow Camera Effects', icon: 'camera-enhance-outline' },
  { title: 'Advanced Privacy', icon: 'shield-lock-outline' },
  { title: 'Privacy Checkup', icon: 'security' },
];

const Privacy = () => {
    
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item}>
      <Icon name={item.icon} size={24} color="#4A4A4A" style={styles.icon} />
      <Text style={styles.title}>{item.title}</Text>
      <Icon name="chevron-right" size={24} color="#B0B0B0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={privacyOptions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

export default Privacy;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 20,
    width: 26,
    textAlign: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
    marginLeft: 66,
  },
});
