import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const contacts = [
  { id: '1', name: 'Alice Johnson' },
  { id: '2', name: 'Bob Smith' },
  { id: '3', name: 'Charlie Brown' },
  // You can load real contacts from device later
];

const InviteFriends = ({ navigation }) => {
  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.row}>
      <Icon name="account-outline" size={24} color="#4A4A4A" style={styles.icon} />
      <Text style={styles.label}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite a Friend</Text>
        <TouchableOpacity>
          <Icon name="magnify" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Share Link Row */}
      <TouchableOpacity style={styles.row}>
        <Icon name="share-variant" size={24} color="#4A4A4A" style={styles.icon} />
        <Text style={styles.label}>Share Invite Link</Text>
        <Icon name="chevron-right" size={22} color="#B0B0B0" />
      </TouchableOpacity>

      {/* Separator */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Contacts</Text>
      </View>

      {/* Contact List */}
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

export default InviteFriends;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
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
    textAlign: 'center',
    marginRight: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 70,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F1F1F1',
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
