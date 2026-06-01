import React, { useState } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity, Image, Switch, Modal, StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const cities = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"];
const filterOptions = ["All", "Furnished", "Unfurnished"];
const properties = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', // Dubai Marina skyline
    price: '2,500 AED',
    bed: 2,
    bath: 2,
    sqft: 1100,
    description: 'Spacious 2BHK in downtown',
    location: 'Downtown Dubai',
    verified: true
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', // Modern residential building
    price: '5,500 AED',
    bed: 3,
    bath: 3,
    sqft: 1500,
    description: 'Modern 3BHK with city view',
    location: 'Business Bay, Dubai',
    verified: true
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', // Luxury villa exterior
    price: '7,200 AED',
    bed: 4,
    bath: 4,
    sqft: 2000,
    description: 'Luxurious villa with private pool',
    location: 'Palm Jumeirah, Dubai',
    verified: true
  },
];


export default function PropertyFind() {
    const navigation = useNavigation();
    const [location, setLocation] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [showVerified, setShowVerified] = useState(true);

    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(location.toLowerCase())
    );

    const filteredProperties = properties.filter(p =>
        selectedFilter === "All" || p.description.includes(selectedFilter)
    );

    return (
        <View style={{ flex: 1, padding: 10, backgroundColor: '#ffffff' }}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} />
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Location"
                        value={location}
                        onChangeText={setLocation}
                        style={styles.input}
                    />
                </View>

                <TouchableOpacity onPress={() => setShowModal(true)}>
                    <Icon name="filter" size={24} />
                </TouchableOpacity>
            </View>

            {/* Location suggestions */}
            {location.length > 0 && filteredCities.map((city) => (
                <TouchableOpacity key={city} onPress={() => setLocation(city)}>
                    <Text style={{ padding: 5, backgroundColor: '#eee' }}>{city}</Text>
                </TouchableOpacity>
            ))}

            {/* Filter Tabs */}
            <View style={{ borderWidth: 0, borderColor: '#000' }}>

                <FlatList
                    horizontal
                    data={filterOptions}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedFilter(item)}
                          
                            style={{
                                backgroundColor: selectedFilter === item ? '#007AFF' : '#eee',
                                paddingVertical: 6,
                                paddingHorizontal: 15,
                                marginRight: 10,
                                borderRadius: 20, height: 35
                            }}
                        >
                            <Text style={{ color: selectedFilter === item ? '#fff' : '#000' }}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 10 }}
                />
            </View>
            {/* Verified Toggle */}
            <View style={styles.toggleRow}>
                <Text style={{ flex: 1 }}>Show Verified Properties First</Text>
                <Switch value={showVerified} onValueChange={setShowVerified} />
            </View>

            {/* Property Cards */}
            <FlatList
                data={filteredProperties}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <TouchableOpacity   onPress={() => {
                                navigation.navigate("PropertyDetails")
                            }}>
                        <Image source={{ uri: item.image }} style={styles.cardImage} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.loveIcon}>
                            <Icon name="heart" size={20} color="#f00" />
                        </TouchableOpacity>
                        <View style={styles.cardDetails}>
                            <Text style={styles.price}>{item.price}</Text>
                            <Text>{item.bed} Bed • {item.bath} Bath • {item.sqft} sqft</Text>
                            <Text>{item.description}</Text>
                            <Text style={{ color: '#555' }}>{item.location}</Text>
                            <View style={styles.actions}>
                                {/* Call */}
                                <TouchableOpacity style={styles.actionButton}>
                                    <MaterialCommunityIcons name="phone" size={20} color="#007AFF" />
                                    <Text style={styles.actionText}>Call</Text>
                                </TouchableOpacity>

                                {/* Message */}
                                <TouchableOpacity style={styles.actionButton}>
                                    <Icon name="message-circle" size={20} color="#28a745" />
                                    <Text style={styles.actionText}>Message</Text>
                                </TouchableOpacity>

                                {/* WhatsApp */}
                                <TouchableOpacity style={styles.actionButton}>
                                    <FontAwesome name="whatsapp" size={20} color="#25D366" />
                                    <Text style={styles.actionText}>WhatsApp</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                )}
            />

            {/* Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Filter Options</Text>
                    {/* Add filter controls here */}
                    <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                        <Text>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 10
    },
    inputContainer: {
        flex: 1, marginHorizontal: 10, backgroundColor: '#f2f2f2',
        borderRadius: 8, paddingHorizontal: 10
    },
    input: {
        height: 40
    },
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: '#f2f2f2',
        borderTopWidth: 1, borderTopColor: '#f2f2f2'
    },
    card: {
        backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, overflow: 'hidden',
        elevation: 3
    },
    cardImage: {
        height: 180, width: '100%'
    },
    cardDetails: {
        padding: 10
    },
    price: {
        fontWeight: 'bold', fontSize: 16, marginBottom: 5
    },
    loveIcon: {
        position: 'absolute', top: 10, right: 10, backgroundColor: '#fff',
        padding: 6, borderRadius: 20
    },
    actions: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 10
    },
    modalContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 0,
        width: '100%'
    },
    closeBtn: {
        marginTop: 20, alignSelf: 'flex-end'
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },

    actionButton: {
        alignItems: 'center',
        padding: 10,
    },

    actionText: {
        fontSize: 12,
        color: '#333',
        marginTop: 4,
    }

});
