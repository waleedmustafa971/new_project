import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { Home, Briefcase, Heart, Plus, MapPin, Pencil } from 'lucide-react-native';

const AddAddressModalinfo = ({ visible, onClose, onSave, region, selectedAddress }: any) => {
    console.log('region......', region)
    const [location, setLocation] = React.useState(selectedAddress);
    const [type, setType] = React.useState("");
    const [houseNumber, setHouseNumber] = React.useState("");
    const [name, setName] = React.useState("");
    const [instructions, setInstructions] = React.useState("");
    const [mobile, setMobile] = React.useState("");
    const [lat, setLat] = React.useState(region?.latitude);
    const [lng, setLng] = React.useState(region?.longitude);
    const [selectedLabel, setSelectedLabel] = useState('Home');
    
    const labels = [
        { id: 'Home', icon: Home },
        { id: 'Work', icon: Briefcase },
        { id: 'Partner', icon: Heart },
        { id: 'Other', icon: Plus },
    ];

    const saveAddress = () => {
       // Alert.alert(' selected address ' + selectedLabel)
        const data = {
            name: selectedLabel,
            location,
            houseNumber,
            mobile,
            instructions,
            latitude: lat,        // <-- from your map screen
            longitude: lng,       // <-- from your map screen
        };
        onSave(data);  // parent receives and sends to API
        onClose();
    };


    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.title}>Add Address</Text>
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
                    <View style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter location"
                        value={location}
                        onChangeText={setLocation} readOnly
                    />
                    </View>
                    {/* HOUSE/APT NUMBER */}
                    <Text style={styles.label}>Apartment / House Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 21B, Ground Floor"
                        value={houseNumber}
                        onChangeText={setHouseNumber}
                    />

                    <Text style={styles.label}>Mobile No</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Mobile No"
                        value={mobile}
                        onChangeText={setMobile}
                    />

                    {/* OPTIONAL INSTRUCTIONS */}
                    <Text style={styles.label}>Address Specific Instructions (Optional)</Text>
                    <TextInput
                        style={[styles.input, { height: 80 }]}
                        placeholder="Add instructions for delivery"
                        multiline
                        value={instructions}
                        onChangeText={setInstructions}
                    />

                    {/* BUTTONS */}
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

    );
};

export default AddAddressModalinfo;
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
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
    labelItem: { alignItems: 'center' },
    overlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)", position: 'absolute',
        bottom: 0, width: '100%'
    },
    label: {
        fontSize: 12,
        fontWeight: "500",
        marginBottom: 5,
        color: "#333",
    },

    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20, width: '100%'
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12, fontSize: 12
    },
    row: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 10,
    },
    cancelBtn: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
    },
    cancelText: {
        color: "#555",
        fontSize: 12,
    },
    saveBtn: {
        backgroundColor: "#000",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    saveText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
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
    labelText: { color: '#333', fontSize: 12 },

});
