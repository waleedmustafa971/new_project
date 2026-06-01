import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const accountOptions = [
  { id: '1', title: 'Security Notifications', icon: 'shield-check' },
  { id: '2', title: 'Passkeys', icon: 'key' },
  { id: '3', title: 'Email Address', icon: 'email' },
  { id: '4', title: 'Two-step Verification', icon: 'lock-check' },
  { id: '5', title: 'Change Number', icon: 'phone' },
  { id: '6', title: 'Request Account Info', icon: 'file-document' },
  { id: '7', title: 'Add Account', icon: 'account-plus' },
  { id: '8', title: 'Delete Account', icon: 'account-remove' },
];

const Account = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <View style={styles.iconContainer}>
        <Icon name={item.icon} size={24} color="#555" />
      </View>
      <Text style={styles.itemText}>{item.title}</Text>
      <Icon name="chevron-right" size={24} color="#999" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={accountOptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 30,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#111',
    marginLeft: 15,
  },
  chevron: {
    alignSelf: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#ccc',
    marginLeft: 65,
  },
});
