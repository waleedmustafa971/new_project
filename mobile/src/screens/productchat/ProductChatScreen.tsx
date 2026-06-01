import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import api from "../../component/api";
import ChatHeader from "./ChatHeader";
import Icon from "react-native-vector-icons/Ionicons";

export default function ProductChatScreen({ route }: any) {
  const { productId, userId, otherUserId } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadMessages(1);
  }, []);

  const loadMessages = async (pageNo: number) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await api.get(
        `/apis/productchat/product-chat/${productId}/${userId}/${otherUserId}?page=${pageNo}&limit=20`
      );

      const newMessages = res.data?.messages || [];

      if (pageNo === 1) {
        setMessages(newMessages);
        setProduct(res.data?.product);
      } else {
        // 👈 append older messages at END
        setMessages(prev => [...prev, ...newMessages]);
      }

      setHasMore(pageNo < res.data.totalPages);
      setPage(pageNo);
    } catch (err) {
      console.error("Pagination error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      await api.post("/apis/productchat/product-chat-send", {
        productId,
        senderId: userId,
        receiverId: otherUserId,
        message: text,
      });

      setText("");
      setPage(1);
      setHasMore(true);
      loadMessages(1); // reload latest
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  const renderItem = ({ item }: any) => {
    const isMine = item.sender._id === userId;

    return (
      <View
        style={[
          styles.message,
          isMine ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={{ color: "#000" }}>{item.message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {product && <ChatHeader product={product} />}

      <FlatList
        inverted
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        onEndReached={() => loadMessages(page + 1)}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" /> : null
        }
      />

      {/* INPUT */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBox}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            multiline
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? "#007AFF" : "#ccc" },
          ]}
        >
          <Icon name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  message: {
    padding: 10,
    margin: 8,
    borderRadius: 8,
    maxWidth: "75%",
  },
  myMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: "#EEE",
    alignSelf: "flex-start",
  },
  inputRow: {
    flexDirection: "row",
    padding: 10,
  },

  send: {
    marginLeft: 10,
    color: "#007AFF",
    fontWeight: "600",
  },
  inputContainer: {
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderTopWidth: 1,
  borderColor: "#eee",
  backgroundColor: "#fff",
},

inputBox: {
  flex: 1,
  backgroundColor: "#F2F2F2",
  borderRadius: 22,
  paddingHorizontal: 14,
  paddingVertical: 8,
  maxHeight: 120,
},

input: {
  fontSize: 15,
  color: "#000",
  padding: 0, // important for Android
},

sendBtn: {
  width: 40,
  height: 36,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 8,
},

});


/* 
{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "6971048faa847f2127689546",
  "receiverId": "695c24d5acd6b4ef7ad30a4e",
  "message": "what kind of condition of this product",
  "messageType": "text"
}

{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "695c24d5acd6b4ef7ad30a4e",
  "receiverId": "6971048faa847f2127689546",
  "message": "condition is good",
  "messageType": "text"
}

{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "6971048faa847f2127689546",
  "receiverId": "695c24d5acd6b4ef7ad30a4e",
  "message": "i want to buy i am looking for like this product",
  "messageType": "text"
}
{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "695c24d5acd6b4ef7ad30a4e",
  "receiverId": "6971048faa847f2127689546",
  "message": "ok its good i think",
  "messageType": "text"
}

{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "6971048faa847f2127689546",
  "receiverId": "695c24d5acd6b4ef7ad30a4e",
  "message": "you are not sure about this",
  "messageType": "text"
}
{
  "productId": "696ddcbd94e58be7043e2c96",
  "senderId": "695c24d5acd6b4ef7ad30a4e",
  "receiverId": "6971048faa847f2127689546",
  "message": "i am sure you want to buy",
  "messageType": "text"
}

*/
