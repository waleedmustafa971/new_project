import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import api from "../../component/api"; // adjust path
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  ProductChatScreen: {
    chatId: string;
    productId: string;
    otherUserId: string;
    userId: string;
  };
};


export default function ChatProductInboxScreen() {
  //const { userId } = route.params;
const navigation =
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userid, setUserid] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentuser()   
  }, []);

   const fetchCurrentuser = async () => {
      const jsonValue = await AsyncStorage.getItem('userdata');
      if (jsonValue) {
        const userData = JSON.parse(jsonValue);
        setUserid(userData._id);
         fetchChats(userData._id);
      } else {
       // navigation.navigate('AuthScreen');
      }
    };
   

  const fetchChats = async (user : string) => {
    try {
      setLoading(true);
      const res = await api.get(`/apis/productchat/product-chat-list/user/${user}`);
      setChats(res.data);
    } catch (error) {
      console.log("Chat inbox error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    fetchCurrentuser()
    setRefreshing(false);
  };

  const renderItem = ({ item } : any) => {
    const otherUser = item.participants.find(
      (u) => u._id !== userid
    );

    return (
      <TouchableOpacity
        style={styles.chatRow}
         onPress={() =>
          navigation.navigate("ProductChatScreen", {
            productId: item.productId._id,
            otherUserId: otherUser._id,
            userId: userid,
          })
        } 
      >
        <Image
          source={{
            uri:
              item.productId?.images?.[0]?.image ||
              "https://via.placeholder.com/50",
          }}
          style={styles.avatar}
        />

        <View style={styles.chatContent}>
          <Text style={styles.name}>{otherUser?.name || "User"}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
        </View>

        <Text style={styles.time}>
          {item.lastMessageAt
            ? new Date(item.lastMessageAt).toLocaleDateString()
            : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }

  return (
    <SafeAreaView style={{
        backgroundColor: '#ffffff', flex: 1
    }}>
    <FlatList
      data={chats}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          No conversations yet
        </Text>
      }
    />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  chatRow: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#ddd",
  },
  chatContent: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  lastMessage: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: "#999",
  },
});

