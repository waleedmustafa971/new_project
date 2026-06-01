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
import { checkMessages, DeleteLocalmess, deleteOlddata, getPendingMessages, insertMessage, loadMessages, updateAudioUrl, updateImageUrl, updateMessageStatus } from '../../utils/dbService';
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
  const [typing, setTyping] = useState(false)
  /* time */
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef(null);
  const startTime = useRef(0);
  /* end time */
  const typingTimeout = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  
  //get conversion from online
  const getConversion = async (me: string, partner: string, type: string) => {
    /*   console.log('...logo...', base.BASE_URL + '/apis/getChatdetails')
      console.log('...me...', me)
      console.log('...partner...', partner)
      console.log('...convoId...', partner)
      console.log('...type...', type) */
    try {
      const response = await fetch(base.BASE_URL + '/apis/getChatdetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          me: me,
          partner: partner,
          type: type,
          convoId: partner
        }),
      });

      const data = await response.json();

      if (data?.messages) {
        setMessages(data.messages);
        //  console.log('✅ Messages fetched:', data.messages.length);
      } else {
        //console.log('⚠️ No messages in response:', data);
      }

    } catch (error) {
      //console.error('❌ Error fetching chat details:', error);
    } finally {
      setIsloading(false);
    }
  }

 // 🔥 LOAD LOCAL MESSAGES FIRST
  useEffect(() => {
    loadInitialMessages();
  }, [me, partner, type]);

  const checkData = async() => {
      setDatalist([])
      const local = await checkMessages(me, partner, type);
      setDatalist(local)
  }

  const loadInitialMessages = async () => {
    const local = await loadMessages(me, partner, type, PAGE_SIZE, 0);
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

    // Connection events
    socket.current.on("connect", () => {
      // console.log("✅ Socket connected:", socket.current.id);
    });

    socket.current.on("disconnect", (reason: any) => {
      //console.log("🔌 Socket disconnected:", reason);
    });

    socket.current.on("connect_error", (err: any) => {
      // console.log("❌ Socket connection error:", err.message);
    });

     socket.current.on("newMessages", async (data: any) => {
      Alert.alert('Receive Message')
      if (!data?.messages?.length) return;
      const last = data.messages[data.messages.length - 1];
      const realSender = String(last.msgByUserId);
      const formatted = {
        id: String(last._id),
        _id: String(last._id),
        sender: realSender,
        receiver: realSender === String(me) ? String(partner) : String(me),
        text: last.text || "",
        imageUrl: last.imageUrl || "",
        audioUrl: last.audioUrl || "",
        videoUrl: last.videoUrl || "",
        status: "sent",
        type: data.type || "private",
        createdAt: last.createdAt,
        msgByUserId: realSender,
        seen: Boolean(last.seen),
      };

      setMessages(prev => {
        const exists = prev.some(m => m._id === formatted._id);
        if (!exists) {
         // insertMessage(formatted); // ✅ FIX: insert only if new
          return [...prev, formatted];
        }
        return prev; // ✅ prevents triple insert
      });
    }); 

    // Typing listeners
    socket.current.on("typing", ({ from }: any) => {
      if (from === partner) setTyping(true);
    });

    socket.current.on("stopTyping", ({ from }: any) => {
      if (from === partner) setTyping(false);
    });

    // Get messages
    /*  const msgType = userinfo?.type;
     if (msgType === "group") {
       console.log('📣 Group chat load');
       setGroupid(partner);
       socket.current.emit("getMessages", { me, type: "group", convoId: partner });
     } else {
       setGroupid(null);
       socket.current.emit("getMessages", { me, partner, type: "private" });
       console.log('..private..message ...' + JSON.stringify(messages))
     }
     if (messages.length === 0) {
       //getConversion(me, partner, msgType) //msgType  type
     } */

    return () => {
      clearTimeout(timer);
      socket.current?.off("messages");
      socket.current?.off("newMessages");
      socket.current?.off("typing");
      socket.current?.off("stopTyping");
      socket.current?.disconnect();
    };
  }, [me, partner]);


  // Callback when emoji is selected in MyComponent
  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojioptions(false)
  };
 
 /*  useEffect(() => {
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
      Alert.alert("🔄 Syncing pending messages...");

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
  }; */

  const submit = async () => {
    if (!text.trim()) return;
    const id = Date.now().toString(); // ✅ FIX: string ID
    const createdAt = new Date().toISOString();
    console.log('first created ID', id)
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
    await insertMessage(message);

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
    console.log('..sendWithAck second ID ....', msg.id)
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

  const sendWithAckrecordvoice = async (msg: any) => {
    let audioUrl = msg.audioUrl;
    // If local file, upload first
    if (audioUrl.startsWith("file://")) {
      try {
        const uploadedUrl = await uploadAudio(audioUrl);
        if (!uploadedUrl) {
          console.warn("⚠️ Audio upload failed, keeping pending");
          return;
        }
        audioUrl = base.BASE_URL + '/uploads/' + uploadedUrl;
        // Update SQLite to store cloud URL
        await updateAudioUrl(msg.id, audioUrl);
      } catch (err) {
        console.error("Error uploading audio:", err);
        return;
      }
    }

    // Now send via socket
    const payload = {
      sender: msg.sender,
      receiver: msg.receiver,
      text: msg.text,
      audioUrl,
      imageUrl: msg.imageUrl,
      videoUrl: msg.videoUrl,
      type: msg.type,
      createdAt: msg.createdAt,
    };

    socket.current.emit("sendMessage", payload, async (ack) => {
      if (ack?.success) {
        // Mark message as sent locally
        await updateMessageStatus(msg.id, "sent");
        setMessages(prev =>
          prev.map(m =>
            m._id === msg.id ? { ...m, status: "sent", audioUrl } : m
          )
        );
      }
    });
  };

  const uploadAudio = async (uri: string): Promise<string | null> => {
    try {
      const mimeType = mime.getType(uri) || "audio/m4a";
      const fileName = uri.split("/").pop();
      const formData = new FormData();
      formData.append("file", { uri, type: mimeType, name: fileName });

      const response = await fetch(base.BASE_URL + "/apis/voice/addvoice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("Upload failed:", response.status);
        return null;
      }
      const data = await response.json();
      if (data.message === "File uploaded successfully") {
        console.log("☁ Uploaded:", data.url);
        return data.url;
      } else {
        console.warn("Upload did not succeed:", data.message);
        return null;
      }
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    }
  };

  const handleSeen = () => {
    socket.current?.emit("seenMessages", { me, partner });
    socket.current.emit("stopTyping", { to: partner })
  };

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
        sendWithAckrecordvoice(localAudioMessage);
        // sendWithAck(localAudioMessage);
      } else {
        console.log("📴 Offline → audio saved as pending");
      }

      setElapsedTime(0);
    } catch (err) {
      console.warn("Recording error:", err);
    }
  };

  const submitSound = async (uri: any) => {
    const userid = await AsyncStorage.getItem("username");
    console.log("..JSON..." + JSON.stringify(uri)); //imageurl 
    // setIsloading(true);
    if (!uri) {
      Alert.alert("No media selected", "Please pick a file to upload.");
      return;
    }
    const messagePayload = {
      sender: me,
      receiver: partner,
      text: 'Audio',
      imageUrl: "",
      videoUrl: "",
      audioUrl: uri
    };

    console.log("Sending message:", messagePayload);

    socket.current.emit("sendMessage", messagePayload);

    // Optimistically update messages on client
    setMessages((prev) => [
      ...prev,
      {
        _id: Date.now().toString(),
        text,
        msgByUserId: me,
        createdAt: new Date().toISOString(),
      },
    ]);

    setText("");
    // Delay fetching conversations to give server time to update
    setTimeout(() => {
      socket.current.emit("getConversations", me);
    }, 300); // adjust based on backend latency
  }

  const submitImage = async (uri) => {
    const userid = await AsyncStorage.getItem("username");
    console.log("..JSON..." + JSON.stringify(uri)); //imageurl 
    //  setIsloading(true);
    if (!uri) {
      Alert.alert("No media selected", "Please pick a file to upload.");
      return;
    }
    const messagePayload = {
      sender: me,
      receiver: partner,
      text: 'Image',
      imageUrl: uri,
      videoUrl: "",
      audioUrl: ""
    };

    console.log("Sending message:", messagePayload);

    socket.current.emit("sendMessage", messagePayload);

    // Optimistically update messages on client
    setMessages((prev) => [
      ...prev,
      {
        _id: Date.now().toString(),
        text,
        msgByUserId: me,
        createdAt: new Date().toISOString(),
      },
    ]);

    setText("");

    // Delay fetching conversations to give server time to update
    setTimeout(() => {
      socket.current.emit("getConversations", me);
    }, 300); // adjust based on backend latency

  }

  const handleTyping = (text: string) => {
    setText(text);
    socket.current.emit("typing", { to: partner });
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      socket.current.emit("stopTyping", { to: partner });
    }, 1500); // Send stopTyping if no input for 1.5 sec
  };

  useEffect(() => {
    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, []);

  const openCamera = () => {

  }

  const openGallery = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 1 },
      async (response) => {
        if (response.assets && response.assets.length > 0) {
          const selectedUri = response.assets[0].uri;
          await submitLocalImage(selectedUri);
          // Automatically upload pending image in background
          const pending = await getPendingMessages(); // or filter only images
          pending
            .filter(msg => msg.imageUrl && msg.status === "pending")
            .forEach(msg => uploadPendingImage(msg));
        }
      }
    );
  };

  const uploadPendingImage = async (msg: any) => {
    const mimeType = mime.getType(msg.imageUrl) || 'image/jpeg';
    const fileName = msg.imageUrl.split('/').pop();
    const formData = new FormData();
    formData.append('file', {
      uri: msg.imageUrl,
      type: mimeType,
      name: fileName,
    });

    try {
      const response = await fetch(base.BASE_URL + '/apis/voice/addimages', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.message === 'File uploaded successfully') {
        const uploadedUrl = data.url;

        // 1️⃣ Update SQLite with cloud URL
        await updateImageUrl(msg.id, uploadedUrl);
        // 2️⃣ Send to cloud socket
        const payload = { ...msg, imageUrl: uploadedUrl, status: "sent" };
        socket.current.emit("sendMessage", payload);

        // 3️⃣ Update UI
        setMessages(prev =>
          prev.map(m =>
            m._id === msg.id ? { ...m, status: "sent", imageUrl: uploadedUrl } : m
          )
        );
      } else {
        console.warn('Upload did not succeed:', data.message);
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
  };

  const submitLocalImage = async (uri: string) => {
    const id = "msg-" + Date.now();
    const createdAt = new Date().toISOString();
    const localMessage = {
      id,
      _id: id,
      convoId: partner,
      sender: me,
      receiver: partner,
      text: 'Image',
      imageUrl: uri, // store local file path
      audioUrl: "",
      videoUrl: "",
      status: "pending", // mark pending until uploaded
      type,
      createdAt,
      msgByUserId: me,
    };
    // Save in SQLite
    await insertMessage(localMessage);
    // Update UI
    setMessages(prev => [...prev, localMessage]);
  };

  const uploadImage = async (uri: any) => {
    setIsloading(true)
    //file:////data/user/0/com.messengeruae/cache/sound.mp4
    const mimeType = mime.getType(uri) || 'image/jpeg';
    // Determine File Name
    const fileName = uri.split('/').pop();
    // Prepare FormData
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: fileName,
    });
    try {
      const response = await fetch(
        base.BASE_URL + '/apis/voice/addimages',
        {
          method: 'POST',
          body: formData,
          // you can add headers here if needed
        }
      );

      // 1️⃣ Check HTTP status first
      if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        // You can throw here or handle it gracefully
        throw new Error(`HTTP ${response.status}`);
      }

      // 2️⃣ Parse JSON body
      const data = await response.json();

      // 3️⃣ Inspect your API’s JSON fields
      if (data.message === 'File uploaded successfully') {
        console.log('Uploaded URL:', data.url);
        // e.g. call submitSound with the URL from the server
        submitImage(data.url);
        setIsloading(false)
      } else {
        setIsloading(false)
        console.warn('Upload did not succeed:', data.message);
      }
    }
    catch (err) {
      setIsloading(false)
      console.error('Error uploading', err);
    }
  }

  const openFiles = () => {

  }
  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleReply = (message: any) => {
    console.log('Reply to:', message.text);
    handleCloseMenu();
  };

  const handleForward = (message: any) => {
    console.log('Forward message:', message.text);
    handleCloseMenu();
  };

  const handleRemove = (message: any) => {
    console.log('Remove message:', message.text);
    // You can trigger delete logic here
    handleCloseMenu();
  };
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
  const deleteOlduserdata = async () => {
    await deleteOlddata();
  }
  const DeleteLocalmessage = async (autoid: string) => {
    await DeleteLocalmess(autoid);
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ChatHeaders
        type={type}
        userinfo={userinfo}
        typing={typing}
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
        <TouchableOpacity onPress={deleteOlduserdata}>
          <Text>Delete</Text>
        </TouchableOpacity>
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
                    {m.text}-{m.status}-ID-{m.id}-IDS{m._id}
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
                        {m.status === "sent" ? (m.seen ? "✓✓" : "✓") : "🕒"}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* IMAGE MESSAGE */}
              {m?.imageUrl && (
                <View style={isMine ? styles.own : styles.other}>
                  <TouchableOpacity
                    onPress={() => {
                      setCurrentImage([{ url: m.imageUrl }]);
                      setIsVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: m.imageUrl }}
                      style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 5 }}
                    />
                  </TouchableOpacity>
                  {/* Add a timestamp below the image if it's not part of a text bubble */}
                  {!m.text && (
                    <Text style={{ fontSize: 9, color: isMine ? "#fff" : "#000", textAlign: 'right' }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
                    </Text>
                  )}
                </View>
              )}

              {/* AUDIO MESSAGE */}
              {m?.audioUrl && (
                <View style={isMine ? styles.own : styles.other}>
                  <VoicePlayer
                    url={m.audioUrl}
                    userimage={isMine ? userinfo?.me?.image : userinfo?.partner?.image}
                    me={me}
                    xpartner={m.msgByUserId}
                  />
                </View>
              )}
            </View>
          );
        })}

        {/* Rows this is for local testing */}
        <View>
          <Text>-----Me : {me} Partner : {partner}</Text>
        </View>
        {datalist?.map((item: any) => (
          <View key={item._id} style={styles.row}>
            <Text style={styles.cell}>XXXX{item.id}</Text>
            <Text style={styles.cell}>{item.text}</Text>
            <Text style={styles.cell}>S:{item.sender}</Text>
            <Text style={styles.cell}>R:{item.receiver}</Text>
            <Text style={styles.cell}>{item.audioUrl} {item.imageUrl}</Text>
            <Text
              style={[
                styles.cell,
                item.status === "pending" && { color: "orange" },
                item.status === "sent" && { color: "green" },
              ]}
            >
              {item.status}
            </Text>
            <TouchableOpacity onPress={() => {
              DeleteLocalmessage(item.id)
            }
            }>
              <Text>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ marginBottom: 100 }}></View>
      </ScrollView>

      {
        menuVisible ?
          <MessagePop
            visible={menuVisible}
            selectedMessage={selectedMessage}
            onClose={handleCloseMenu}
            onReply={() => handleReply(selectedMessage)}
            onForward={() => handleForward(selectedMessage)}
            onRemove={() => handleRemove(selectedMessage)}
          /> : null
      }


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
            onBlur={handleSeen}
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

      {showOptions && (
        <View style={styles.options}>
          <TouchableOpacity onPress={openCamera} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="camera" size={25} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openGallery} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="image" size={25} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openFiles} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="document-text" size={25} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openFiles} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="location-outline" size={25} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openFiles} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="call-outline" size={25} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}


      {showEmojioptions && (
        <View style={styles.optionsEmoji}>
          <EmojiComponent
            showEmojioptions={showEmojioptions}
            onSelectEmoji={handleSelectEmoji}
          />
        </View>
      )}
      <Modal visible={isVisible} transparent={true}>
        <ImageViewer
          imageUrls={currentImage}
          enableSwipeDown
          onSwipeDown={() => setIsVisible(false)}
          onClick={() => setIsVisible(false)}
        />
      </Modal>
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