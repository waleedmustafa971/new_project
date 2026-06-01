import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar, Image, ActivityIndicator, ScrollView

} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Footer from './Footer';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from '../../component/global'
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import StoryList from './StoryItem';
import CategoryFilter from './CategoryFilter';
import io, { Socket } from "socket.io-client";
import SearchModal from './modal/SearchModal';
import { useFocusEffect } from '@react-navigation/native';
import Stopwatch from './Stopwatch';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import { Dimensions } from 'react-native';
import NetInfo from "@react-native-community/netinfo";
const screenHeight = Dimensions.get('window').height;
const { height } = Dimensions.get('window');
import { openDatabase, initDatabase } from '../../utils/dbService';

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
  type: string;
  group: string,
  partner: string
};

const TopCamera = require("../../assets/messenger_icon/camera.png"); // Adjust path as needed
const TopNewmessage = require("../../assets/messenger_icon/New_Message.png"); // Adjust path as needed
const defaultUserImage = require("../../assets/user.png"); // Adjust path as needed
const GroupUserImage = require("../../assets/round.png"); // Adjust path as needed
const demoImage = require("../../assets/user.png"); // Adjust path as needed
const emptyStateImage: ImageSourcePropType = require("../../assets/user.png"); // Replace with your empty image
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const socket = useRef<any>();
  const [newChatUserId, setNewChatUserId] = useState("67dabaea6395831df7dbe782");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [selectedPartner, setPartner] = useState<string | null>(null);
  //const me = "67f772ab25b7e3f3b5f04783"; //"USER_A_ID"; // replace with actual user ID
  console.log('conosle.log......', route.params)
  const { userid, userinfo } = route.params;
  const me = userid;

  const navigation = useNavigation();
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allUser, setAllUser] = useState([])
  const [modalSearch, setModalSearch] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(conversations);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadFromSQLite = () => {

  }

  const loadOfflineConversations = async () => {
    try {
      const db = await openDatabase(); // ✅ get global DB

      db.transaction((tx: any) => {
        tx.executeSql(
          `SELECT * FROM conversations ORDER BY updatedAt DESC`,
          [],
          (_, results) => {
            const rows = results.rows;
            const offlineData: any[] = [];

            for (let i = 0; i < rows.length; i++) {
              offlineData.push(rows.item(i));
            }

            console.log("📦 Offline chats:", offlineData);
            setFilteredConversations(offlineData);
          },
          error => {
            console.log('SQLite select error', error);
            return false;
          }
        );
      });
    } catch (err) {
      console.log("❌ loadOfflineConversations error", err);
    }
  };

  useEffect(() => {
    const setupDB = async () => {
      await initDatabase();
    };

    setupDB();
  }, []);


  useEffect(() => {
    console.log('...conversations.kkk..', JSON.stringify(conversations))
    let filtered = conversations.filter(item => {
      const name = item.type === "group"
        ? item?.group?.groupName || ""
        : item?.partner?.name || "";

      return name.toLowerCase().includes(query.toLowerCase());
    });

    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => {
        switch (selectedCategory) {
          case "Read":
            return item?.lastMsg?.seen;
          case "Unread":
            return !item?.lastMsg?.seen;
          case "Favourites":
            return item?.isFavourite; // assuming you have this flag
          case "Groups":
            return item.type === "group";
          case "Contacts":
            // return item.type === "single";
            return navigation.navigate("HomeWhatsapp");
          case "Boots":
            return item?.isBoot; // if you support bots
          case "Important":
            return item?.isImportant;
          case "Follow up":
            return item?.followUp === true;
          default:
            return true;
        }
      });
    }
    //add in sqlite filtered data
    setFilteredConversations(filtered);
    saveToSQLite(filtered);
  }, [query, conversations, selectedCategory]);

  const saveToSQLite = async (conversations: any[]) => {
    try {
      const db = await openDatabase();

      db.transaction(tx => {
        conversations.forEach(item => {
          const partner = item.partner || {};
          const sender = item.sender || {};
          const receiver = item.receiver || {};
          const lastMsg = item.lastMsg || {};

          tx.executeSql(
            `INSERT OR REPLACE INTO conversations (
            _id, type, partner_id, partner_name,
            last_msg_id, last_msg_text, last_msg_seen,
            updatedAt, sender_id, sender_name,
            receiver_id, receiver_name, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item._id,
              item.type,
              partner._id || "",
              partner.name || "",
              lastMsg._id || "",
              lastMsg.text || "",
              lastMsg.seen ? 1 : 0,
              item.updatedAt || "",
              sender._id || "",
              sender.name || "",
              receiver._id || "",
              receiver.name || "",
              item.createdAt || ""
            ]
          );
        });
      });

      console.log("💾 Conversations saved offline");
    } catch (err) {
      console.log("❌ saveToSQLite error", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const connectSocket = async () => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log('No internet connection. Loading cached data...');
          loadOfflineConversations();
          return;
        }
        console.log('Connecting to socket...');
        socket.current = io(base.SOCKET_URL, { query: { userId: me } });
        // 🔥 If socket already exists → just refresh conversations
        if (socket.current?.connected) {
          console.log("🔄 Refreshing conversations.from back screen..");
          socket.current.emit("getConversations", me);
          return;
        }

        socket.current.on('connect', () => {
          console.log("✅ Socket connected: parents...", socket.current.id);

          console.log('Socket connected!');
          socket.current.emit('getConversations', me);

          socket.current.on("onlineUsers", (users: any) => {
            setOnlineUserIds(users); // Store this in a useState
          });



        });

        socket.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        socket.current.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });

        socket.current.on('conversations', (newData) => {
          console.log('Received conversations data:', newData);

          if (newData && Array.isArray(newData)) {
            setConversations((prevConversations) => {
              // Create a map of existing conversations
              const conversationMap = new Map(prevConversations.map(item => [item._id, item]));
              // Merge newData into existing map
              newData.forEach((newItem) => {
                conversationMap.set(newItem._id, { ...conversationMap.get(newItem._id), ...newItem });
              });
              // Return the merged array
              return Array.from(conversationMap.values()).sort(
                (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
              );
            });

            saveToSQLite(newData);
          }
        });

      };

      connectSocket();

      return () => {
        console.log('Disconnecting socket... form parents');
        //  socket.current?.off("onlineUsers");
        //  socket.current?.disconnect();
      };
    }, [me])
  );

  const openChat = (partnerId: string, item: object) => {
    setPartner(partnerId);
    navigation.navigate("ChatDetails", { me, partner: partnerId, userinfo: item, type: 'private' });
  };
  //opengroupChat
  const opengroupChat = (partnerId: string, item: object) => {
    setPartner(partnerId);
    navigation.navigate("ChatDetails", { me, partner: partnerId, userinfo: item, type: 'group' });
  };


  const handleChatpop = (item: { _id: string; name: string; image?: string, me: string }) => {
    console.log('Chat button pressed with item!', item);
    const userdata = {
      _id: item._id,
      type: "private",
      partner: {
        _id: item._id,
        name: item.name,
        image: item.image || ""
      },
      lastMsg: null,
    };
    setPartner(item._id);
    navigation.navigate("ChatDetails", { me, partner: item._id, userinfo: userdata, type: 'private' });
  };


  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={{ padding: 25 }}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#ffffff"
            translucent={false}
          />
          {/* Header */}
          <View style={styles.header}>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              {
                userinfo?.image ?
                  <Image source={{ uri: userinfo.image }} style={styles.avatar} />
                  :
                  <Image source={demoImage} style={styles.avatar} />
              }

              <Text style={styles.headerTitle}>Chats</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => Alert.alert('Scan camera')}
                style={{ marginRight: 7 }}>
                <Image source={TopCamera} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setModalSearch(true) }}>
                <Image source={TopNewmessage} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{
            marginTop: 10, height: 40,
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
            <Icon name="search" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Search..."
              placeholderTextColor="#999"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* CategoryFilter */}
          <View style={{ marginTop: 10 }}>
            ´  <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </View>
          <View style={{ marginTop: 10, flexDirection: 'row', marginBottom: 15 }}>
            <TouchableOpacity style={styles.StoryAdd} onPress={() => { setModalSearch(true) }}>
              <View style={styles.storyBg}>
                <Icon name="add" size={35} />
              </View>
              <Text style={styles.storyName}>Add </Text>
            </TouchableOpacity>
            <StoryList me={userid} userinfo={userinfo} />
          </View>
          <View style={{ marginBottom: 0, flex: 1 }}>
            <FlatList
              //  data={conversations}
              data={filteredConversations}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingHorizontal: 5,
                marginBottom: 60, // Adjust depending on your footer height
              }}
              renderItem={({ item }: any) => {
                const partner = item.partner;
                const groupinfo = item.group;
                const lastMsg = item.lastMsg?.text ?? "Start a conversation";
                const lastTime = item.lastMsg?.createdAt
                  ? new Date(item.lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "";

                return item.type === "group" ? (
                  <TouchableOpacity
                    style={styles.friendContainer}
                    onPress={() => opengroupChat(item?.group?._id, item)}
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
                      {lastMsg?.seen ? <View style={styles.unreadDot} /> : <View style={styles.readDot} />}
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.friendContainer}
                    onPress={() => openChat(partner._id, item, item.type)}
                  >
                    <View style={styles.avatarContainer}>
                      <Image
                        source={partner?.image ? { uri: partner?.image } : require('../../assets/user.png')}
                        style={styles.avatar}
                      />
                      {/* Status Badge */}
                      <View style={[styles.statusContainer, { backgroundColor: onlineUserIds.includes(partner?._id) ? '#4CAF50' : '#B0B0B0' }]}>
                        <View style={styles.statusDot} />
                        {/*   <Text style={styles.statusText}> {onlineUserIds.includes(partner?._id) ? 'Online' : 'Offline'}</Text> */}
                      </View>
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={styles.userName}>{partner?.name} </Text>
                      {/*    <Text style={{ color: onlineUserIds.includes(partner?._id) ? 'green' : 'gray' }}>
                        {onlineUserIds.includes(partner?._id) ? 'Online' : 'Offline'}
                      </Text> */}
                      <Text numberOfLines={1} style={styles.lastMessage}>
                        {lastMsg}
                      </Text>
                    </View>
                    <View style={styles.rightSection}>
                      <Text style={styles.timeText}>{lastTime}</Text>
                      {lastMsg?.seen ? <View style={styles.unreadDot} /> : <View style={styles.readDot} />}
                      {/*  <View style={styles.unreadDot} /> */}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16, color: "#999" }}>No chat list found</Text>
                </View>
              )}
            />

          </View>
        </View>
        {
          modalSearch ?
            <>
              <SearchModal visible={modalSearch} onHandleChat={(item) => handleChatpop(item)} onClose={() => setModalSearch(false)} />
            </>
            : null
        }

      </ScrollView>
      <Footer />
    </>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    width: 50,
    height: 40,
    position: 'relative', borderWidth: 0, borderColor: 'red'
  },

  statusContainer: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#B0B0B0', // default (offline)
    borderWidth: 1,
    borderColor: '#fff', // border to make it pop
  },
  statusDot: {
    width: 10,
    height: 7,
    borderRadius: 5,
    marginTop: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#ffffff',
    borderWidth: 0, borderColor: 'black'
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  searchBar: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,

  },
  StoryAdd: {
    marginRight: 5, marginTop: 8,
    alignItems: 'center',
  },
  storyBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f2f2f2', /* 007AFF */
    borderWidth: 2,
    borderColor: '#f2f2f2', padding: 12
  },
  friendContainer: {
    flexDirection: "row",
    padding: 0,
    alignItems: "center",
    /*  borderBottomWidth: 0.5,
     borderColor: "#ddd", */
    marginBottom: 17,
    flex: 1
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
  readDot: {
    width: 10,
    height: 10,
    backgroundColor: "silver",
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
  chatItem: { fontSize: 18, marginVertical: 8, padding: 8, backgroundColor: "#ddd", borderRadius: 8 },
});

export default ChatScreen;
