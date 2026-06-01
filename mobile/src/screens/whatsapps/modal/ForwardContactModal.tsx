import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    PermissionsAndroid,
    Platform,
    SectionList,
    Image,
    Alert,
} from "react-native";

import Contacts, { Contact } from "react-native-contacts";
import axios from "axios";
import Icon from "react-native-vector-icons/Ionicons";

const ForwardContactModal = ({
    visible,
    onClose,
    onSelectContact,
    apiUrl,
    userId,
}: any) => {
    const [contacts, setContacts] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        requestContactPermission();
        loadRecentChats();
    }, []);

    /*
    ===============================
    FETCH RECENT CONVERSATIONS
    ===============================
    */

    const loadRecentChats = async () => {
        console.log(`${apiUrl}/apis/conversations/${userId}`)
        try {
            const res = await axios.get(`${apiUrl}/apis/conversations/${userId}`);
            const recent = res.data.messages.map((item: any) => ({
                name: item.partner?.name,
                number: item.partner?._id,
                thumbnailPath: item.partner?.image || "",
                type: item.type //"recent",
            }));
            console.log('....recent data..... ', recent)
            setRecentChats(recent);
        } catch (error) {
            console.log("Recent chat error", error);
        }
    };

    /*
    ===============================
    CONTACT PERMISSION
    ===============================
    */

    const requestContactPermission = async () => {
        if (Platform.OS === "android") {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CONTACTS
            );

            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                loadContacts();
            } else {
                Alert.alert("Permission Denied", "Cannot access contacts");
            }
        } else {
            loadContacts();
        }
    };

    /*
    ===============================
    LOAD PHONE CONTACTS
    ===============================
    */

    const loadContacts = () => {
        Contacts.getAll()
            .then((contactsList: Contact[]) => {
                const phoneNumbers = contactsList.flatMap((contact) =>
                    contact.phoneNumbers.map((phone) => ({
                        name: contact.displayName,
                        number: phone.number.replace(/\s+/g, ""),
                        hasThumbnail: contact.hasThumbnail,
                        thumbnailPath: contact.thumbnailPath,
                        type: "contact",
                    }))
                );

                setContacts(phoneNumbers);
            })
            .catch((error) => {
                console.log("Contacts error:", error);
            });
    };

    /*
    ===============================
    SEARCH FILTER
    ===============================
    */

    const filteredContacts = contacts.filter(
        (c) =>
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.number?.includes(searchQuery)
    );

    const filteredRecent = recentChats.filter((c) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSend = (item: any) => {
        const payload = {
            me: userId,        // current user
            partner: item.number,
            type: item.type || "private"
        };

        onSelectContact(payload);  // send to parent
        onClose();                 // close modal
    };

    /*
    ===============================
    SECTION DATA
    ===============================
    */

    const sections = [
        {
            title: "Recent",
            data: filteredRecent,
        },
        {
            title: "Contacts",
            data: filteredContacts,
        },
    ];

    /*
    ===============================
    SELECT CONTACT
    ===============================
    */

    const handleSelect = (item: any) => {
        const contactData = {
            name: item.name,
            phone: item.number,
            thumbnail: item.thumbnailPath,
        };

        onSelectContact(contactData);
        onClose();
    };

    /*
    ===============================
    RENDER CONTACT ITEM
    ===============================
    */

const renderItem = ({ item }: any) => (
  <View style={styles.contactRow}>
    {/* LEFT SIDE */}
    <View style={{flex:1}}>
      <View style={{ display: 'flex', flexDirection: 'row' }}>
        <View style={{ width: 40 }}>
        <Image
        source={item?.partner?.image ? { uri: item?.partner?.image } : require('../../../assets/user.png')}
        style={styles.avatar}
        />
        </View>
      <View style={{ width: '80%' }}>  
      <Text style={styles.contactName}>{item.name}</Text>

      {item.type === "recent" ? (
        <Text style={styles.contactNumber}>Recent chat</Text>
      ) : (
        <Text style={styles.contactNumber}>{item.number}</Text>
      )}
      </View>
      </View>
    </View>

    {/* RIGHT SIDE SEND BUTTON */}
    <View>
      <TouchableOpacity
        style={styles.sendButton}
        onPress={() => handleSend(item)}
      >
        <Text style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  </View>
);
    /*
    ===============================
    RENDER
    ===============================
    */

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                {/* Header */}

                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={26} color="#000" />
                    </TouchableOpacity>

                    <TextInput
                        placeholder="Search contact..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                </View>

                {/* Contact List */}

                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => item.number + index}
                    renderItem={renderItem}
                    renderSectionHeader={({ section }) => (
                        <Text style={styles.sectionHeader}>{section.title}</Text>
                    )}
                />
            </View>
        </Modal>
    );
};

export default ForwardContactModal;

/*
==================================
STYLES
==================================
*/

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
avatar: {
    width: 30,
    height: 30,
    borderRadius: 40,
    marginRight: 10,
  },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12
    },

    searchInput: {
        flex: 1,
        marginLeft: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        color: "#fff",
        height: 40,
    },

    sectionHeader: {
        color: "#aaa",
        fontSize: 14,
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: "#111",
    },

    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 12,
    },

    contactImage: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginRight: 10,
    },

    placeholderImage: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#444",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },

    placeholderText: {
        color: "#fff",
        fontWeight: "bold",
    },

    contactName: {
        fontSize: 12,
        color: "#000",
    },

    contactNumber: {
        fontSize: 12,
        color: "#aaa",
    },
    contactRow:{
  flexDirection:'row',
  alignItems:'center',
  justifyContent:'space-between',
  paddingVertical:12,
  paddingHorizontal:15
},

sendButton:{
  backgroundColor:"#000",
  paddingHorizontal:12,
  paddingVertical:6,
  borderRadius:6
},

sendText:{
  color:"#fff",
  fontSize:12,
  fontWeight:"600"
}
});