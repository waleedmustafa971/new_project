import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import api from "../../component/api";

type Props = {
    productId: string;
    userId: string;
    otherUserId: string;
};

export default function ProductChatBox({
    productId,
    userId,
    otherUserId,
}: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await api.get(
                `/apis/productchat/product-chat/${productId}/${userId}/${otherUserId}`
            );
            // axios response data is already parsed
            setMessages(res.data?.messages || []);
        } catch (error) {
            console.error("Fetch messages failed:", error);
        }
    };


    const sendMessage = async () => {
        if (!text.trim()) return;
        console.log(' product id ....',productId, '..sender.userid....', userId,  
            'others user ', otherUserId, ' message.... ', text)

        try {
            await api.post("/apis/productchat/product-chat-send", {
                productId,
                senderId: userId,
                receiverId: otherUserId,
                message: text,
            });

            setText("");
            fetchMessages();
        } catch (error) {
            console.error("Send message failed:", error);
        }
    };

    const renderItem = ({ item }: any) => {
        const isMe = item.senderId === userId || item.senderId?._id === userId;

        return (
            <View
                style={[
                    styles.message,
                    isMe ? styles.myMessage : styles.otherMessage,
                ]}
            >
                <Text style={{ color: isMe ? "#fff" : "#000" }}>
                    {item.message}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12 }}
            />

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type message..."
                    placeholderTextColor="#000"
                />
                <TouchableOpacity onPress={sendMessage}>
                    <Text style={styles.send}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    message: {
        maxWidth: "75%",
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#1877F2",
    },
    otherMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#E4E6EB",
    },
    inputRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: "#eee",
        padding: 10,
    },
    input: {
        flex: 1,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        paddingHorizontal: 14, borderWidth: 1, borderColor: '#f2f2f2'
    },
    send: {
        marginLeft: 12, padding: 7,
        color: "#1877F2",
        fontWeight: "600",
        alignSelf: "center",
    },
});
