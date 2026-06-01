import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput,
    TouchableOpacity, Modal, StyleSheet,
    Alert, PermissionsAndroid, Platform,
    FlatList, Image
} from 'react-native';
//import Contacts from 'react-native-contacts';
import Contacts, { Contact } from 'react-native-contacts';

import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const ShareContactModal = ({ visible, onClose, onSelectContact }: any) => {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [group, setGroup] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false)
    const [matchedContacts, setMatchedContacts] = useState<{ name: string; number: string; hasThumbnail: boolean; thumbnailPath: string }[]>([]);
    const navigation = useNavigation()


    const requestWritePermission = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };
    useEffect(() => {
        requestContactPermission();

    }, []);

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
    const handleChecknumber = (item: any) => {
        const contactData = {
            name: item.name,
            phone: item.number,
            thumbnail: item.thumbnailPath
        };
        onSelectContact(contactData); // send to parent
        onClose();
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


    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TextInput
                        placeholder="Search contact..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                </View>
                {/* top close option */}
                {/* i want to search here with textinput with name or contact */}
                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item, index) => item.number + index}
                    renderItem={renderItem}
                />
            </View>
        </Modal>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    modalContainer: { backgroundColor: '#000', flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },

    searchInput: {
        flex: 1,
        backgroundColor: '#222',
        marginLeft: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        color: '#fff',
        height: 40
    },
    headerTitle: { fontSize: 12, fontWeight: 'bold', color: '#7B68EE' },
    contactItem: { padding: 0, flexDirection: 'row', marginTop: 12, marginBottom: 12 },
    contactImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    placeholderImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    placeholderText: { color: '#000', fontWeight: 'bold', marginTop: 5 },
    contactName: { fontSize: 12, marginTop: 0, color: '#ffffff' },
    contactNumber: { fontSize: 12, marginTop: 0, color: '#ffffff' },
});

export default ShareContactModal;

