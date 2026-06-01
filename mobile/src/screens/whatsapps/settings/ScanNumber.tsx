import React, { useState } from 'react';
import { View, Text, Image, Button, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
// If you have installed:
// npm install react-native-qrcode-svg
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/navigation';
import { useNavigation } from '@react-navigation/native';
import Icondot from 'react-native-vector-icons/Ionicons';

type ScanRouteProp = RouteProp<RootStackParamList, 'ScanNumber'>;

const ScanNumber = () => {
    const route = useRoute<ScanRouteProp>();
    const { userid, userinfo } = route.params;
    const me = userid;
    const navigation = useNavigation();
    const [phoneNumber, setPhoneNumber] = useState(userid)
    const avatarURL = null;
    const name = null;

    const onScanPress = () => {

    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16 // adding some padding makes it look nicer
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    QR Code
                </Text>

                <Icondot name="ellipsis-vertical" size={24} color="#000" />
            </View>

            {/* QR Code Section */}
            <View style={styles.qrContainer}>
                <View style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20
                }}>
                    <Image
                        source={{ uri: userinfo?.image }}
                        style={styles.avatar}
                    />
                    <Text style={styles.name}>{userinfo?.name}</Text>
                </View>
                <QRCode
                    value="88798787977879789789778"
                    size={200}
                />
                <Text style={styles.qrText}>
                    Scan this QR code to connect instantly
                </Text>
            </View>

            {/* Scan Button */}
            <TouchableOpacity style={styles.scanBtn}
                onPress={onScanPress}
            >
                <Icon name="qr-code-scanner" size={24} color="#fff" />
                <Text style={styles.scanBtnText}>
                    Scan Barcode
                </Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    profile: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 20,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        width: '90%',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    name: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    number: {
        color: '#666',
        fontSize: 16,
    },
    qrContainer: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 30,
        borderRadius: 10,
        marginBottom: 30,
        width: '90%',
    },
    qrText: {
        marginTop: 20,
        color: '#666',
        fontSize: 16,
        textAlign: 'center',
    },
    scanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25D366',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    scanBtnText: {
        color: '#ffffff',
        fontSize: 18,
        marginLeft: 10,
        fontWeight: 'bold',
    },
});

export default ScanNumber