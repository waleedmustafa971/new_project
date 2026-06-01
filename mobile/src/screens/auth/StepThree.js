/* Enter Your Name */
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, StyleSheet,
    SafeAreaView
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const StepThree = (props) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const isValid = name.trim().length > 0;
    const inputRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            const timeout = setTimeout(() => {
                inputRef.current?.focus();
            }, 350);
            return () => clearTimeout(timeout);
        }, [])
    );

    const handleSubmit = async () => {
        console.log('name....' + name);
        await AsyncStorage.getItem("tememail");
        await AsyncStorage.getItem("temppassword");
        await AsyncStorage.setItem("tempname", name);
        props.navigation.navigate("StepFour");
    };

    const skipHandle = async () => {
        // Generate a random default name (e.g., User_4829)
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const randomName = `User_${randomNumber}`;
        console.log('Skipping... assigned random name: ' + randomName);
        try {
            // We don't strictly need to "get" the email/pass here unless you're using them,
            // but we definitely need to "set" the temporary name.
            await AsyncStorage.getItem("tememail");
            await AsyncStorage.getItem("temppassword");
            await AsyncStorage.setItem("tempname", randomName);
            // Navigate to the next step
            props.navigation.navigate("StepFour");
        } catch (error) {
            console.log("Error saving random name:", error);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.innerContainer}>
                    {/* Header Section like the screenshot */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => {
                            skipHandle()
                        }}>
                            <Text style={styles.navLink}>Skip</Text>
                        </TouchableOpacity>
                      {/*   <Text style={styles.helpIcon}>?</Text> */}
                        <TouchableOpacity onPress={() => {/* Add help logic here */ }}>
                            <Ionicons
                                name="help-circle-outline"
                                size={24}
                                color="#000"
                            />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.mainTitle}>Your Name</Text>
                    <Text style={styles.description}>
                        Choose a name that represents you.
                        You can always update this in your
                        profile settings later
                    </Text>

                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="your nickname"
                        placeholderTextColor="#A0AEC0"
                        autoCorrect={false}
                        onChangeText={setName}
                        value={name}
                        maxLength={30}
                    />

                    <Text style={styles.counter}>{name.length}/30</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.button,
                        { backgroundColor: isValid ? "#170306ff" : "#959091ff" } // Matching the pinkish tone in your screenshot
                    ]}
                    disabled={!isValid}
                    onPress={handleSubmit}
                >
                    <Text style={[styles.buttonText, { color: isValid ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                        Continue
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: "#fff",
        justifyContent: "space-between",
    },
    innerContainer: {
        marginTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navLink: {
        fontSize: 15,
        fontWeight: "600",
        color: "#000",
    },
    helpIcon: {
        fontSize: 12,
        fontWeight: "600",
    },
    mainTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#000",
        marginBottom: 3,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 12,
        color: "#718096",
        lineHeight: 22,
        marginBottom: 20, width: '50%'
    },
    input: {
        backgroundColor: "#F2F2F2", // Recessed background look
        padding: 12,
        borderRadius: 12,
        fontSize: 12,
        color: "#000",
    },
    counter: {
        marginTop: 8, marginLeft: 7,
        fontSize: 14,
        color: "#A0AEC0",
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 20,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: "700",
    },
});

export default StepThree;