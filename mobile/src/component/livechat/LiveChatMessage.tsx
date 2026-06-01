// LiveChatMessage.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import * as base from '../global'; // Assuming global constants are here

const { width: screenWidth } = Dimensions.get("window");

// Define the interface for a message item for clarity
interface LiveChatMessageData {
    text: string;
    system?: boolean;
    sender?: { name: string };
    giftImageUrl?: string; // The URL fragment received from the server
}

interface LiveChatMessageProps {
    messages: LiveChatMessageData[];
}

const LiveChatMessage: React.FC<LiveChatMessageProps> = ({ messages }) => {
    const scrollViewRef = useRef<ScrollView>(null);

    // Scroll to the bottom whenever a new message is added
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const renderMessage = (msg: LiveChatMessageData, index: number) => {
        
        // 1. Check for GIFT MESSAGE (System message with an image URL)
        if (msg.system && msg.giftImageUrl) {
            
            // Construct the full URL
            const fullImageUrl = base.BASE_URL + msg.giftImageUrl;
            
            return (
                <View key={index} style={styles.giftMessageContainer}>
                    <View style={styles.giftMessageBubble}>
                        <Text style={styles.giftSenderText}>
                            {/* The sender name is included in msg.text, e.g., "User sent GiftName" */}
                            {msg.text} 
                        </Text>
                        
                        {/* 2. RENDER THE IMAGE using the full URL */}
                        <Image
                            source={{ uri: fullImageUrl }}
                            style={styles.giftImage}
                        />
                        <Text style={styles.giftActionText}>
                            (Sent a gift!)
                        </Text>
                    </View>
                </View>
            );
        }

        // 3. Render STANDARD CHAT or SYSTEM MESSAGE
        return (
            <View key={index} style={styles.messageRow}>
                <Text style={msg.system ? styles.systemText : styles.userText}>
                    {/* Standard Message Text */}
                    {msg.sender ? 
                        <Text style={styles.senderName}>{`${msg.sender.name}: `}</Text>
                        : ''
                    }
                    {msg.text}
                </Text>
            </View>
        );
    };

    return (
        <ScrollView 
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {messages.map(renderMessage)}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 10,
    },
    messageRow: {
        marginBottom: 4,
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    senderName: {
        fontWeight: 'bold',
        color: '#ccc',
    },
    userText: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        color: '#fff',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 14,
    },
    systemText: {
        // Style for non-gift system messages (e.g., join/leave)
        color: '#ccc',
        fontSize: 12,
        fontStyle: 'italic',
        paddingHorizontal: 10,
    },
    
    // --- GIFT UI STYLES ---
    giftMessageContainer: {
        alignSelf: 'center',
        marginVertical: 6,
        maxWidth: screenWidth * 0.7, // Limit width of the gift banner
    },
    giftMessageBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.8)', // Gold/Yellow background
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
    },
    giftSenderText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 8,
    },
    giftImage: {
        width: 35, // Size for the image/icon
        height: 35,
        resizeMode: 'contain',
        marginRight: 8,
    },
    giftActionText: {
        color: '#333',
        fontSize: 12,
        fontStyle: 'italic',
    }
});

export default LiveChatMessage;