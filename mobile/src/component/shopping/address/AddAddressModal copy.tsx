import React from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";

const AddAddressModal = ({ visible, onClose, onSave } : any) => {
    const [location, setLocation] = React.useState("");
    const [type, setType] = React.useState("");
    const [houseNumber, setHouseNumber] = React.useState("");
    const [name, setName] = React.useState("");
    const [instructions, setInstructions] = React.useState(""); 
    const [mobile, setMobile] = React.useState(""); 
    const [lat, setLat] = React.useState("323432"); 
    const [lng, setLng] = React.useState("2343432"); 

   const saveAddress = () => {
    const data = {
        type,
        location,
        houseNumber,
        name,
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
                    {/* Type */}
                    <Text style={styles.label}>Type</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex. Home / Office"
                        value={type}
                        onChangeText={setType}
                    />
                    {/* LOCATION FIELD */}
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter location"
                        value={location}
                        onChangeText={setLocation}
                    />

                    {/* HOUSE/APT NUMBER */}
                    <Text style={styles.label}>Apartment / House Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 21B, Ground Floor"
                        value={houseNumber}
                        onChangeText={setHouseNumber}
                    />

                    {/* NAME */}
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Person Name"
                        value={name}
                        onChangeText={setName}
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

export default AddAddressModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 5,
        color: "#333",
    },

    modalBox: {
        backgroundColor: "#fff",
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
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
        fontSize: 16,
    },
    saveBtn: {
        backgroundColor: "#000",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    saveText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
