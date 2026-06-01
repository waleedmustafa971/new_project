import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Home, Briefcase, Heart, Plus, MapPin, Pencil } from 'lucide-react-native';

const MapModalChild = ({ visible, onClose, onLocationSelected, latitude, longitude, address: initialAddress }: any) => {

    const [address, setAddress] = useState(initialAddress);
    const [selectedLabel, setSelectedLabel] = useState('Home');
    const [apartment, setApartment] = useState('');
    const [note, setNote] = useState('');
    const labels = [
        { id: 'Home', icon: Home },
        { id: 'Work', icon: Briefcase },
        { id: 'Partner', icon: Heart },
        { id: 'Other', icon: Plus },
    ];
    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                {/* 1. Map Section */}
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: latitude,
                        longitude: longitude, // Coordinates for Comilla
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                >
                    <Marker coordinate={{ latitude: 23.4607, longitude: 91.1809 }} />
                </MapView>

                {/* 2. Overlapping Bottom Sheet */}
                <View style={styles.sheet}>
                    <View style={styles.dragHandle} />

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Delivery details</Text>

                        {/* Address Row */}
                        <View style={styles.addressContainer}>
                            <MapPin color="#000" size={24} />
                            <View style={styles.addressTextWrapper}>
                                <Text style={styles.addressTitle}>{address}</Text>
                                {/*  <Text style={styles.addressSub}>Comilla</Text> */}
                            </View>
                            <TouchableOpacity>
                                <Pencil color="#333" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Input Fields */}
                        <TextInput
                            placeholder="Apartment name"
                            style={styles.input}
                            value={apartment}
                            onChangeText={setApartment} // Update state
                            placeholderTextColor="#999"
                        />

                        <Text style={styles.sectionHeader}>Delivery Instructions</Text>
                        <Text style={styles.subText}>Give us more information about your address.</Text>

                        <TextInput
                            placeholder="Note to rider - e.g. landmark"
                            style={[styles.input, styles.textArea]}
                            multiline
                            value={note}
                            onChangeText={setNote} // Update state
                            placeholderTextColor="#999"
                        />

                        {/* Labels Section */}
                        <Text style={styles.sectionHeader}>Add a label</Text>
                        <View style={styles.labelRow}>
                            {labels.map((item) => (
                                <LabelIcon
                                    key={item.id}
                                    label={item.id}
                                    IconComponent={item.icon} // Passing the reference correctly
                                    isSelected={selectedLabel === item.id}
                                    onPress={() => setSelectedLabel(item.id)}
                                />
                            ))}
                        </View>
                    </ScrollView>

                    {/* Action Button */}
                    <TouchableOpacity style={styles.saveButton}
                        onPress={() => {
                            onClose({
                                apartment,
                                note,
                                label: selectedLabel,
                                coords: { latitude, longitude },
                                address: address
                            });
                        }}
                    >
                        <Text style={styles.saveButtonText}>Save and continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const LabelIcon = ({ IconComponent, label, isSelected, onPress }: any) => (
    <TouchableOpacity style={styles.labelItem} onPress={onPress}>
        <View style={[
            styles.iconCircle,
            isSelected && { borderColor: '#D70F64' } // Change border if selected
        ]}>
            {/* 2. Render it as a JSX Tag here */}
            <IconComponent
                size={18}
                color={isSelected ? '#D70F64' : '#555'}
            />
        </View>
        <Text style={[styles.labelText, isSelected && { color: '#D70F64' }]}>
            {label}
        </Text>
    </TouchableOpacity>
);
const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    sheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 30,
        maxHeight: '65%',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 15,
    },
    title: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
    addressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    addressTextWrapper: { flex: 1, marginLeft: 15 },
    addressTitle: { fontSize: 12, fontWeight: '700' },
    addressSub: { color: '#666', fontSize: 11 },
    input: {
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 12,
        padding: 15,
        fontSize: 12,
        marginBottom: 20,
    },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', marginTop: 10 },
    subText: { color: '#666', marginBottom: 10, fontSize: 11 },
    textArea: { height: 80, textAlignVertical: 'top' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    labelItem: { alignItems: 'center' },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    labelText: { color: '#333' },
    saveButton: {
        backgroundColor: '#D70F64', // Foodpanda/DeliveryHero pink
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});

export default MapModalChild;