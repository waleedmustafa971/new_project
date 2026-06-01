import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList, StyleSheet, ActivityIndicator,
  Image, TextInput, Switch, ScrollView, Alert
} from "react-native";
import Feather from 'react-native-vector-icons/Feather'
import AntDesign from 'react-native-vector-icons/AntDesign'
import Icon from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from '../../component/global'
import { useNavigation } from "@react-navigation/native";

const AddGroupForm = ({ visible, onClose, users, userid }) => {
  const [isloading, setIsloading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [disappearing, setDisappearing] = useState(true);
  const [disappearinggroup, setDisappearinggroup] = useState(false);
  const [sendmessage, setSendmessage] = useState(true)
  const [adminapprovemember, setAdminapprovemember] = useState(true)


  const submitAdd = async () => {
    if (!groupName) {
      Alert.alert('Please Group Name');
      return;
    }
    if (!users || users.length === 0) {
      Alert.alert('Please select at least 1 member to create a group');
      return;
    }
    if (!userid) {
      Alert.alert('User is not authenticated');
      return;
    }
    console.log('...users', users?.map(user => user._id))
    try {
      setIsloading(true)
      const allMembers = [
        ...users?.map(user => user._id),
        userid
      ];
      const res = await fetch(base.BASE_URL + "/apis/voice/creategrpchat", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: groupName,
          isDisappearing: disappearing ? 'on' : 'off',
          grouppermission_enable: disappearinggroup ? 'on' : 'off',
          editgroupsetting: disappearing ? 'on' : 'off',
          sendmessagepermission: sendmessage,
          groupPermission: disappearinggroup ? 'all_members' : 'admin_only',
          members: allMembers,
          admins: [userid],
          createdBy: userid
        })
      });

      if (!res.ok) {
        setIsloading(false)
        throw new Error('Server responded with an error');
      }

      const data = await res.json();

      // Handle success (navigate back, show toast, etc.)
      if (data.message == "Group chat created successfully") {
        Alert.alert('Group Created')
        console.log('Group created!', data.message);
        setIsloading(false)
        onClose()
      }
      setIsloading(false)
    } catch (error) {
      setIsloading(false)
      console.error('Failed to create group!', error);
      // Handle error (set error state, show a toast, etc.)

    } finally {
      setIsloading(false)
      // Optional: stop loading indicator here
    }
  };

  const handleRemoveUser = (userId) => {
    const updatedUsers = selectedUsers.filter((u) => u._id !== userId);
    setSelectedUsers(updatedUsers);
  };



  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <AntDesign name="back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerText}>
                  New Group
                  {selectedUsers.length > 0
                    ? ` (${selectedUsers.length})`
                    : ''}
                </Text>
              </View>

            </View> {/* headerLeft */}
            <View>
              {
                isloading ?
                  <ActivityIndicator />
                  :
                  <TouchableOpacity onPress={submitAdd} style={styles.nextButton}>
                    <Text style={{ color: '#ffffff' }}>Submit</Text>
                  </TouchableOpacity>
              }
            </View>
          </View> {/* Header */}
          <View style={styles.groupform}>
            <TouchableOpacity style={styles.groupicon}>
              <MaterialIcons name="photo-camera" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.textInputContainer}>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Enter group name"
                style={styles.groupinput}
              />
            </View>
          </View>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            height: 40
          }}>
            <Text style={styles.label}>Disappearing Messages</Text>
            <Switch
              value={disappearing}
              onValueChange={setDisappearing}
            />
          </View>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            height: 40
          }}>
            <Text style={styles.label}>Group Permission</Text>
            <Switch
              value={disappearinggroup}
              onValueChange={setDisappearinggroup}
            />
          </View>
          {
            disappearinggroup ?
              <View style={{
                borderWidth: 2, borderColor: '#f2f2f2',
                padding: 7, marginTop: 8,
                backgroundColor: '#f2f2f2'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.label}>Edit group settings</Text>
                  <Switch
                    value={disappearing}
                    onValueChange={setDisappearing}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.label}>Send Messages</Text>
                  <Switch
                    value={sendmessage}
                    onValueChange={setSendmessage}
                  />
                </View>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 7
                }}>
                  <Text style={styles.label}>Admins can</Text>
                  <Text>Approve new members</Text>
                  <Switch
                    value={adminapprovemember}
                    onValueChange={setAdminapprovemember}
                  />
                </View>
              </View>
              :
              null
          }
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10, marginTop: 15
          }}>
            <Text> Member {users?.length} </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={users}
            keyExtractor={(item) => item._id}
            style={{ marginTop: 10 }}
            renderItem={({ item }) => (
              <View style={styles.storyItem}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={item.image ? { uri: item.image } : require("../../assets/user.png")}
                    style={styles.storyImage}
                  />
                  <TouchableOpacity style={styles.closeIcon} onPress={() => handleRemoveUser(item)}>
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                {/* The key part here: numberOfLines and ellipsizeMode */}
                <Text style={styles.storyName}>
                  {item.name.length > 9 ? item.name.slice(0, 9) + '...' : item.name}
                </Text>
              </View>
            )}

          />

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingBottom: 0, borderWidth: 0, borderColor: 'green', backgroundColor: '#ffffff',
    width: '100%'
  },
  nextButton: {
    backgroundColor: '#3B82F6', // Tailwind's blue-500
    borderRadius: 20,
    padding: 8,
    marginLeft: 12,
    elevation: 5, // shadow for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // iOS shadow
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  groupform: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  storyItem: {
    marginRight: 16,
    alignItems: 'center', padding: 8
  },
  groupicon: {
    marginRight: 10,
    padding: 5,
    backgroundColor: '#eee',
    borderRadius: 30,
  },
  groupinput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    width: '100%'
  },
  avatarContainer: {
    position: 'relative',
  },
  textInputContainer: {
    flex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 5,
    marginRight: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151', // Tailwind's gray-800
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center', height: '100%'
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20, height: '100%'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  permissionOption: {
    paddingVertical: 8,
  },
  selectedOption: {
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  permissionText: {
    fontSize: 14,
  },
  memberList: {
    maxHeight: 100,
    marginTop: 5,
  },
  memberItem: {
    fontSize: 13,
    paddingVertical: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  storyImage: {
    width: 40,
    height: 40,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  closeIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff0000',
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});


export default AddGroupForm