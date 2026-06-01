import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import CountryPicker from 'react-native-country-picker-modal';

const AddContactModal = ({ visible, onClose, apiUrl }) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');

  // Country Picker States
  const [countryCode, setCountryCode] = useState('US');
  const [callingCode, setCallingCode] = useState('1');

  const onSelect = (country : any) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  const requestWritePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleAddContact = async () => {
    if (!name || !phoneNumber) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    const hasPermission = await requestWritePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot write contacts');
      return;
    }
    // Combine calling code with the phone number
    const fullPhoneNumber = `+${callingCode}${phoneNumber}`;
    const newContact = {
      familyName: name,
      phoneNumbers: [{ label: 'mobile', number: fullPhoneNumber }],
      emailAddresses: [{ label: 'work', email }],
    };

    try {
      await Contacts.addContact(newContact);
      console.log('Contact added to device');

   //   await axios.post(`${apiUrl}/addContact`, { name, phone: phoneNumber, email, group });

      Alert.alert('Success', 'Contact added successfully');
      setName('');
      setPhoneNumber('');
      setEmail('');
      setGroup('');
      onClose();
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add Contact</Text>

          {/* Name Input */}
          <View style={styles.inputRow}>
           {/*  <Icon name="person" size={20} color="#7B68EE" style={styles.inputIcon} /> */}
            <TextInput
              placeholder="Full Name"
              value={name}
              placeholderTextColor="#C4C0C0"
              onChangeText={setName}
              style={styles.input}
            />
          </View>

          {/* Phone Input */}
         {/*  <View style={styles.inputRow}>
            <Icon name="call" size={20} color="#7B68EE" style={styles.inputIcon} />
            <TextInput
              placeholder="Phone Number"
              value={phoneNumber}
               placeholderTextColor="#000"
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View> */}

          {/* Phone Input with Country Picker */}
          <View style={styles.inputRow}>
            <View style={styles.pickerContainer}>
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withCallingCode
                withAlphaFilter
                onSelect={onSelect}
                
              />
              <Text style={styles.callingCodeText}>+{callingCode}</Text>
            </View>

            <TextInput
              placeholder="Phone Number"
              value={phoneNumber}
              placeholderTextColor="#C4C0C0"
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputRow}>
          {/*   <Icon name="mail" size={20} color="#7B68EE" style={styles.inputIcon} /> */}
            <TextInput
              placeholder="Email (optional)"
               placeholderTextColor="#C4C0C0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          {/* Group Input */}
          <View style={styles.inputRow}>
           {/*  <MaterialIcon name="account-group" size={20} color="#7B68EE" style={styles.inputIcon} /> */}
            <TextInput
              placeholder="Group (optional)"
              value={group}
              onChangeText={setGroup}
              style={styles.input}
               placeholderTextColor="#C4C0C0"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleAddContact} style={styles.addButton}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddContactModal;

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '85%' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#7B68EE', textAlign: 'center', marginBottom: 20 },
pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 8,
  },
  callingCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 8 },

  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  addButton: { backgroundColor: '#7B68EE', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  cancelButton: { backgroundColor: '#999', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
