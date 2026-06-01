import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const SimpleAds = ({ logo, title,subTitle, imageUrl, clickUrl, description }) => {
    const [selectedButton, setSelectedButton] = useState(null);

    const buttons = ['Order Now','Shop Now','Apply Now','Learn more', 'Contact Us', 'Message', 'WhatsApp'];
    /* dropdown */
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([
        { label: 'Read More', value: 'Read More' },
        { label: 'Contact Us', value: 'Contact Us' },
        { label: 'Message', value: 'Message' },
        { label: 'WhatsApp', value: 'WhatsApp' }
    ]);
  //  const subTitle = "Get your Business Account within 3 Days";
    // const clickUrl ="";
    return (
        <View style={styles.cardContainer}>
            {/* Header Row */}
            <View style={styles.header}>
                <Image
                    source={logo ? logo : require('../../../../assets/user.png')}
                    style={styles.logo}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                        {title ? title : "Introduce your clients to us and we will support their investment journey in the UAE, while offering you incentives up to 50%"}
                    </Text>
                </View>            </View>

            {/* Image Row */}
            <TouchableOpacity onPress={() => Linking.openURL(clickUrl)}>
                <Image source={{ uri: imageUrl }} style={styles.adImage} />
            </TouchableOpacity>

            {/* Description and Buttons Row */}
            <View style={styles.bottomSection}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.description}>{description}</Text>
                </View>

                <View style={styles.buttonRow}>
                    <DropDownPicker
                        open={open}
                        value={selectedButton}
                        items={items}
                        setOpen={setOpen}
                        setValue={setSelectedButton}
                        setItems={setItems}
                        placeholder="Select an Option"
                        style={{ borderColor: '#ccc' }}
                        dropDownContainerStyle={{ borderColor: '#ccc' }}
                    />
                </View>
            </View>
        </View>
    );
};

export default SimpleAds;

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginVertical: 10,
        marginHorizontal: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        width: '100%'
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    title: {
        fontSize: 12,
        color: '#000',
        flexWrap: 'wrap', // Optional, usually not needed
        lineHeight: 22, // Improves readability for multiline
    },
    adImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
    bottomSection: {
        marginTop: 5,
    },
    description: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginVertical: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
    },

    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        marginVertical: 5,
    },
    selectedButton: {
        backgroundColor: 'green',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
    },
    selectedButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
