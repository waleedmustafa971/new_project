import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions, TouchableWithoutFeedback, TextInput,
    FlatList, Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { height } = Dimensions.get('window');

// ✅ Add this type definition 
type CreateNewGroupProps = {
    visible: boolean;
    onClose: () => void;
    onStart: () => void;
};

const membersData = [
    { id: '1', name: 'Alice Johnson' },
    { id: '2', name: 'Bob Smith' },
    { id: '3', name: 'Charlie Lee' },
    { id: '4', name: 'David Kim' },
    { id: '5', name: 'Ella Brown' },
];

const CreateNewgroup: React.FC<CreateNewGroupProps> = ({ visible, onClose, onStart }) => {

    const [messageTimerOn, setMessageTimerOn] = useState(false);
    const [search, setSearch] = useState('');
    const [filteredMembers, setFilteredMembers] = useState(membersData);

    const handleSearch = (text: string) => {
        setSearch(text);
        const filtered = membersData.filter(member =>
            member.name.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredMembers(filtered);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
                <View style={styles.overlay}>
                    <View style={styles.modalContainer}>
                        {/* Icon Row */}
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconCircle}>
                                <Icon name="people-outline" size={30} color="#fff" />
                            </View>
                            <View>
                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="close" size={30} color="#000" />
                                </TouchableOpacity>
                               

                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Create a new Group</Text>

                        {/* Description */}
                        {/* Top Row: Camera + Input + Emoji */}
                        <View style={styles.inputRow}>
                            <TouchableOpacity>
                                <Icon name="camera-outline" size={24} style={styles.icon} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Group subject"
                            />
                            <TouchableOpacity>
                                <Icon name="happy-outline" size={24} style={styles.icon} />
                            </TouchableOpacity>
                        </View>

                        {/* Disappearing Messages Toggle */}
                        <View style={styles.settingRow}>
                            <Text style={styles.settingText}>Disappearing messages</Text>
                            <Switch
                                value={messageTimerOn}
                                onValueChange={setMessageTimerOn}
                                trackColor={{ false: '#ccc', true: '#25D366' }}
                                thumbColor={messageTimerOn ? '#25D366' : '#f4f3f4'}
                            />
                        </View>

                        {/* Group Permissions Row */}
                        <TouchableOpacity style={styles.settingRow}>
                            <Text style={styles.settingText}>Group permissions</Text>
                            <Icon name="settings-outline" size={22} />
                        </TouchableOpacity>

                        {/* Member Search Input */}
                        <TextInput
                            placeholder="Search members..."
                            style={styles.searchInput}
                            value={search}
                            onChangeText={handleSearch}
                        />

                        {/* Members List */}
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.memberRow}>
                                    <Icon name="person-circle-outline" size={30} color="#555" />
                                    <Text style={styles.memberName}>{item.name}</Text>
                                </View>
                            )}
                        />

                        {/* Start Button */}
                        <TouchableOpacity style={styles.button} onPress={onStart}>
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        </Modal>
    );
};

export default CreateNewgroup;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
        // height: height * 0.5,
        height: height,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'left',
        marginBottom: 10,
    },
    description: {
        textAlign: 'center',
        fontSize: 14,
        color: '#555',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#25D366',
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 40,
        alignItems: 'center',
        marginTop: 'auto',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  icon: {
    marginHorizontal: 5,
    color: '#555',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  searchInput: {
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 15,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  memberName: {
    marginLeft: 10,
    fontSize: 16,
    color: '#222',
  },
});
