import React from 'react';
import {
    View, Text, Button, FlatList, StyleSheet, TouchableOpacity,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const connectedDevices = [
    { id: '1', platform: 'macOS', browser: 'Firefox', lastActivity: 'Last active today at 09:42' },
    { id: '2', platform: 'macOS', browser: 'Safari', lastActivity: 'Last active yesterday at 18:04' },
    { id: '3', platform: 'Windows', browser: 'Chrome', lastActivity: 'Last active 2 days ago at 15:20' }
]

const LinkedDevices = () => {
    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="dark-content"  // light-content, dark-content, or default
                backgroundColor="#ffffff" // Android only: background color
                translucent={false}       // Android only: status bar overlays content or not
            />

            {/* Header Section */}
            <View style={styles.header}>
                <Icon name="devices" size={60} color="#25D366" />
                <Text style={styles.title}>
                    Use WhatsApp on other devices
                </Text>
            </View>

            {/* Description Section */}
            <Text style={styles.description}>
                You can link up to 4 devices to this account.{' '}
                <Text style={styles.learnMore}>
                    Learn more
                </Text>
            </Text>

            {/* Link Device Button */}
            <TouchableOpacity style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>
                    Link a Device
                </Text>
            </TouchableOpacity>

            {/* Connected Devices List */}
            <View style={styles.deviceList}>
                <Text style={styles.deviceListTitle}>
                    Linked Devices
                </Text>

                <FlatList
                    data={connectedDevices}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.device}>
                            <View style={styles.deviceIcon}>
                                <Icon name="laptop" size={24} color="#000" />
                            </View>
                            <View style={styles.deviceDetails}>
                                <Text style={styles.devicePlatform}>
                                    {item.platform} — {item.browser}
                                </Text>
                                <Text style={styles.deviceActivity}>
                                    {item.lastActivity}
                                </Text>
                            </View>
                        </View>
                    )}

                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 20
    },
    header: {
        alignItems: 'center',
        marginBottom: 30
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10
    },
    description: {
        color: '#666',
        fontSize: 16,
        marginBottom: 20
    },
    learnMore: {
        color: '#25D366',
        fontWeight: '500'
    },
    linkBtn: {
        backgroundColor: '#25D366',
        padding: 15,
        alignItems: 'center',
        borderRadius: 30,
        marginBottom: 30
    },
    linkBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    deviceList: {
        marginBottom: 20
    },
    deviceListTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 10
    },
    device: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    deviceIcon: {
        marginRight: 15
    },
    deviceDetails: {
        flex: 1
    },
    devicePlatform: {
        fontSize: 16,
        fontWeight: '500'
    },
    deviceActivity: {
        color: '#888'
    },
    separator: {
        height: 1,
        backgroundColor: '#eee'
    }
});

export default LinkedDevices;
