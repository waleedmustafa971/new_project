import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../../screens/context/SocketContext';
import {
    insertMessage,
    updateMessageMongoId,
    updateMessageStatus
} from '../../utils/dbService';
import uuid from 'react-native-uuid';
import NetInfo from "@react-native-community/netinfo";

type ChatdetailsRouteProp = RouteProp<RootStackParamList, 'ChatDetails'>;

interface Message {
    id: string;
    mongoId: string | null;
    convoId: string;
    sender: string;
    receiver: string;
    text: string;
    imageUrl: string;
    audioUrl: string;
    videoUrl: string;
    status: string;
    type: string;
    createdAt: string;
    msgByUserId: string;
    messagetype: string;
    replyTo?: string | null;
    forwardedFrom?: string | null;
    isForwarded: boolean;
}

const ChatDetailsTest = () => {
    const route = useRoute<ChatdetailsRouteProp>();
    const { me, partner, type } = route.params;
    const flatListRef = useRef<FlatList>(null);

    const [replyMessage, setReplyMessage] = useState<any>(null);
    const [forwardMessage, setForwardMessage] = useState<any>(null);

    // Get socket from context
    const { socket } = useSocket();

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");

    const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    useEffect(() => {
        if (!socket) return;

        const isConnected = socket && socket.connected;

        if (isConnected) {
            console.log("✅ Socket is online");
        } else {
            console.log("❌ Socket is offline");
        }
        /* // Listen for incoming messages
        socket.on('receive_message', (newMessage: Message) => {
            setMessages((prev) => {
                if (prev.find(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
            setTimeout(scrollToBottom, 100);
        }); */
        //receiving Incomming instant Message if sender and receiver is online
        /*   socket.on("newMessages", async (data: any) => {
              if (!data?.messages?.length) return;
              const last = data.messages[data.messages.length - 1];
              const formatted = {
                  id: String(last._id),
                  _id: String(last._id),
                  sender: String(last.msgByUserId), // who sent it
                  receiver: me,                     // I received it
                  text: last.text || "",
                  imageUrl: last.imageUrl || "",
                  audioUrl: last.audioUrl || "",
                  videoUrl: last.videoUrl || "",
                  status: "delivered", // ✅ IMPORTANT FIX
                  type: data.type || "private",
                  createdAt: last.createdAt,
                  msgByUserId: String(last.msgByUserId),
                  seen: Boolean(last.seen),
                  messagetype: last.messagetype
              };
              // Save locally
              const datasave = await insertMessage(formatted);
              console.log('....incomming data receive.....', datasave)
              // Update UI
              setMessages(prev => {
                  if (prev.some(m => m._id === formatted._id)) return prev;
                  return [...prev, formatted];
              });
              setTimeout(() => {
                  scrollToBottom();
              }, 100);
              // ✅ DELIVERY ACK TO SERVER
              socket.emit("messageDelivered", {
                  messageId: last._id,
                  userId: me,
              });
          }); */


        return () => {
            socket.off('receive_message');
        };
    }, [socket]);

    const handleTyping = (val: string) => setText(val);

    const submit = async () => {
        if (!text.trim()) return;

        const clientMessageId = String(uuid.v4());
        const createdAt = new Date().toISOString();
        console.log('first ID : ', clientMessageId)
        const message: Message = {
            id: clientMessageId,
            mongoId: null,
            convoId: `${me}_${partner}`,
            sender: me,
            receiver: partner,
            text,
            imageUrl: "",
            audioUrl: "",
            videoUrl: "",
            status: "pending",
            type,
            createdAt,
            msgByUserId: me,
            messagetype: 'text',
            replyTo: replyMessage ? replyMessage.id : null,
            forwardedFrom: forwardMessage ? forwardMessage.id : null,
            isForwarded: !!forwardMessage
        };

        // 1️⃣ Save locally
        await insertMessage(message);

        setMessages(prev => [...prev, message]);
        setText("");
        setReplyMessage(null);
        setForwardMessage(null);

        // 2️⃣ Online check
        const net = await NetInfo.fetch();
        const isOnline = net.isConnected && socket?.connected;

        if (!isOnline) {
            console.log("📴 Offline → stays pending");
            return;
        }
        console.log('get internet and updating')
        console.log('second ID : ', message.id)

        await updateMessageStatus(message.id, "sending");
        sendWithAck(message);
        setTimeout(scrollToBottom, 100);
    };

    const sendWithAck = (msg: Message) => {
        if (!socket) return;

        const payload = {
            id: msg.id,
            clientMessageId: msg.id,
            convoId: msg.convoId,
            sender: msg.sender,
            receiver: msg.receiver,
            text: msg.text,
            messagetype: msg.messagetype,
            createdAt: msg.createdAt,
            replyTo: msg.replyTo,
            forwardedFrom: msg.forwardedFrom,
            isForwarded: msg.isForwarded
        };
        console.log('third ID : ', msg.id)

       /*  // Note: Using socket directly, not socket.current
        socket.emit("sendMessage", payload, async (ack: any) => {
            if (!ack?.success) {
                await updateMessageStatus(msg.id, "failed");
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "failed" } : m));
                return;
            }
            console.log('four ID : ', msg.id)

            // Update status to 'sent' and add the MongoID from server
            await updateMessageMongoId(msg.id, ack.mongoId);
            await updateMessageStatus(msg.id, "sent");
            console.log('five ID : ', msg.id)

            ///i think here message is not updating that way its showing 2 message duplicate
            // i want it will only update status why its making two
            setMessages(prev =>
                prev.map(m =>
                    m.id === msg.id
                        ? { ...m, status: "sent", mongoId: ack.mongoId }
                        : m
                )
            );
        }); */

        socket.emit("sendMessage", payload, async (ack) => {
            if (!ack.success) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "failed" } : m));
                return;
            }
                 console.log('five ID : ', msg.id)

              await updateMessageMongoId(msg.id, ack.mongoId);
              await updateMessageStatus(msg.id, "sent");
            // Update status only
            setMessages(prev =>
                prev.map(m => m.id === msg.id
                    ? { ...m, status: "sent", mongoId: ack.mongoId }
                    : m
                )
            );
        });
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        styles.msgBubble,
                        item.sender === me ? styles.myMsg : styles.theirMsg
                    ]}>
                        <Text style={styles.msgText}>{item.text}</Text>
                        <Text style={styles.msgText}>{item.id}</Text> {/* how is comming
                        here different id */}
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                )}
                onContentSizeChange={scrollToBottom}
            />

            <View style={styles.footer}>
                <TextInput
                    placeholder="Type a message"
                    placeholderTextColor="#999"
                    value={text}
                    multiline
                    onChangeText={handleTyping}
                    style={styles.input}
                />
                <TouchableOpacity onPress={submit}>
                    <Icon name="send" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    msgBubble: {
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '80%',
        marginHorizontal: 10
    },
    myMsg: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
    theirMsg: { alignSelf: 'flex-start', backgroundColor: '#ECECEC' },
    msgText: { fontSize: 16 },
    statusText: { fontSize: 10, color: '#888', textAlign: 'right' },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#EEE'
    },
    input: { flex: 1, maxHeight: 100, paddingHorizontal: 10 }
});

export default ChatDetailsTest;