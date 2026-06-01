import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar, Image,
  Alert, Animated, ActivityIndicator, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Icondot from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
//import moment from 'moment';
const defaultUserImage = require("../../assets/user.png"); // Replace with correct path
const BackImage = require("../../assets/Back.png"); // Replace with correct path
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigation';
import { io } from "socket.io-client";
import * as base from '../../component/global'
import { AnimatedRecordingBars } from './AnimatedRecordingBars';
import EmojiComponent from './EmojiComponent';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import AsyncStorage from "@react-native-async-storage/async-storage";
import VoicePlayer from './modal/VoicePlayer';
import mime from 'mime';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';
import MessagePop from './MessagePop';
import NetInfo from "@react-native-community/netinfo";
//import NetInfo from "@react-native-community/netinfo";
//import { addToQueue, getQueue, clearQueue } from "../../utils/offlineQueue";
import { checkMessages, DeleteLocalmess, deleteOlddata, getPendingMessages, insertMessage, loadMessages, markDeliveredLocally, markMessagesSeenLocally, updateAudioUrl, updateImageUrl, updateMessageStatus } from '../../utils/dbService';
import Toast from 'react-native-toast-message';
import ChatHeaders from './ChatHeaders';

const GroupUserImage = require("../../assets/round.png"); // Adjust path as needed

const audioRecorderPlayer = new AudioRecorderPlayer();

type ChatdetailsRouteProp = RouteProp<RootStackParamList, 'ChatDetails'>;

interface Message {
  text: string;
  createdAt: string;
  msgByUserId: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

const ChatDetails = () => {

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const route = useRoute<ChatdetailsRouteProp>();
  const { me, partner, userinfo, type } = route.params; //partner is used for group id or partner id
  console.log('chatdetails' + '..me..' + me + '---partner...' + partner)
  //console.log('chatdetails' + '..me..' + me + '---partner...' + partner + '....' + JSON.stringify(userinfo) + '..type....' + type)
  const [messages, setMessages] = useState<any[]>([]);
  const [datalist, setDatalist] = useState<any[]>([]);
  const [text, setText] = useState(""); //
  const [capturedPhoto, setCapturedPhoto] = useState(""); //setCapturedPhoto
  const socket = useRef<any>();
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const [groupid, setGroupid] = useState(null)
  const [isRecording, setIsRecording] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const intervalId = useRef<NodeJS.Timer | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojioptions, setShowEmojioptions] = useState(false)
  const [isloading, setIsloading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const minutes = Math.floor(elapsedSecs / 60);
  const seconds = elapsedSecs % 60;
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [typing, setTyping] = useState(false)
  /* time */
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef(null);
  const startTime = useRef(0);
  /* end time */
  // const typingTimeout = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);


  // 🔥 LOAD LOCAL MESSAGES FIRST
  useEffect(() => {
    loadInitialMessages();
    syncPendingMessagesFromCloud()
  }, [me, partner, type]);

  const syncPendingMessagesFromCloud = async () => {
    console.log('syncPendingMessagesFromCloud') // its printing
    try {
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected; // && socket.current?.connected;
      if (!isOnline) return;
      // 1️⃣ Fetch from cloud , its not comming here
      console.log('....URL......', `${base.BASE_URL}/apis/pending-messages/${me}`);
      const response = await fetch(`${base.BASE_URL}/apis/pending-messages/${me}`);
      const data = await response.json();
      if (!data.success || !data.messages.length) return;
      console.log('syncPendingMessagesFromCloud', data.messages)
      const messages = data.messages;
      const receiver = data.receiver;
    //  const receiver = data.receiver;
      for (const msg of messages) {
        const formatted = {
          id: String(msg._id),
          _id: String(msg._id),
          sender: String(msg.msgByUserId),
          receiver: String(receiver),
          text: msg.text || "",
          imageUrl: msg.imageUrl || "",
          audioUrl: msg.audioUrl || "",
          videoUrl: msg.videoUrl || "",
          status: "sent",
          type: msg.type || "private",
          createdAt: msg.createdAt,
          msgByUserId: String(msg.msgByUserId),
          seen: msg.seenBy?.includes(me) || false,
        };
        // 2️⃣ Save in SQLite
      const result =  await insertMessage(formatted);
      console.log('.....formate.....', result)
      console.log('.....insert result.....', result)
        // 3️⃣ Update UI
        setMessages(prev => {
          if (prev.some(m => m._id === formatted._id)) return prev;
          return [...prev, formatted];
        });
        // 4️⃣ Emit delivery ack back to server
         socket.current.emit("messageDelivered", {
          messageId: msg._id,
          userId: me
        }); 
      }
      console.log("✅ Offline messages synced from cloud");
    } catch (err) {
      console.error("❌ Sync pending messages error:", err);
    }
  };

  const loadInitialMessages = async () => {
    const local = await loadMessages(me, partner, type, PAGE_SIZE, 0);
    //  console.log('--get data... form local db.... ', local)
    if (local.length < PAGE_SIZE) setHasMore(false);

    const formatted = local.reverse().map((m: any) => ({
      id: String(m.id),
      _id: String(m.id),

      sender: String(m.sender),
      receiver: String(m.receiver),

      text: m.text || "",
      imageUrl: m.imageUrl || "",
      audioUrl: m.audioUrl || "",
      videoUrl: m.videoUrl || "",

      status: m.status || "sent", // IMPORTANT
      type: m.type || type,
      createdAt: m.createdAt,

      msgByUserId: String(m.msgByUserId || m.sender),
      seen: Boolean(m.seen), // FORCE BOOLEAN
    }));

    setMessages(formatted);
    setDatalist(formatted);
    setPage(1);
    ///use seen here 

  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const offset = page * PAGE_SIZE;
    const older = await loadMessages(me, partner, type, PAGE_SIZE, offset);
    if (older.length < PAGE_SIZE) setHasMore(false);
    const formatted = older
      .reverse()
      .map((m: any) => ({
        id: String(m.id),
        _id: String(m.id),

        sender: String(m.sender),
        receiver: String(m.receiver),

        text: m.text || "",
        imageUrl: m.imageUrl || "",
        audioUrl: m.audioUrl || "",
        videoUrl: m.videoUrl || "",

        status: m.status || "sent",
        type: m.type || type,
        createdAt: m.createdAt,

        msgByUserId: String(m.msgByUserId || m.sender),
        seen: m.seen ?? false,
      }));

    // prepend older messages
    setMessages(prev => [...formatted, ...prev]);

    setPage(prev => prev + 1);
    setLoadingMore(false);
  };

    
  
  useEffect(() => {
     if (!socket.current || !me || !partner) return;
 
     console.log("📤 Emitting seenMessages");
 
     socket.current.emit("seenMessages", { me, partner });
   }, [messages.length]); 
   
   

  useEffect(() => {
    if (!me || !partner) {
      console.log('❌ Skipping socket init: missing values', { me, partner });
      return;
    }
    console.log('🟡 Initializing socket...');
    const timer = setTimeout(() => {
      setIsloading(false);
    }, 2000);
    // Initialize socket connection
    socket.current = io(base.SOCKET_URL, {
      query: { userId: me },
      transports: ['websocket'], // Optional: force WebSocket
      reconnectionAttempts: 5,   // Optional: retry a few times
    });

    ///incomming message from other users
    socket.current.on("newMessages_old", async (data: any) => {
      if (!data?.messages?.length) return;
      const last = data.messages[data.messages.length - 1];
      const formatted = {
        id: String(last._id),
        _id: String(last._id),
        sender: String(last.msgByUserId),
        receiver: String(last.sender === me ? partner : me),
        text: last.text || "",
        imageUrl: last.imageUrl || "",
        audioUrl: last.audioUrl || "",
        videoUrl: last.videoUrl || "",
        status: "sent",
        type: data.type || "private",
        createdAt: last.createdAt,
        msgByUserId: String(last.msgByUserId),
        seen: Boolean(last.seen),
      };

      const datas = await insertMessage(formatted); // optional: only if not exists
      //  console.log('....return', datas)
      // mark delivered in local DB
      await markDeliveredLocally(formatted.id, me);

      setMessages(prev => [...prev, formatted]);

      // ✅🔥 ADD THIS — DELIVERY ACK
      socket.current.emit("messageDelivered", {
        messageId: last._id,
        userId: me,
      });

    });
    //receiving Incomming Message on socket is connect each other device
    socket.current.on("newMessages", async (data: any) => {
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
      };
      // Save locally
      await insertMessage(formatted);
      // Update UI
      setMessages(prev => {
        if (prev.some(m => m._id === formatted._id)) return prev;
        return [...prev, formatted];
      });
      // ✅ DELIVERY ACK TO SERVER
      socket.current.emit("messageDelivered", {
        messageId: last._id,
        userId: me,
      });
    });

    // ✅🔥 SEEN LISTENER (MOVE HERE)
      socket.current.on("messagesSeen", ({ messageIds }: any) => {
       console.log("🔥 Seen update received", messageIds);
       // Update UI
       setMessages(prev =>
         prev.map(m =>
           messageIds.includes(m._id)
             ? { ...m, seen: true }
             : m
         )
       );
       // Update SQLite
       markMessagesSeenLocally(messageIds);
     }); 

    socket.current.on("onlineUsers", (users: any) => {
      console.log('online users.', users)
      setOnlineUserIds(users);
    });

    const handleTyping = ({ from }: { from: string }) => {
      if (from === partner) setTyping(true);
    };

    const handleStopTyping = ({ from }: { from: string }) => {
      if (from === partner) setTyping(false);
    };

    socket.current.on("typing", handleTyping);
    socket.current.on("stopTyping", handleStopTyping);

    return () => {
      clearTimeout(timer);
      socket.current?.off("messages");
      socket.current?.off("newMessages");
      socket.current?.off("typing");
      socket.current?.off("stopTyping");
      socket.current?.off("messagesSeen");
      socket.current.off("typing", handleTyping);
      socket.current.off("stopTyping", handleStopTyping);
      socket.current?.disconnect();
    };
  }, [me, partner]);



  useEffect(() => {
    if (!socket.current) return;

    socket.current.on("connect", () => {
      console.log("🟢 Socket connected → syncing pending");
      syncPendingMessages();
    });

    return () => {
      socket.current?.off("connect");
    };
  }, []);

  const syncPendingMessages = async () => {
    try {
      //  Alert.alert("🔄 Syncing pending messages...");
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && socket.current?.connected;
      if (!isOnline) return;

      const pending = await getPendingMessages();
      if (!pending.length) return;

      for (const msg of pending) {
        const payload = {
          _id: String(msg.id), // ✅ FIX: send same ID
          sender: msg.sender,
          receiver: msg.receiver,
          text: msg.text,
          imageUrl: msg.imageUrl,
          videoUrl: msg.videoUrl,
          audioUrl: msg.audioUrl,
          type: msg.type,
          createdAt: msg.createdAt,
        };

        socket.current.emit("sendMessage", payload, async (ack: any) => {
          if (!ack?.success) return;

          await updateMessageStatus(msg.id, "sent");
          // ✅ mark delivered locally
          // await markDeliveredLocally(msg.id, me);
          await markDeliveredLocally(msg.id, me);

          setMessages(prev =>
            prev.map(m =>
              m._id === msg.id ? { ...m, status: "sent" } : m
            )
          );
        });
      }
      //  checkData()
      console.log("✅ Sync complete");
    } catch (err) {
      console.error("❌ Sync error:", err);
    }
  };

  const submit = async () => {
    if (!text.trim()) return;
    const id = Date.now().toString(); // ✅ FIX: string ID
    const createdAt = new Date().toISOString();
    //  console.log('first created ID', id)
    const message = {
      id,
      _id: id,
      convoId: `${me}_${partner}`, // ✅ FIX
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
    };

    // 1️⃣ Save locally FIRST
    //  await insertMessage(message);

    const datas = await insertMessage(message); // optional: only if not exists
    // console.log('....new message ', datas)

    // 2️⃣ Update UI instantly
    setMessages(prev => {
      if (prev.some(m => m._id === message._id)) return prev; // ✅ FIX dedupe
      return [...prev, message];
    });

    setText("");

    // 3️⃣ Online check
    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && socket.current?.connected;

    if (!isOnline) {
      console.log("📴 Offline → stays pending");
      return;
    }

    sendWithAck(message);
    // checkData();
  };

  const sendWithAck = async (msg: any) => {
    //  console.log('..sendWithAck second ID ....', msg.id)
    const payload = {
      _id: msg.id, // ✅ FIX: send local ID
      sender: msg.sender,
      receiver: msg.receiver,
      text: msg.text,
      imageUrl: msg.imageUrl,
      audioUrl: msg.audioUrl,
      videoUrl: msg.videoUrl,
      type: msg.type,
      createdAt: msg.createdAt,
    };

    ///this making double data
    socket.current.emit("sendMessage", payload, async (ack: any) => {
      if (!ack?.success) return;
    });
    // if cloud insert success than it will update local msg.id send success
    await updateMessageStatus(msg.id, "sent");

    // ✅ update UI safely than UI will update send other it will pending
    setMessages(prev =>
      prev.map(m =>
        m._id === msg.id ? { ...m, status: "sent" } : m
      )
    );
    // return


  };


  const deleteOlduserdata = async () => {
    await deleteOlddata();
  }
  const DeleteLocalmessage = async (autoid: string) => {
    await DeleteLocalmess(autoid);
  }

  const toggleAction = (action: string) => {
    if (action == "add") {
      setShowOptions((prev) => !prev)
      setShowEmojioptions(false)
      //setShowEmojioptions(false)
      setIsRecording(false)
    }
    else if (action == "emoji") {
      setShowEmojioptions((prev) => !prev)
      setIsRecording(false)
      setShowOptions(false)
    }
    else if (action == "recording") {
      startRecording()
      setShowOptions(false)
      setShowEmojioptions(false)
    }

  }
  const startRecording = async () => {
    setIsRecording(true);
    try {
      const uri = await audioRecorderPlayer.startRecorder();
      console.log('Recording started at' + uri);
      startTime.current = Date.now();
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        setElapsedTime(elapsed);

        if (elapsed >= 60) {
          stopRecording(); // 🔥 Automatically stop at 60 seconds
        }
      }, 1000);

    } catch (err) {
      console.warn(err);
    }
  };


  const stopRecording = async () => {
    setIsRecording(false);

    try {
      const uri = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setFilePath(uri);
      clearInterval(intervalRef.current);
      setIsRunning(false);

      console.log("🎙 Recording saved locally:", uri);

      // 🔥 CREATE LOCAL AUDIO MESSAGE
      const id = "msg-" + Date.now();
      const createdAt = new Date().toISOString();

      const localAudioMessage = {
        id,
        sender: me,
        receiver: partner,
        text: "Audio",
        imageUrl: "",
        videoUrl: "",
        audioUrl: uri, // ✅ LOCAL FILE PATH
        status: "pending", // IMPORTANT
        type: "private",
        createdAt,

        // UI compatibility
        _id: id,
        msgByUserId: me,
      };

      // 1️⃣ Save to SQLite
      await insertMessage(localAudioMessage);

      // 2️⃣ Show in UI instantly
      setMessages(prev => [...prev, localAudioMessage]);

      // 3️⃣ Try sending if online
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && socket.current?.connected;

      if (isOnline) {
        console.log("📡 Online → sending audio...");
        // sendWithAckrecordvoice(localAudioMessage);
        // sendWithAck(localAudioMessage);
      } else {
        console.log("📴 Offline → audio saved as pending");
      }

      setElapsedTime(0);
    } catch (err) {
      console.warn("Recording error:", err);
    }
  };

  const handleTyping = (text: string) => {
    setText(text);
    // Send typing event immediately
    socket.current.emit("typing", { from: me, to: partner });
    // Clear previous timeout
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    // Send stopTyping after 1.5 seconds of inactivity
    typingTimeout.current = setTimeout(() => {
      socket.current.emit("stopTyping", { from: me, to: partner });
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ChatHeaders
        type={type}
        userinfo={userinfo}
        typing={typing}
        onlineUserIds={onlineUserIds}
        partnerOnline={partnerOnline}
        partnerLastSeen={partnerLastSeen}
        onBackPress={() => navigation.goBack()}
        onMorePress={() => Alert.alert("More icon tapped")}
      />

      {/* Body */}
      <ScrollView
        style={{ flex: 1 }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          // If near top → load older messages
          if (y < 50) {
            loadMoreMessages();
          }
        }}
        scrollEventThrottle={16}
      >
        {/*   <TouchableOpacity onPress={deleteOlduserdata}>
          <Text>Delete</Text>
        </TouchableOpacity> */}
        {loadingMore && (
          <Text style={{ textAlign: "center", padding: 10 }}>
            Loading older messages...
          </Text>
        )}

        {messages.map((m, index) => {
          const myId = me?._id || me;
          const senderId = m.msgByUserId?._id || m.msgByUserId;
          const isMine = String(senderId) === String(myId);
          return (
            <View key={m._id || index}>
              {m.text ? (
                <TouchableOpacity
                  style={isMine ? styles.own : styles.other}
                  onLongPress={() => {
                    setSelectedMessage(m);
                    setMenuVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={isMine ? styles.textOwn : styles.textOther}>
                    {m.text}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: isMine ? "#fff" : "#000",
                        opacity: 0.7
                      }}
                    >
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                        : "Pending..."
                      }
                    </Text>

                    {/* STATUS TICK */}
                    {isMine && (
                      <Text style={{ fontSize: 10, color: "#fff", marginLeft: 4 }}>
                        {m.status === "pending"
                          ? "🕒"
                          : m.seen
                            ? "✓✓"
                            : m.status}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
        <View style={{ marginBottom: 100 }}></View>
      </ScrollView>
      {/* Footer */}
      {isRecording ? (
        <View style={styles.recording}>
          <View style={styles.bars}>
            <AnimatedRecordingBars />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setIsRecording(false)}>
              <Icon name="trash" size={30} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRecording(false)}>
              <Icon name="stop-circle" size={30} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => stopRecording()}>
              <Icon name="send" size={30} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <TouchableOpacity
            //onPress={() => setShowOptions((prev) => !prev)} 
            onPress={() => toggleAction('add')}>
            <Icon name="add" size={25} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            // onPress={() => setShowEmojioptions((prev) => !prev)} 
            onPress={() => toggleAction('emoji')}
          >
            <Icon name="happy-outline" size={20} color="blue" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            value={text}
            onBlur={() => socket.current.emit("seenMessages", { me, partner })}
            onChangeText={handleTyping}
          />
          <TouchableOpacity onPress={submit}>
            <Icon name="send" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // toggleAction('recording')
              startRecording()
              setShowOptions(false)
              setShowEmojioptions(false)
            }}

          >
            <Icon name="mic" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    marginTop: '50%',
    justifyContent: 'center',
    alignSelf: 'center',
    zIndex: 1000
  },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#ffffff',
    bottom: 42
  },
  iconcontent: {
    fontSize: 10, alignItems: 'center'
  },
  roundicon: {
    alignItems: 'center',
    backgroundColor: '#e1eafb', borderRadius: 50,
    justifyContent: 'center',
    width: 50, height: 50
  },

  optionsEmoji: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
    bottom: 42
  },
  recording: {
    padding: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center'
  },
  timer: { color: '#000', marginBottom: 10 },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  bar: {
    width: 5,
    height: Math.random() * 30 + 10,
    backgroundColor: '#ffffff',
    marginHorizontal: 2
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  own: {
    alignSelf: 'flex-end',
    backgroundColor: '#0084FF', // Messenger blue
    marginVertical: 4,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderTopRightRadius: 2, // Optional: sharp edge for own messages
    maxWidth: '75%',
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: '#E4E6EB', // Messenger gray
    marginVertical: 4,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderTopLeftRadius: 2, // Optional: sharp edge for other messages
    maxWidth: '75%',
  },
  textOwn: {
    color: '#fff',
    fontSize: 16,
  },
  textOther: {
    color: '#000',
    fontSize: 16,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 15,
    paddingBottom: 80, // To ensure it's not hidden behind footer
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  messageContainer: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  messageBubble: {
    padding: 4,
    borderRadius: 8,
    maxWidth: 320,
    alignSelf: 'flex-start',
  },
  sender: {
    alignSelf: 'flex-end',
    backgroundColor: '#ccfbf1', // Tailwind teal-100
    marginRight: 40,
  },
  receiver: {
    backgroundColor: '#ffffff',
    marginLeft: 40,
  },
  mediaContainer: {
    width: '100%',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: 200,
  },
  text: {
    paddingHorizontal: 8,
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  delete: { color: 'red', fontSize: 24 },
  stop: { color: 'yellow', fontSize: 24 },
  send: { color: 'white', fontSize: 24 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  table: {
    borderWidth: 1,
    borderColor: "#ddd",
    margin: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: {
    flex: 1,
    padding: 8,
    fontSize: 14,
  },
});

export default ChatDetails