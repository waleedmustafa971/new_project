import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ListRenderItem, StatusBar, Image, ActivityIndicator,

} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Icondot from 'react-native-vector-icons/MaterialIcons'; // or Ionicons
import Footer from './Footer';
import SearchContact from './SearchContact';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import StoryGroup from './StoryGroup';
import AddNewgroupscreen from './AddNewgroupscreen';
import io, { Socket } from "socket.io-client";
import * as base from '../../component/global'
import { RootStackParamList } from '../../navigation/navigation';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSocket } from '../../screens/context/SocketContext';
import api from '../../component/api';

type CreategroupRouteProp = RouteProp<RootStackParamList, 'CreateGroup'>;

interface User {
  _id: string;
  name: string;
  image?: string | null;
}

interface Message {
  message: string;
  createdAt: string;
  seen?: boolean;
}

interface ChatItem {
  user: User;
  lastMessage?: Message | null;
}

interface ApiResponse {
  chatUsers: ChatItem[];
  totalPages: number;
}
type Conversation = {
  _id: string;
  sender: any;
  receiver: any;
  messages: string[];
  updatedAt: string;
};

const TopCamera = require("../../assets/messenger_icon/camera.png"); // Adjust path as needed
const TopNewmessage = require("../../assets/messenger_icon/New_Message.png"); // Adjust path as needed
const defaultUserImage = require("../../assets/user.png"); // Adjust path as needed
const demoImage = require("../../assets/messenger_icon/profile.png"); // Adjust path as needed
const emptyStateImage: ImageSourcePropType = require("../../assets/user.png"); // Replace with your empty image
const GroupUserImage = require("../../assets/round.png"); // Adjust path as needed

const CreateGroup: React.FC = () => {
  const route = useRoute<CreategroupRouteProp>();
  const { userid, userinfo } = route.params;
  const me = userid;
  const { socket } = useSocket(); //global socket for apps

  const navigation = useNavigation();
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [userId, setUserId] = useState<string>("");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showGroup, setShowGroup] = useState<boolean>(false);
  const [taggedUsers, setTaggedUsers] = useState([])
  const [opengroupPop, setOpengroupPop] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("")

  const getConversation = async () => {
    try {
      const response = await api.get(`/apis/conversations/${me}`);
      console.log("API conversations:", response.data);

      setConversations(response.data?.messages || []);
    } catch (error) {
      console.log("Conversation API error:", error);
    }
  };

  const filteredConversations = conversations.filter((item) => {
    const name =
      item.type === "group"
        ? item?.group?.groupName
        : item?.partner?.name;

    return name?.toLowerCase().includes(query.toLowerCase());
  });

  useFocusEffect(
    useCallback(() => {
      if (!socket) return;
      if (socket.connected) {
        console.log("✅ Socket is online");

        // emit immediately if already connected
        //  socket.emit("getGroupConversations", me);
      } else {
        console.log("⌛ Waiting for socket connection");

        /*  socket.once("connect", () => {
           console.log("🔌 Socket connected, fetching conversations");
           socket.emit("getGroupConversations", me);
         }); */
      }
      getConversation()
      return () => {
        // socket.current?.disconnect();
      };
    }, [me])
  );

  const handleChat = (user: User) => {
    // Your chat open logic here
    console.log("Open chat with user:", user);
  };

  const renderChatItem = ({ item }: ListRenderItemInfo<ChatItem>) => {
    const { user, lastMessage } = item;

    return (
      <TouchableOpacity
        style={styles.friendContainer}
        onPress={() => handleChat(user)}
      >
        {user.image == null ? (
          <Image source={defaultUserImage} style={styles.avatar} />
        ) : (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        )}

        <View style={styles.chatInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text numberOfLines={1} style={styles.lastMessage}>
            {lastMessage?.message || "No message yet"}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.timeText}>
            {lastMessage
              ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
              : ""}
          </Text>
          {!lastMessage?.seen && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const handleOpen = () => {
    // setShowGroup(true)
    console.log('open handle open')
    navigation.navigate("AddNewgroupscreen")
  }

  const handleTaggedUsers = (users: any) => {
    console.log("Selected users from child:", users);
    setTaggedUsers(users);
    setOpengroupPop(true)
  };
  const openChat = (partnerId: string, item: object) => {
    // setPartner(partnerId);
    navigation.navigate("ChatDetails", { me, partner: partnerId, userinfo: item, type: 'group' });
  };


  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ padding: 10 }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
        {/* Header */}
        <View style={styles.header}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {/* <Image source={demoImage} style={styles.avatar} />  */}
            <TouchableOpacity onPress={() => {
              navigation.goBack()
            }}>
              <Icon name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Group</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
          </View>
        </View>

        <View style={{
          marginTop: 10, height: 35,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          paddingHorizontal: 15,
          borderRadius: 50,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 2,
        }}>
          {/* Search BOx */}
          <Icon name="search" size={20} color="#999" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
          />

          {/* end Search BOx */}
        </View>

        <View style={{
          marginTop: 10, flexDirection: 'row', marginBottom: 15,
          borderWidth: 0, borderColor: '#000'
        }}>
          <TouchableOpacity style={styles.StoryAdd} onPress={handleOpen}>
            <View style={styles.storyBg}>
              <Icon name="add" size={22} />
            </View>
            <Text style={styles.storyName}>Add New Group </Text>
          </TouchableOpacity>
          <StoryGroup me={userid} userinfo={userinfo} />
        </View>

        {/* End CategoryFilter */}
        {/* End Template */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={({ item }: any) => {
            const partner = item.partner;
            const groupinfo = item.group;
            const lastMsg = item.lastMsg?.text ?? "Start a conversation";
            const lastTime = item.lastMsg?.createdAt
              ? new Date(item.lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "";

            return (
              <>
                {
                  item.type === "group" ?
                    <>
                      <TouchableOpacity
                        style={styles.friendContainer}
                        onPress={() => openChat(item?.group?._id, item)}
                      >
                        <Image
                          source={item?.group?.groupimage ? { uri: item?.group?.groupimage } : GroupUserImage}
                          style={styles.avatar}
                        />
                        <View style={styles.chatInfo}>
                          <Text style={styles.userName}>{item?.group?.groupName}</Text>
                          <Text numberOfLines={1} style={styles.lastMessage}>
                            {lastMsg}
                          </Text>

                        </View>
                        <View style={styles.rightSection}>
                          <Text style={styles.timeText}>{lastTime}</Text>
                          {item.unseenMsg > 0 && <View style={styles.unreadDot} />}
                          <View style={styles.unreadDot} />
                        </View>
                      </TouchableOpacity>
                    </>
                    :
                    <>

                    </>
                }

              </>
            );
          }}
        />

      </View>
      {
        opengroupPop ?
          <>
            <AddNewgroupscreen visible={showGroup} onClose={() => setOpengroupPop(false)} sendata={taggedUsers} onSelectUsers={handleTaggedUsers} />
          </>
          : null
      }
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 0, borderColor: 'black'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginLeft: 15 },
  searchBar: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,

  },
  StoryAdd: {
    alignItems: 'center', alignContent: 'center'
  },
  storyBg: {
    width: 45,
    height: 45,
    borderRadius: 32,
    backgroundColor: '#f2f2f2', /* 007AFF */
    borderWidth: 2,
    borderColor: '#f2f2f2',
    alignContent: 'center', alignItems: 'center',
    justifyContent: 'center'

  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  friendContainer: {
    flexDirection: "row",
    padding: 0,
    alignItems: "center",
    /*  borderBottomWidth: 0.5,
     borderColor: "#ddd", */
    marginBottom: 17,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginRight: 10,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  lastMessage: {
    color: "#666",
    fontSize: 14,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 10,
    height: 10,
    backgroundColor: "blue",
    borderRadius: 5,
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'gray',
    marginTop: 8,
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
});

export default CreateGroup;
