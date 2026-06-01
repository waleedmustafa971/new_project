import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../../../component/api";

const UserAddressModal = ({ visible, onClose, onApply }: any) => {
    const [selectedaddress, setSelectedaddress] = useState(null);
    const [addressList, setAddressList] = useState<any>(null);

    /*  const addressList = [
       { id: "1", label: "Home - 123 Street, City" },
       { id: "2", label: "Office - Business Bay, Dubai" },
     ]; */
    useEffect(() => {
        addressdata()
    }, [])

    const addressdata = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (!jsonValue) return console.log("No user data found");
        const user = JSON.parse(jsonValue);
        const response = await api.get(`/apis/auth/getProfile?id=${user._id}`);
        const userData = response.data.user;
        if (userData?.address?.length > 0) {
            console.log(".....addresses......", userData.address);

            setAddressList(userData.address); // ✅ store full array
        } else {
            setAddressList([]); // fallback
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* Header */}
                    <Text style={styles.title}>Delivery Address</Text>

                    {/* Address List */}
                    <FlatList
                        data={addressList}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const isSelected = selectedaddress?._id === item._id;

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.addressRow,
                                        isSelected && styles.selectedRow 
                                    ]}
                                    onPress={() => setSelectedaddress(item)}
                                >
                                    <Text
                                        style={[
                                            styles.addressText,
                                            isSelected && styles.selectedText 
                                        ]}
                                    >
                                        {item.location}
                                    </Text>

                                    {isSelected && (
                                        <Feather name="check" size={18} color="green" />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* Add New Address */}
                    <TouchableOpacity style={styles.addRow}>
                        <Feather name="plus" size={18} />
                        <Text style={styles.addText}>Add New Address</Text>
                    </TouchableOpacity>

                    {/* Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.cancel}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                if (selectedaddress) onApply(selectedaddress);
                            }}
                        >
                            <Text style={styles.apply}>Apply</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

export default UserAddressModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    container: {
        backgroundColor: "#fff",
        padding: 16,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        maxHeight: "70%",
    },
    title: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 10,
    },
   
    addRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
    },
    addText: {
        marginLeft: 8,
        fontWeight: "600", fontSize: 12
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
    },
    cancel: {
        color: "red",
        fontSize: 15,
    },
    apply: {
        color: "green",
        fontSize: 15,
        fontWeight: "600",
    },
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  addressText: {
    fontSize: 14,
    color: "#000",
  },

  // ✅ Selected styles
  selectedRow: {
    backgroundColor: "#E6F7FF", // light blue
    borderRadius: 8,
  },

  selectedText: {
    color: "#007AFF", // iOS blue
    fontWeight: "600",
  },
});