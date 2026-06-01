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
import IconMat from "react-native-vector-icons/MaterialCommunityIcons";
import Footer from './Footer';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from '../../component/global'
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import StoryList from './StoryItem';
import CategoryFilter from './CategoryFilter';
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
import { useSocket } from '../../screens/context/SocketContext';

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
  //const socket = useRef<any>();
  const { socket } = useSocket(); //global socket for apps

  const [newChatUserId, setNewChatUserId] = useState("67dabaea6395831df7dbe782");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [selectedPartner, setPartner] = useState<string | null>(null);
  //const me = "67f772ab25b7e3f3b5f04783"; //"USER_A_ID"; // replace with actual user ID
  const { userid, userinfo } = route.params;
  const me = userid;
  console.log('conosle.log...chatscreen...', userinfo)

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


  // ===============================
  // ✅ INIT DB
  // ===============================
  useEffect(() => {
    initDatabase();
  }, []);


  /* 
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
     // saveToSQLite(filtered);
    }, [query, conversations, selectedCategory]);
   */
  // ===============================
  // 🔥 FIX 1: SAVE ONLY SOCKET DATA
  // ===============================
  const saveToSQLite = async (data: any[]) => {
    const db = await openDatabase();
    db.transaction(tx => {
      data.forEach(item => {
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

    console.log("💾 Saved offline");
  };

  // ===============================
  // 🔥 FIX 2: LOAD OFFLINE (STRUCTURE FIX)
  // ===============================
  const loadOfflineConversations = async () => {
    const db = await openDatabase();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM conversations ORDER BY updatedAt DESC`,
        [],
        (_, results) => {
          const rows = results.rows;
          const formatted: any[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);

            formatted.push({
              _id: row._id,
              type: row.type,
              partner: {
                _id: row.partner_id,
                name: row.partner_name,
              },
              sender: {
                _id: row.sender_id,
                name: row.sender_name,
              },
              receiver: {
                _id: row.receiver_id,
                name: row.receiver_name,
              },
              lastMsg: row.last_msg_id
                ? {
                  _id: row.last_msg_id,
                  text: row.last_msg_text,
                  seen: !!row.last_msg_seen,
                  createdAt: row.updatedAt,
                }
                : null,
              updatedAt: row.updatedAt,
            });
          }
          console.log("📦 Offline loaded:", formatted);
          setConversations(formatted);
          setFilteredConversations(formatted);
        }
      );
    });
  };


  // ===============================
  // SOCKET + OFFLINE SWITCH
  // ===============================
  /* useFocusEffect_off(
    useCallback(() => {
       if (!socket) return;

        const isConnected = socket && socket.connected;

        if (isConnected) {
            console.log("✅ Socket is online");
        } else {
            console.log("❌ Socket is offline");
        }

      const connect = async () => {
        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          console.log("📴 Offline mode");
          loadOfflineConversations();
          return;
        }
     //   socket.current = io(base.SOCKET_URL, { query: { userId: me } });
        socket?.on("connect", () => {
          console.log('....getconversations... chat screen')
          socket?.emit("getConversations", me);
        });
        socket?.on("onlineUsers", (users: any) => {
          setOnlineUserIds(users);
        });
        socket?.on("conversations", (newData: any[]) => {
          if (!Array.isArray(newData)) return;
          const sorted = [...newData].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setConversations(sorted);
          setFilteredConversations(sorted);
          saveToSQLite(sorted); // ✅ correct place
        });
      };
      connect();
    }, [me])
  ); */

  useFocusEffect(
    useCallback(() => {

      if (!socket) return;

      const setupListeners = async () => {

        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          console.log("📴 Offline mode");
          loadOfflineConversations();
          return;
        }

        if (socket.connected) {
          console.log("✅ Socket is online");

          // emit immediately if already connected
          socket.emit("getConversations", me);
        } else {
          console.log("⌛ Waiting for socket connection");

          socket.once("connect", () => {
            console.log("🔌 Socket connected, fetching conversations");
            socket.emit("getConversations", me);
          });
        }

        socket.on("onlineUsers", (users: any) => {
          setOnlineUserIds(users);
        });

        socket.on("conversations", (newData: any[]) => {
          if (!Array.isArray(newData)) return;

          const sorted = [...newData].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          );

          setConversations(sorted);
          setFilteredConversations(sorted);
          saveToSQLite(sorted);
        });
      };

      setupListeners();

      return () => {
        // cleanup listeners when leaving screen
        socket.off("onlineUsers");
        socket.off("conversations");
      };

    }, [socket, me])
  );

  // ===============================
  // 🔥 FIX 3: FILTER WITHOUT SAVING
  // ===============================
  useEffect(() => {
    let filtered = conversations.filter(item => {
      const name = item?.partner?.name || "";
      return name.toLowerCase().includes(query.toLowerCase());
    });
    setFilteredConversations(filtered);
  }, [query, conversations]);


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


  // ===============================
  // LIST HEADER
  // ===============================
  const ListHeader = () => (
    <View style={{ borderWidth: 0, borderColor: 'red' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row' }}>
          <Image source={userinfo?.image ? { uri: base.BASE_URL + '/' + userinfo.image } : demoImage} style={styles.avatar} />
          <Text style={styles.title}>Chats</Text>
        </View>

        <View style={{ flexDirection: 'row' }}>
        {/*   <TouchableOpacity onPress={() => Alert.alert('Camera')}>
            <Image source={TopCamera} />
          </TouchableOpacity> */}
          <TouchableOpacity onPress={() => setModalSearch(true)}>
            <Image source={TopNewmessage} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Search..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <View style={{
        marginTop: 10, flexDirection: 'row',
        borderWidth: 0, borderColor: '#000', marginBottom: 10
      }}>
        <TouchableOpacity style={styles.StoryAdd} onPress={() => { setModalSearch(true) }}>
          <View style={styles.storyBg}>
            <Icon name="add" size={22} />
          </View>
          <Text style={styles.storyName}>Add </Text>
        </TouchableOpacity>
        <StoryList me={userid} userinfo={userinfo} />
      </View>
    </View>
  );

  const formatChatTime = (date) => {
    const d = new Date(date);
    const now = new Date();

    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    return d.toLocaleDateString();
  };
  // ===============================
  // ITEM RENDER
  // ===============================
  const renderItem = ({ item }: any) => {
    const partner = item.partner;
    const groupinfo = item.group;
    const lastMsg = item.lastMsg?.text ?? "";
    const lastTime = item.lastMsg?.createdAt
      ? formatChatTime(item.lastMsg.createdAt)
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {renderLastMessage(item?.lastMsg)}
          </View>
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
          {/*    
<Text style={{ color: onlineUserIds.includes(partner?._id) ? 'green' : 'gray' }}>
{onlineUserIds.includes(partner?._id) ? 'Online' : 'Offline'}
</Text> 
*/}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {renderLastMessage(item?.lastMsg)}
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.timeText}>{lastTime}</Text>
          {lastMsg?.seen ? <View style={styles.unreadDot} /> : <View style={styles.readDot} />}
          {/*  <View style={styles.unreadDot} /> */}
        </View>
      </TouchableOpacity>
    );
  };


  const renderLastMessage = (msg: any) => {
    if (!msg) return null;
    switch (msg.messagetype) {
      case "image":
        return (
          <>
            <IconMat name="image-outline" size={14} color="#666" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}> Photo</Text>
          </>
        );

      case "audio":
        return (
          <>
            <IconMat name="microphone-outline" size={12} color="#666" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}> Voice message</Text>
          </>
        );

      case "video":
        return (
          <>
            <IconMat name="video-outline" size={12} color="#666" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}> Video</Text>
          </>
        );

      case "file":
        return (
          <>
            <IconMat name="file-outline" size={12} color="#666" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}> File</Text>
          </>
        );

      case "contact":
        return (
          <>
            <IconMat name="account-outline" size={16} color="#666" />
            <Text style={{ marginLeft: 4, fontSize: 12 }}> Contact</Text>
          </>
        );

      default:
        return <Text numberOfLines={1} style={{
          fontSize: 10
        }}>{msg.text}</Text>;
    }

  };

  return (
    <>
      <View style={{
        flex: 1, backgroundColor: '#ffffff',
        borderWidth: 0, borderColor: '#000', padding: 10
      }}>
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 90 }}
          ListEmptyComponent={() => (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 12, color: "#999" }}>No chat list found</Text>
            </View>
          )}
        />
        {
          modalSearch ?
            <>
              <SearchModal visible={modalSearch} onHandleChat={(item: any) => handleChatpop(item)} onClose={() => setModalSearch(false)} />
            </>
            : null
        }
        <Footer />
      </View>

    </>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    width: 50,
    height: 40,
    position: 'relative', 
    borderWidth: 0, borderColor: 'red',

  },

  statusContainer: {
    position: 'absolute',
    bottom: 7,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#B0B0B0', // default (offline)
    borderWidth: 0,
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
  title: { fontSize: 16, fontWeight: 'bold', marginLeft: 0 },
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
    height: 35, marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 0,
    elevation: 2
  },
  StoryAdd: {
    marginRight: 5,
    alignItems: 'center',
  },
  storyBg: {
    width: 40,
    height: 40,
    borderRadius: 32,
    backgroundColor: '#f2f2f2', /* 007AFF */
    borderWidth: 2,
    borderColor: '#f2f2f2',
    justifyContent: 'center', alignItems: 'center'
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
    width: 30,
    height: 30,
    borderRadius: 40,
    marginRight: 19, marginTop: 0,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontWeight: "bold",
    fontSize: 12,
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
    fontSize: 12,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  msg: { color: '#666', marginTop: 3 },
  chatItem: { fontSize: 18, marginVertical: 8, padding: 8, backgroundColor: "#ddd", borderRadius: 8 },
});

export default ChatScreen;
