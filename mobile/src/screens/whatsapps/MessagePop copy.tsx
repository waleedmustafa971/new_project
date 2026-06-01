import React from "react";
import {
    Modal,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback
} from "react-native";

// 1. Define the Message Interface (adjust fields based on your MessageModel)
interface Message {
    _id: string;
    text?: string;
    msgByUserId: string | any;
    imageUrl?: string;
    audioUrl?: string;
}

// 2. Define the Props Interface
interface MessagePopProps {
    visible: boolean;
    selectedMessage: Message | null;
    onClose: () => void;
    onReply: (msg: Message | null) => void;
    onForward: (msg: Message | null) => void;
    onRemove: (msg: Message | null) => void;
}

const MessagePop: React.FC<MessagePopProps> = ({ 
    visible, 
    selectedMessage, 
    onClose, 
    onReply, 
    onForward, 
    onRemove 
}) => {

    return (
        <Modal
            visible={visible} // Use the 'visible' prop directly
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalBackground}>
                    {/* TouchableWithoutFeedback on the inner View prevents 
                        clicks inside the menu from closing the modal */}
                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            <TouchableOpacity 
                                style={styles.menuButton} 
                                onPress={() => { onReply(selectedMessage); onClose(); }}
                            >
                                <Text style={styles.menuItem}>Reply</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.menuButton} 
                                onPress={() => { onForward(selectedMessage); onClose(); }}
                            >
                                <Text style={styles.menuItem}>Forward</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.menuButton} 
                                onPress={() => { onRemove(selectedMessage); onClose(); }}
                            >
                                <Text style={[styles.menuItem, { color: 'red', borderBottomWidth: 0 }]}>
                                    Remove
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Slightly darker for better focus
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 250,
        overflow: 'hidden',
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuButton: {
        width: '100%',
    },
    menuItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        fontSize: 16,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});

export default MessagePop;