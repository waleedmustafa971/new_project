import React from "react";
import {
    Modal,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from "react-native";
// Using MaterialCommunityIcons and Ionicons from react-native-vector-icons
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Message {
    _id: string;
    text?: string;
    msgByUserId: string | any;
    imageUrl?: string;
    audioUrl?: string;
}

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

    const reactions = ["❤️", "😆", "😮", "😢", "😡", "👍"];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalBackground}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            
                            {/* 1. Reaction Bar */}
                            <View style={styles.reactionBar}>
                                {reactions.map((emoji, index) => (
                                    <TouchableOpacity key={index} style={styles.reactionItem}>
                                        <Text style={styles.emojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.plusButton}>
                                    <Ionicons name="add" size={24} color="#555" />
                                </TouchableOpacity>
                            </View>

                            {/* 2. Highlighted Message Preview */}
                            <View style={styles.messageBubble}>
                                <Text style={styles.messageText}>
                                    {selectedMessage?.text || "Media Message"}
                                </Text>
                            </View>

                            {/* 3. Action Menu */}
                            <View style={styles.menuContainer}>
                                <MenuOption 
                                    label="Reply" 
                                    icon="reply" 
                                    onPress={() => { onReply(selectedMessage); onClose(); }} 
                                />
                                <MenuOption 
                                    label="Copy" 
                                    icon="content-copy" 
                                    onPress={onClose} 
                                />
                                <MenuOption 
                                    label="Forward" 
                                    icon="reply" 
                                    isForward 
                                    onPress={() => { onForward(selectedMessage); onClose(); }} 
                                />
                                {/* Labelled for what it does. It was "More",
                                    with a dots icon, and it called onRemove —
                                    so the one destructive action in this menu
                                    was the one that announced itself least. */}
                                <MenuOption 
                                    label="Delete" 
                                    icon="trash-can-outline" 
                                    onPress={() => { onRemove(selectedMessage); onClose(); }} 
                                    isLast 
                                />
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// Helper component for the Menu Rows
const MenuOption = ({ label, icon, onPress, isLast, isForward }: any) => (
    <TouchableOpacity 
        style={[styles.menuButton, isLast && { borderBottomWidth: 0 }]} 
        onPress={onPress}
    >
        <Text style={styles.menuItemText}>{label}</Text>
        <MaterialIcons 
            name={icon} 
            size={22} 
            color="#000" 
            style={isForward ? { transform: [{ scaleX: -1 }] } : {}} 
        />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)', // Dim the background
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        alignItems: 'flex-start',
    },
    reactionBar: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        // Shadow for Android
        elevation: 5,
    },
    emojiText: {
        fontSize: 26,
    },
    reactionItem: {
        padding: 2,
    },
    plusButton: {
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageBubble: {
        backgroundColor: '#FFF',
        padding: 14,
        borderRadius: 18,
        borderTopLeftRadius: 4, // Makes it look like a chat tail start
        marginBottom: 12,
        maxWidth: '100%',
    },
    messageText: {
        fontSize: 12,
        color: '#000',
        lineHeight: 20,
    },
    menuContainer: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        width: 250,
        overflow: 'hidden',
    },
    menuButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    menuItemText: {
        fontSize: 12,
        color: '#000',
        fontWeight: '400',
    },
});

export default MessagePop;