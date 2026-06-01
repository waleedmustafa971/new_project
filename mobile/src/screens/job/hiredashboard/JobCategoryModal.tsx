import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet
} from "react-native";

const JobCategoryModal = ({ jobcategoriesdata, visible, onClose, onSelect }: any) => {

    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
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
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Job Category</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={jobcategoriesdata}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <View>
                                {/* Parent category */}
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => toggleExpand(item._id)}
                                >
                                    <Text style={styles.itemText}>
                                        {item.title}
                                    </Text>
                                </TouchableOpacity>

                                {/* 
                                
                                Subcategories 
                                
                                */}
                                {expandedId === item._id &&
                                    item.subcategories?.map((sub: any) => (
                                        <TouchableOpacity
                                            key={sub._id}
                                            style={styles.subItem}
                                            onPress={() => {
                                                onSelect(sub);
                                                onClose();
                                            }}
                                        >
                                            <Text style={styles.subText}>
                                                {sub.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                            </View>
                        )}
                    />

                </View>
            </View>
        </Modal>
    );
};

export default JobCategoryModal;


const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        height: "100%",
      //  borderTopLeftRadius: 20,
      //  borderTopRightRadius: 20,
        padding: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    title: {
        fontSize: 12,
        fontWeight: "bold",
    },
    close: {
        fontSize: 14,
    },
    item: {
        padding: 12,
        backgroundColor: "#f2f2f2",
        marginVertical: 5,
        borderRadius: 8,
    },
    itemText: {
        fontSize: 12,
        fontWeight: "600",
    },
    subItem: {
        padding: 10,
        paddingLeft: 25,
        backgroundColor: "#d2a5a5",
        marginVertical: 3,
        borderRadius: 6,
    },
    subText: {
        fontSize: 12,
    },
});