import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // or MaterialIcons, FontAwesome etc.
import AsyncStorage from "@react-native-async-storage/async-storage";
import PhoneInput from 'react-native-phone-number-input';

const MobileModel = ({ visible, onClose }) => {
    const phoneInput = useRef(null);
    const [value, setValue] = useState('');
    const [formattedValue, setFormattedValue] = useState('');
    const [step, setStep] = useState(1); // 1 = phone, 2 = OTP

    const handleSendOTP = () => {
        console.log('Sending OTP to:', formattedValue);
        // send OTP here
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={{
                        display: 'flex', flexDirection: 'row',
                        justifyContent: 'space-between', borderWidth: 0,
                        borderColor: '#000', height: 50
                    }}>
                        <Text style={{
                            fontSize: 16
                        }}>Sign In with Mobile </Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={{
                        display: 'flex', justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 10
                    }}>
                        {/*   <Text>🇺🇸</Text> */}
                        {step === 1 ? (
                            <>
                                <PhoneInput
                                    ref={phoneInput}
                                    defaultValue={value}
                                    defaultCode="AE"

                                    layout="first"
                                    onChangeText={setValue}
                                    onChangeFormattedText={setFormattedValue}
                                    // withShadow
                                    withDarkTheme={false}
                                    withFlag
                                    withCallingCode
                                    //  countryPickerButtonStyle={styles.countryPickerButton}
                                    //  textInputStyle={styles.textInput}
                                    textInputStyle={{
                                        fontSize: 16,
                                        // ⚠️ DO NOT set custom fontFamily here
                                    }}
                                    containerStyle={styles.phoneContainer}
                                    countryPickerButtonStyle={{
                                        paddingLeft: 0,
                                    }}
                                    countryPickerProps={{
                                        withFlag: true,
                                        withAlphaFilter: true,
                                    }}
                                    autoFocus
                                />
                                
                            </>
                        ) : (
                            <>
                                <Text style={styles.heading}>Enter OTP</Text>
                                <Text style={styles.subtext}>OTP sent to {formattedValue}</Text>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="Enter OTP"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            </>
                        )}


                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end', // Position modal at the bottom
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent backdrop
    },
    heading: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    modalContainer: {
        height: 200, // Covers bottom 50% of screen
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 0,
        zIndex: 10,
    },
    phoneContainer: {
        borderWidth: 0,
        borderColor: '#ccc',
        borderRadius: 50,
    },
    countryPickerButton: {
        marginLeft: 0,
    },
    textInput: {
        paddingVertical: 0,
    },
    flag: {
        paddingHorizontal: 10,
    },
});


export default MobileModel;
