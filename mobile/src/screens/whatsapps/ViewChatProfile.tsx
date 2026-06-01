import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { RootStackParamList } from '../../navigation/navigation';

import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
type ChatdetailsRouteProp = RouteProp<RootStackParamList, 'ChatDetails'>;

const { width } = Dimensions.get('window');

const ViewChatProfile = () => {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150');
  const route = useRoute<ChatdetailsRouteProp>();
  const { partnerid, partnername } = route.params; //partner is used for group id or partner id

  const handleImagePick = () => {
    const options = { mediaType: 'photo', quality: 1 };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.assets && response.assets.length > 0) {
        setProfileImage(response.assets[0].uri);
      }
    });
  };

  const MenuItem = ({ icon, name, value, showArrow = true, textColor = "#000", isLast = false } : any) => (
    <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.menuLeft}>
        <Icon name={icon} size={22} color="#555" style={styles.menuIcon} />
        <Text style={[styles.menuText, { color: textColor }]}>{name}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showArrow && <Icon name="chevron-forward" size={18} color="#C7C7CC" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={() => {
            navigation.goBack()
        }}>
          <Icon name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact info</Text>
        <TouchableOpacity style={styles.headerSide}>
          <Text style={styles.editBtn}>....</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleImagePick}>
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          </TouchableOpacity>
          <Text style={styles.nameText}>{partnername}</Text>
          <Text style={styles.phoneText}>+971 50 114 7960</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <ActionBtn icon="call-outline" label="Audio" />
          <ActionBtn icon="videocam-outline" label="Video" />
          <ActionBtn icon="search-outline" label="Search" />
        </View>

        {/* Media Section */}
        <View style={styles.section}>
          <MenuItem icon="image-outline" name="Media, links and docs" value="5" />
          <MenuItem icon="file-tray-outline" name="Manage storage" value="434 KB" />
          <MenuItem icon="star-outline" name="Starred" value="None" isLast={true} />
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <MenuItem icon="notifications-outline" name="Notifications" />
          <MenuItem icon="color-palette-outline" name="Chat theme" />
          <MenuItem icon="download-outline" name="Save to Photos" value="Default" isLast={true} />
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <MenuItem icon="time-outline" name="Disappearing messages" value="Off" />
          <MenuItem icon="lock-closed-outline" name="Lock chat" showArrow={false} />
          <MenuItem icon="shield-checkmark-outline" name="Advanced chat privacy" value="Off" isLast={true} />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerItem}>
            <Text style={styles.dangerText}>Block Afra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.dangerText}>Report Afra</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionBtn = ({ icon, label }) => (
  <TouchableOpacity style={styles.actionBtn}>
    <View style={styles.actionIconCircle}>
        <Icon name={icon} size={24} color="#007AFF" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: '#F2F2F7',
  },
  headerSide: { width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  editBtn: { color: '#007AFF', fontSize: 17, textAlign: 'right' },
  scrollContent: { paddingTop: 10 },
  profileSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E5E5EA' },
  nameText: { fontSize: 24, fontWeight: 'bold', marginTop: 15, color: '#000' },
  phoneText: { fontSize: 16, color: '#8E8E93', marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 15
  },
  actionBtn: { 
    backgroundColor: '#FFF', 
    width: (width / 3) - 20, 
    height: 80, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  actionLabel: { color: '#007AFF', marginTop: 4, fontSize: 13 },
  section: { 
    marginTop: 20, 
    backgroundColor: '#FFF', 
    borderTopWidth: 0.5, 
    borderBottomWidth: 0.5, 
    borderColor: '#C7C7CC' 
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginLeft: 16, // Indent the line but not the icon
    paddingRight: 16,
    borderBottomWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: 15 },
  menuText: { fontSize: 17, color: '#000' },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  menuValue: { color: '#8E8E93', marginRight: 8, fontSize: 16 },
  dangerItem: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderBottomWidth: 0.5, 
    borderColor: '#C7C7CC' 
  },
  dangerText: { color: '#FF3B30', fontSize: 17 },
});

export default ViewChatProfile;