import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, PermissionsAndroid,
  Platform, Alert, StatusBar, Image, Linking
} from 'react-native';
import Contacts, { Contact } from 'react-native-contacts';
import Icon from 'react-native-vector-icons/Ionicons';
import SearchContact from './SearchContact';
import Icondot from 'react-native-vector-icons/MaterialIcons';
import Footer from './Footer';
import AddContactModal from './modal/AddContactModal';
import * as base from '../../component/global'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const HomeWhatsapp: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false)
  const [matchedContacts, setMatchedContacts] = useState<{ name: string; number: string; hasThumbnail: boolean; thumbnailPath: string }[]>([]);
  const navigation = useNavigation()
  useEffect(() => {
    requestContactPermission();

  }, []);

  const MultiContact = async () => {
    try {
      for (let i = 1; i <= 100; i++) {
        const newContact = {
          familyName: `TestContact${i}`,
          givenName: `User${i}`,
          phoneNumbers: [{
            label: 'mobile',
            number: `12345678${i.toString().padStart(2, '0')}` // example number
          }]
        };

        await Contacts.addContact(newContact);
        console.log(`Added contact ${i}`);
      }

      Alert.alert('100 contacts added successfully!');
    } catch (error) {
      console.error('Error adding contacts:', error);
      Alert.alert('Failed to add contacts.');
    }
  }

  const requestContactPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        loadContacts();
        //  MultiContact();
      } else {
        Alert.alert('Permission Denied', 'Cannot access contacts');
      }
    } else {
      loadContacts();
    }
  };

  const loadContacts = () => {
    Contacts.getAll()
      .then((contactsList) => {
        setContacts(contactsList);
        const phoneNumbers = contactsList.flatMap(contact =>
          contact.phoneNumbers.map(phone => ({
            name: contact.displayName,
            number: phone.number.replace(/\s+/g, ''),
            hasThumbnail: contact.hasThumbnail,
            thumbnailPath: contact.thumbnailPath
          }))
        );
        setMatchedContacts(phoneNumbers);
      })
      .catch(error => {
        console.error('Contacts error:', error);
      });
  };

  const filteredContacts = matchedContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  const handleChecknumber = async (item: string) => {
    const mobileno = item.number;
    const jsonValue = await AsyncStorage.getItem("userdata");
   /*  console.log(
      ".....USER Data....." +
      JSON.stringify(await AsyncStorage.getItem("userdata"))
    ); */

    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      const me = userData._id;
      try {
        const response = await fetch(base.BASE_URL + '/apis/auth/check-mobile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobileno: mobileno
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setLoading(false)
          throw new Error(data.message || 'Something went wrong');
        }
        // console.log('...data...' + JSON.stringify(data))
        if (data.message == "mobileno already in use") {
          setLoading(false);
          if (me === data.userinfo._id) {
            Alert.alert("Same User you are not allow to chats")
            return
          }
          const userdata = {
            _id: data.userinfo._id,
            type: "private",
            partner: {
              _id: data.userinfo._id,
              name: data.userinfo.name,
              image: data.userinfo.image || ""
            },
            lastMsg: null,
          };
          console.log('......' + JSON.stringify(userdata))
          navigation.navigate("ChatDetails", { me, partner: data.userinfo._id, userinfo: userdata, type: 'private' });
        }
        else if (data.message == "Email already in use") {
          setLoading(false);
          Alert.alert("Email is Already Exits");
        }
        else if (data.message == "mobileno is required") {
          setLoading(false);
          Alert.alert("mobileno is required");
        }
        else {
          setLoading(false);
          //Alert.alert("Failed");
          //if mobile no not exits send invitation
          sendInvitation(mobileno)
          //end mobile no
        }
        setLoading(false);
        console.log('User registered:', data.message);
      } catch (error) {
        setLoading(false)
        Alert.alert(error.message);
        console.error('Error registering user:', error);
      }
    }
  }
const sendInvitation = (mobileno: string) => {
  const message = 'Hi, you are invited! Please join us.';
  const url = `sms:${mobileno}?body=${encodeURIComponent(message)}`;

  Linking.canOpenURL(url)
    .then((supported) => {
      if (!supported) {
        Alert.alert('Error', 'SMS is not supported on this device');
      } else {
        return Linking.openURL(url);
      }
    })
    .catch((err) => console.error('Error:', err));
};


  const renderItem = ({ item }: { item: typeof matchedContacts[0] }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => {
      handleChecknumber(item)
    }}>
      {item.hasThumbnail && item.thumbnailPath ? (
        <Image
          source={{ uri: item.thumbnailPath }}
          style={styles.contactImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>
            {item.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
      <View>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactNumber}>{item.number}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleClose = () => {
    setModalVisible(false)
    loadContacts()
  }

  return (
    <View style={styles.container}>
        {/* Wrap the content in a flex: 1 View */}
        <View style={{ flex: 1, padding: 15 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 7 }}>
              <Icon name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Menu icon tapped')}>
              <Icondot name="more-vert" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 5 }}>
          <SearchContact query={searchQuery} onSearchChange={setSearchQuery} />
        </View>
        <FlatList
          data={filteredContacts}
          keyExtractor={(item, index) => item.number + index}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 70 }}
        />
        {
          modalVisible ?
            <AddContactModal
              visible={modalVisible}
              onClose={() => handleClose()}
              apiUrl={base.BASE_URL} // Change this to your real API
            />
            : null
        }

      </View>
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#7B68EE' },
  contactItem: { padding: 0, flexDirection: 'row', marginTop: 12, marginBottom: 12 },
  contactImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  placeholderImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  placeholderText: { color: '#fff', fontWeight: 'bold', marginTop: 5 },
  contactName: { fontSize: 16, marginTop: 0 },
  contactNumber: { fontSize: 16, marginTop: 0 },
});

export default HomeWhatsapp;
