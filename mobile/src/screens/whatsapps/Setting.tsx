import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity, Platform, StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import { useNavigation } from '@react-navigation/native';
const demoImage = require("../../assets/user.png"); // Adjust path as needed


const settingsOptions = [
  { label: 'Linked Devices', icon: 'laptop-outline' },
  { label: 'Account', icon: 'person-outline' },
  { label: 'Privacy', icon: 'lock-closed-outline' },
  { label: 'Chats', icon: 'chatbubbles-outline' },
  { label: 'Notifications', icon: 'notifications-outline' },
  { label: 'Storage and Data', icon: 'folder-outline' },
  { label: 'Help', icon: 'help-circle-outline' },
  { label: 'Invite a Friend', icon: 'person-add-outline' },
];
type SettingRouteProp = RouteProp<RootStackParamList, 'Setting'>;
type GridItem = {
  label: string;
  icon: string;
  backgroundColor: string;
};

const Setting = () => {
  const route = useRoute<SettingRouteProp>();
  const { userid, userinfo } = route.params;
  const me = userid;
  const navigation = useNavigation();

  const handleScreen = async (item: GridItem) => {
 
      switch (item.label) {
        case 'Linked Devices':
          navigation.navigate('LinkedDevices');
          break;
        case 'Account':
          navigation.navigate('Account');
          break;
        case 'Privacy':
          navigation.navigate('Privacy');
          break;
        case 'Notifications':
          navigation.navigate("Notifications");
          break;
        case 'Chats':
          navigation.navigate("Chats");
          break;
         case 'Storage and Data':
          navigation.navigate("StorageData");
          break;
        case 'Help':
          navigation.navigate("Help");
          break
         case 'Invite a Friend':
          navigation.navigate("InviteFriends");
          break  
        default:
          console.log('Unhandled label:', item.label);
      }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"  // light-content, dark-content, or default
        backgroundColor="#ffffff" // Android only: background color
        translucent={false}       // Android only: status bar overlays content or not
      />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Icon name="ellipsis-vertical" size={24} color="#000" />
      </View>

      <ScrollView>
        {/* Profile Info Row */}
        <View style={styles.profileRow}>
          <View style={styles.profileInfo}>
             {
              userinfo?.image ? 
              <>
              <TouchableOpacity onPress={() =>  navigation.navigate("Profile", { userid: userid, userinfo: userinfo })}>
              <Image source={{ uri: userinfo.image}} style={styles.avatar} />
              </TouchableOpacity>
              </>
              :
              <TouchableOpacity onPress={() =>  navigation.navigate("Profile", { userid: userid, userinfo: userinfo })}>
              <Image source={demoImage} style={styles.avatar} />
              </TouchableOpacity>
            }
            <View>
            <TouchableOpacity onPress={() =>  navigation.navigate("Profile", { userid: userid, userinfo: userinfo })}>
              <Text style={styles.name}>{userinfo?.name}</Text>
            </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={() => {
            navigation.navigate("ScanNumber",{
              userid: userid,
              userinfo: userinfo
            })
          }}>
          <Icon name="qr-code-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          {settingsOptions.map((item, index) => (
            <TouchableOpacity style={styles.settingItem} key={index} 
             onPress={() => handleScreen(item)}
            >
              <View style={styles.iconLabel}>
                <Icon name={item.icon} size={22} color="#555" />
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default Setting;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 30 : StatusBar.currentHeight || 0,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: '500',
  },
  phone: {
    fontSize: 14,
    color: '#888',
  },
  settingsList: {
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 10,
  },
});
