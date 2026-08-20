import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar, Image,
  Alert, Animated, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, Keyboard,
  FlatList, Share
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
import mime from 'mime';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';
import MessagePop from './MessagePop';
import NetInfo from "@react-native-community/netinfo";
//import NetInfo from "@react-native-community/netinfo";
//import { addToQueue, getQueue, clearQueue } from "../../utils/offlineQueue";
import {
  checkMessages, deleteChathistory, DeleteDroptable, DeleteLocalmess, deleteOlddata,
  getPendingMessages, insertMessage, loadMessages,
  markDeliveredLocally, markMessagesSeenLocally,
  testGetdata, updateAudioUrl, updateImageUrl,
  updateMessageMongoId,
  updateMessageStatus
} from '../../utils/dbService';
import { PermissionsAndroid, Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import ChatHeaders from './ChatHeaders';
import ChatMessageBody from './ChatMessageBody';
import RNFS from "react-native-fs";
import { launchCamera } from 'react-native-image-picker';
import ShareContactModal from './modal/ShareContactModal';
//import FileSelector from 'react-native-file-selector';
//import * as DocumentPicker from 'expo-document-picker';
//import DocumentPicker from 'react-native-document-picker';
//import { pick, types, isCancel } from "react-native-document-picker";
//import DocumentPicker from 'react-native-document-picker';
//import FilePickerManager from 'react-native-file-picker';
import LocationPickerModal from './modal/LocationPickerModal';
const GroupUserImage = require("../../assets/round.png"); // Adjust path as needed
//import EmojiSelector, { Categories } from "react-native-emoji-selector";
const audioRecorderPlayer = new AudioRecorderPlayer();
import { pick } from '@react-native-documents/picker';
type ChatdetailsRouteProp = RouteProp<RootStackParamList, 'ChatDetails'>;
import EmojiPicker from 'rn-emoji-keyboard';
import EmojiSelector from 'react-native-emoji-selector';
import ForwardBar from './ForwardBar';
import ForwardContactModal from './modal/ForwardContactModal';
import uuid from 'react-native-uuid';
import { useSocket } from '../context/SocketContext';

interface Message {
  id?: string;
  mongoId?: string | null;
  convoId?: string;

  sender?: string;
  receiver?: string;

  text: string;
  createdAt: string;
  msgByUserId: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  status?: "pending" | "sent" | "delivered" | "seen";
  type?: string; //"private" | "group";
  messagetype?: "text" | "image" | "video" | "audio" | "file";
  replyTo?: string | null;
  forwardedFrom?: string | null;
  isForwarded?: boolean;
  groupid?: string | null;
}

const ChatDetails = () => {

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const route = useRoute<ChatdetailsRouteProp>();
  const { me, partner, userinfo, type } = route.params; //partner is used for group id or partner id
  console.log('chatdetails group' + '..me..' + me + '---partner...' + partner + '...type...' + type +'--userinfo-'+ JSON.stringify(userinfo))
  //console.log('chatdetails' + '..me..' + me + '---partner...' + partner + '....' + JSON.stringify(userinfo) + '..type....' + type)
  const [messages, setMessages] = useState<any[]>([]);
  const [datalist, setDatalist] = useState<any[]>([]);
  const [text, setText] = useState(""); // 
  const [showSharecontact, setShowSharecontact] = useState(false); // setShowSharecontact
  const [menuVisible, setMenuVisible] = useState(false);
  const { socket } = useSocket(); //global socket for apps
  const flatListRef = useRef(null);
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
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);
  const [showSendbutton, setShowSendbutton] = useState(false)
  const [showAudiobutton, setShowAudiobutton] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardModal, setForwardModal] = useState(false)

  const mergeMessages = (prev: any[], incoming: any[]) => {
    const map = new Map();
    [...prev, ...incoming].forEach(msg => {
      const key = String(msg.id);
      map.set(key, msg);
    });
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    );
  };


  const shareMessage = async (forwardMessage: any) => {
    try {
      console.log("share message", forwardMessage);

      let shareOptions: any = {};

      // TEXT
      if (forwardMessage?.text) {
        shareOptions.message = forwardMessage.text;
      }

      // IMAGE
      if (forwardMessage?.imageUrl && forwardMessage.imageUrl !== "") {
        shareOptions.url = forwardMessage.imageUrl;
        shareOptions.type = "image/*";
      }

      // AUDIO
      if (forwardMessage?.audioUrl && forwardMessage.audioUrl !== "") {
        shareOptions.url = forwardMessage.audioUrl;
        shareOptions.type = "audio/*";
      }

      // VIDEO
      if (forwardMessage?.videoUrl && forwardMessage.videoUrl !== "") {
        shareOptions.url = forwardMessage.videoUrl;
        shareOptions.type = "video/*";
      }

      // fallback so share always opens
      if (!shareOptions.message && !shareOptions.url) {
        shareOptions.message = "Shared from chat";
      }

      console.log("Share options:", shareOptions);

      const result = await Share.share({
        message: forwardMessage?.text || "Shared from chat",
      });
      console.log(result);

    } catch (error) {
      console.log("Share error", error);
    }
  };

  const shareMessage_working = async (forwardMessage: any) => {
    try {

      const result = await Share.share({
        message: forwardMessage?.text || "Shared from chat",
      });

      console.log(result);

    } catch (error) {
      console.log("Share error", error);
    }
  };

  // 1. Function to push scroll to the absolute bottom
  const scrollToBottom = () => {
    if (flatListRef.current) {
      // animated: true makes it "slide" up
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };
  // 🔥 LOAD LOCAL MESSAGES FIRST
  useEffect(() => {
    loadInitialMessages();
    syncPendingMessagesFromCloud()
  }, [me, partner, type]);

  //if user is offline it will search receiver message from online cloud
  const syncPendingMessagesFromCloud = async () => {
    const response = await fetch(`${base.BASE_URL}/apis/mobile-not-get-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        me,
        partner,
        type,
        convoId: partner
      })
    });
    const data = await response.json();
    if (!data?.messages?.length) return;
    const formatted = data.messages.map((msg: any) => ({
      id: String(msg._id), // PRIMARY KEY
      mongoId: String(msg._id),
      sender: String(msg.msgByUserId),
      receiver: partner,
      text: msg.text || "",
      imageUrl: msg.imageUrl || "",
      audioUrl: msg.audioUrl || "",
      videoUrl: msg.videoUrl || "",
      status: "sent",
      type: msg.type || "private",
      createdAt: msg.createdAt,
      messagetype: msg.messagetype,
      msgByUserId: String(msg.msgByUserId),
      seen: msg.seenBy?.includes(me)
    }));
    for (const m of formatted) {
      await insertMessage(m);
    }
    setMessages(prev => mergeMessages(prev, formatted));
    formatted.forEach((msg: any) => {
      socket?.emit("messageDelivered", {
        messageId: msg.mongoId,
        userId: me
      });
    });
  };

  //load local storage sqlite message  
  const loadInitialMessages = async () => {
    const local = await loadMessages(me, partner, type, PAGE_SIZE, 0);
    const formatted = local.map((m: any) => ({
      id: String(m.mongoId || m.id),
      mongoId: m.mongoId,
      sender: String(m.sender),
      receiver: String(m.receiver),
      text: m.text || "",
      imageUrl: m.imageUrl || "",
      audioUrl: m.audioUrl || "",
      videoUrl: m.videoUrl || "",
      status: m.status || "sent",
      type: m.type,
      createdAt: m.createdAt,
      messagetype: m.messagetype,
      msgByUserId: m.msgByUserId,
      seen: Boolean(m.seen)
    }));
    setMessages(prev => mergeMessages(prev, formatted));
  };

  //load local storage sqlite message with pagination
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const offset = page * PAGE_SIZE;
    const older = await loadMessages(me, partner, type, PAGE_SIZE, offset);
    if (older.length < PAGE_SIZE) setHasMore(false);
    const formatted = older.reverse().map((m: any) => ({
      id: String(m.mongoId || m.id), // PRIMARY KEY
      mongoId: m.mongoId || null,
      sender: String(m.sender),
      receiver: String(m.receiver),
      text: m.text || "",
      imageUrl: m.imageUrl || "",
      audioUrl: m.audioUrl || "",
      videoUrl: m.videoUrl || "",
      status: m.status || "sent",
      type: m.type || type,
      createdAt: m.createdAt,
      messagetype: m.messagetype,
      msgByUserId: String(m.msgByUserId || m.sender),
      seen: Boolean(m.seen)
    }));
    // ✅ SAFE MERGE
    setMessages(prev => mergeMessages(prev, formatted));
    setPage(prev => prev + 1);
    setLoadingMore(false);
  };

  useEffect(() => {
    //this making using seen message
    if (!socket || !me || !partner) return;
    // console.log("📤 Emitting seenMessages");
    socket?.emit("seenMessages", { me, partner });
  }, [messages.length]);

  useEffect(() => {
    if (!me || !partner) {
      console.log('❌ Skipping socket init: missing values', { me, partner });
      return;
    }
    console.log('🟡 Initializing socket...');
    if (!socket) return;

    socket.on("receiveMessage", (data: any) => {
      if (!data?.messages) return;
      const incoming = Array.isArray(data.messages)
        ? data.messages
        : [data.messages];
      const formatted = incoming.map((msg: any) => ({
        id: String(msg._id), // PRIMARY KEY
        mongoId: String(msg._id),
        sender: String(msg.msgByUserId),
        receiver: me,
        text: msg.text || "",
        imageUrl: msg.imageUrl || "",
        audioUrl: msg.audioUrl || "",
        videoUrl: msg.videoUrl || "",
        status: "delivered",
        type: data.type || "private",
        createdAt: msg.createdAt,
        messagetype: msg.messagetype,
        msgByUserId: String(msg.msgByUserId),
        seen: Boolean(msg.seen)
      }));
      setMessages(prev => mergeMessages(prev, formatted));
      incoming.forEach(msg => {
        socket.emit("messageDelivered", {
          messageId: msg._id,
          userId: me
        });
      });
    });

    // ✅🔥 SEEN LISTENER (MOVE HERE)
    socket?.on("messagesSeen", ({ messageIds }: any) => {
      console.log("🔥 Seen update received", messageIds);
      // Update UI
      /*  setMessages(prev =>
         prev.map(m =>
           messageIds.includes(m._id)
             ? { ...m, seen: true }
             : m
         )
       ); */
      // Update SQLite
      // markMessagesSeenLocally(messageIds);
    });
    //check online users
    socket?.on("onlineUsers", (users: any) => {
      console.log('online users.', users)
      setOnlineUserIds(users);
    });
    //checking typing message
    const handleTyping = ({ from }: { from: string }) => {
      if (from === partner) setTyping(true);
    };
    const handleStopTyping = ({ from }: { from: string }) => {
      if (from === partner) setTyping(false);
    };
    socket?.on("typing", handleTyping);
    socket?.on("stopTyping", handleStopTyping);
    //end check typing and stoping
    return () => {
      // clearTimeout(timer);
      socket?.off("messages");
      socket?.off("newMessages");
      socket?.off("typing");
      socket?.off("stopTyping");
      socket?.off("messagesSeen");
      socket?.off("typing", handleTyping);
      socket?.off("stopTyping", handleStopTyping);
      // socket?.disconnect();
    };
  }, [me, partner]);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("🟢 Socket connected → syncing pending");
      //off for test syncPendingMessages();
    });

    return () => {
      socket?.off("connect");
    };
  }, []);

  const pushingPendingimage = async (imageUrl: any) => {
    console.log('pushingPendingimage start...', JSON.stringify(imageUrl));
    /* 
    pushingPendingimage start... "\"[\\\"file:///data/user/0/com.messengeruae/cache/rn_image_picker_lib_temp_5a04e024-377e-4f7a-bb19-3d8f3014dab7.webp\\\",\\\"file:///data/user/0/com.messengeruae/cache/rn_image_picker_lib_temp_8c43a89a-dce4-435f-bbcd-5fc538964a0c.webp\\\"]\""
    */
    const formData = new FormData();
    const uris = typeof imageUrl === 'string'
      ? JSON.parse(imageUrl)
      : imageUrl;

    uris.forEach((uri: string, index: number) => {
      const fileName = uri.split('/').pop();
      const mimeType = mime.getType(uri) || 'image/jpeg';

      formData.append('files', {
        uri: uri,
        type: mimeType,
        name: fileName || `image_${index}.jpg`,
      } as any);
    });

    try {
      const response = await fetch(
        base.BASE_URL + '/apis/voice/addimages',
        {
          method: 'POST',
          body: formData,
          // ❌ REMOVE HEADERS COMPLETELY
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      return data.data; // ✅ correct field
    } catch (err) {
      console.error('Multi-upload error:', err);
    }
  };

  const uploadVoiceFile = async (audioUri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/mp4", // adjust if needed
      name: "voice.mp4",
    } as any);
    const response = await fetch(base.BASE_URL + "/apis/voice/addvoice", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }
    return data.url; // ✅ return server URL
  };

  const senPending = async () => {
    syncPendingMessages();
  }

  //this function will push when sender send message offline it will sender when 
  //internet is arrive
  const syncPendingMessages = async () => {
    try {
      //   Alert.alert("🔄 Syncing pending messages...");
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && socket?.connected;
      if (!isOnline) return;
      const pending = await getPendingMessages();
      if (!pending.length) return;
      console.log('...offline message pushing to user...', JSON.stringify(pending))

      for (const msg of pending) {
        let audioUrl = msg.audioUrl;
        let imageUrl = msg.imageUrl;
        // console.log('audio local path ',msg.audioUrl) // why its showing console undefine
        console.log('imageUrl local path ', msg.imageUrl) // why its showing console undefine
        // ✅ If audio message, upload first
        if (msg.messagetype === "audio") {
          try {
            //file://///
            audioUrl = await uploadVoiceFile(msg.audioUrl);
            console.log("✅ Audio uploaded:", audioUrl);
          } catch (error) {
            console.log("❌ Upload failed, skipping message");
            continue; // skip this message
          }
        }

        if (msg.messagetype === "image") {
          try {
            const uploadResponse = await pushingPendingimage(msg.imageUrl);
            imageUrl = uploadResponse.map((file: any) => base.BASE_URL + file.url);
            console.log("✅ Clean imageUrl array:", imageUrl);
          } catch (error) {
            console.log("❌ Upload failed, skipping message");
            continue; // skip this message
          }
        }
        const payload = {
          clientMessageId: String(msg.id),
          sender: msg.sender,
          receiver: msg.receiver,
          text: msg.text,
          imageUrl: imageUrl,
          videoUrl: msg.videoUrl,
          audioUrl: audioUrl, // ✅ server URL now
          type: msg.type,
          createdAt: msg.createdAt,
          messagetype: msg.messagetype
        };
        socket.emit("sendMessage", payload, async (ack: any) => {
          if (!ack?.success) return;
          await updateMessageStatus(msg.id, "sent");
          await updateMessageMongoId(msg.id, ack.mongoId);
          setMessages(prev =>
            prev.map(m =>
              m.id === msg.id
                ? { ...m, status: "sent", mongoId: ack.mongoId }
                : m
            )
          );
        });
      }
      console.log("✅ Sync complete");
    } catch (err) {
      console.error("❌ Sync error:", err);
    }
  };

  const submit = async () => {
    if (!text.trim()) return;
    const clientMessageId = String(uuid.v4());
    const createdAt = new Date().toISOString();
    console.log('group ID : ', userinfo?.group?._id)

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
      type: type,
      createdAt,
      msgByUserId: me,
      messagetype: 'text',
      replyTo: replyMessage ? replyMessage.id : null,
      forwardedFrom: forwardMessage ? forwardMessage.id : null,
      isForwarded: !!forwardMessage,
      groupid: userinfo?.group?._id || null
    };

    // 1️⃣ Save locally
    await insertMessage(message);
    setMessages(prev => mergeMessages(prev, [message]));
    //old  setMessages(prev => [...prev, message]);
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
  ///update socket if online
  const sendWithAck = (msg: Message) => {
    //console.log('socket', socket)
    if (!socket) {
      console.log("Socket instance missing");
      return;
    }
    /*       
    console.log("Socket connected:", socket.connected);
    console.log("Socket id:", socket.id);
     */
    if (!socket) return;
    const payload = {
      id: msg.id,
      groupId: msg.groupid,
      clientMessageId: msg.id,
      convoId: msg.convoId,
      sender: msg.sender,
      receiver: msg.receiver,
      text: msg.text,
      type: msg.type,
      messagetype: msg.messagetype,
      createdAt: msg.createdAt,
      replyTo: msg.replyTo,
      forwardedFrom: msg.forwardedFrom,
      isForwarded: msg.isForwarded
    };
    // console.log('third ID : ', msg.id)

    socket.emit("sendMessage", payload, async (ack: any) => {
      // console.log("sendMessage Socket connected:", socket.connected);
      //  console.log("Socket id:", socket.id);
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

  const deleteHistory = async () => {
    setDatalist([])
    // await deleteOlddata();
    const data = await deleteChathistory();
    console.log('data......', data)
    //  setDatalist(data)
  }
  const NewScreen = async () => {
    navigation.navigate("ChatDetailsTest", {
      me: me, partner: partner, userinfo: userinfo, type: type
    })
  }
  const dropTable = async () => {
    try {
      setDatalist([]);
      const data = await DeleteDroptable();
      console.log("data......", data);
      if (data?.success) {
        console.log("✅ Tables deleted successfully");
      } else {
        console.log("❌ Failed:", data?.message);
      }

    } catch (error) {
      console.log("❌ Error dropping tables:", error);
    }
  };

  const ChatHistory = async () => {
    setDatalist([])

    const data = await testGetdata();
    setDatalist(data)
  }
  const DeleteLocalmessage = async (autoid: string) => {
    await DeleteLocalmess(autoid);
    setDatalist([])
    // await deleteOlddata();
    const data = await testGetdata();
    setDatalist(data)
  }

  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.8,
      saveToPhotos: false,
    };
    launchCamera(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
        return;
      }
      if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Camera error', response.errorMessage || 'Could not take that photo.');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        /*
          Save it, then push it — the second half was missing.

          submitLocalImages only writes the row to SQLite with status "pending";
          syncPendingMessages is what uploads the file and emits the message.
          The gallery path called both, the camera path called only the first,
          so a photo taken with the camera was stored on the device and never
          sent. It looked like the camera was broken when the send step simply
          was not there.
        */
        await submitLocalImages(response.assets);
        const net = await NetInfo.fetch();
        if (!net.isConnected) return; // stays pending; the sync loop picks it up
        syncPendingMessages();
      }
    });
  };

  const openGallery = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 10 },
      async (response) => {
        if (response.assets && response.assets.length > 0) {
          // Pass the entire array of assets to the local store
          await submitLocalImages(response.assets);
          //check internet connect if internet is aviable
          const net = await NetInfo.fetch();
          const isOnline = net.isConnected;
          if (!isOnline) return;
          syncPendingMessages();
        }
      }
    );
  };

  const submitLocalImages_old = async (assets: any) => {
    //const id = Date.now();
    const id = String(uuid.v4());
    const createdAt = new Date().toISOString();
    // Create an array of local URIs
    const localUris = assets.map(asset => asset.uri);
    console.log("..local..image...read...", localUris);

    const localMessage = {
      id,
      _id: id,
      convoId: `${me}_${partner}`, // ✅ FIX
      sender: me,
      receiver: partner,
      text,
      imageUrl: JSON.stringify(localUris),
      audioUrl: "",
      videoUrl: "",
      status: "pending",
      type,
      createdAt,
      msgByUserId: me,
      messagetype: 'image',
      // ✅ Reply Support
      replyTo: replyMessage ? replyMessage.id : null,
      // ✅ Forward Support
      forwardedFrom: forwardMessage ? forwardMessage.id : null,
      isForwarded: forwardMessage ? true : false

    };
    // console.log('....localMessage..image to check.....', localMessage)
    const datasave = await insertMessage(localMessage);
    console.log('....local image saved.....', datasave)
    // Update UI with the local object
    setMessages(prev => [...prev, { ...localMessage, imageUrl: localUris }]);
  };

  const submitLocalImages = async (assets: any[]) => {

    const id = String(uuid.v4());
    const createdAt = new Date().toISOString();

    const localUris = assets.map(a => a.uri);

    const localMessage = {
      id,
      mongoId: null,
      convoId: `${me}_${partner}`,
      sender: me,
      receiver: partner,
      text: "",
      imageUrl: localUris,   // UI format
      audioUrl: "",
      videoUrl: "",
      status: "pending",
      type,
      createdAt,
      msgByUserId: me,
      messagetype: "image",
      replyTo: replyMessage ? replyMessage.id : null,
      forwardedFrom: forwardMessage ? forwardMessage.id : null,
      isForwarded: !!forwardMessage
    };

    await insertMessage({
      ...localMessage,
      imageUrl: JSON.stringify(localUris) // DB format
    });

    setMessages(prev => mergeMessages(prev, [localMessage]));
  };

  const uploadPendingImages = async (msg: any) => {
    console.log('uploadPendingImages start... ', msg)
    const formData = new FormData();
    const uris = typeof msg.imageUrls === 'string' ? JSON.parse(msg.imageUrl) : msg.imageUrl;

    // Append multiple files to the same key 'files'
    uris.forEach((uri, index) => {
      const fileName = uri.split('/').pop();
      const mimeType = mime.getType(uri) || 'image/jpeg';
      formData.append('files', {
        uri: uri,
        type: mimeType,
        name: fileName || `image_${index}.jpg`,
      });
    });

    try {
      const response = await fetch(base.BASE_URL + '/apis/voice/addimages', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();
      console.log('....pending data.....', JSON.stringify(data))

      if (response.ok && data.url) {
        const cloudUrls = data.url; // Array of URLs from server
        console.log('cloudUrls....', cloudUrls)
        // 1. Update SQLite (store as JSON string)
        await updateImageUrl(msg.id, JSON.stringify(cloudUrls));

        // 2. Emit via Socket
        const payload = { ...msg, imageUrls: cloudUrls, status: "sent" };
        socket?.emit("sendMessage", payload);

        // 3. Update UI
        setMessages(prev =>
          prev.map(m => m._id === msg.id ? { ...m, status: "sent", imageUrls: cloudUrls } : m)
        );
        console.log('...pending image ...', JSON.stringify(payload))
      }
    } catch (err) {
      console.error('Multi-upload error:', err);
    }
  };

  const toggleAction = (action: "add" | "emoji" | "recording") => {
    if (action === "add") {
      Keyboard.dismiss();
      setShowOptions((prev) => !prev);
      setShowEmojioptions(false);
      setIsRecording(false);
    } else if (action === "emoji") {
      Keyboard.dismiss(); // hide system keyboard
      setShowEmojioptions((prev) => !prev);
      setShowOptions(false);
      setIsRecording(false);
    } else if (action === "recording") {
      startRecording();
      setShowOptions(false);
      setShowEmojioptions(false);
    }
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
    const id = String(uuid.v4());
    const createdAt = new Date().toISOString();
    const localAudioMessage = {
      id,                     // PRIMARY KEY
      mongoId: null,
      sender: me,
      receiver: partner,
      text: "",
      imageUrl: "",
      videoUrl: "",
      audioUrl: uri,          // LOCAL FILE PATH
      status: "pending",
      type: "private",
      messagetype: "audio",
      createdAt,
      msgByUserId: me
    };
    // 1️⃣ Save to SQLite
    await insertMessage(localAudioMessage);
    console.log("🎙 Saved locally:", localAudioMessage);
    // 2️⃣ Update UI immediately
    setMessages(prev => mergeMessages(prev, [localAudioMessage]));
    // scroll chat if you use it
    setTimeout(scrollToBottom, 100);
    // 3️⃣ Check network
    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && socket?.connected;
    if (isOnline) {
      console.log("📡 Online → sending audio");
      // send this specific message
      syncPendingMessages();
    } else {
      console.log("📴 Offline → audio pending");
    }
    setElapsedTime(0);
  } catch (err) {
    console.warn("Recording error:", err);
  }
  };
  const openFiles = async () => {
    try {
      const result = await pick({
        type: ['*/*'], // allow all file types
      });
      console.log("Selected file:", result);
    } catch (err) {
      console.log("File pick cancelled or error:", err);
    }
  };

  const submitLocalFiles = async (files: any) => {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const localFiles = files.map(f => ({
      uri: f.uri,
      name: f.name,
      type: f.type,
      size: f.size
    }));

    const message = {
      id,
      _id: id,
      convoId: `${me}_${partner}`,
      sender: me,
      receiver: partner,
      text: "", // optional caption
      fileUrl: JSON.stringify(localFiles),
      imageUrl: "",
      audioUrl: "",
      videoUrl: "",
      status: "pending",
      type: "file",
      createdAt,
      msgByUserId: me,
      messagetype: "file"
    };

    await insertMessage(message);

    setMessages(prev => [...prev, message]);

    // online check
    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && socket?.connected;
    if (isOnline) {
      sendWithAck(message);
    }

    setTimeout(() => scrollToBottom(), 100);
  };

  const handleTyping = (text: string) => {
    // setShowAudiobutton(false)
    //if text is more than 1 character it will be  setShowAudiobutton(true)
    setText(text);
    // Show audio button if text length > 1
    if (text.length > 1) {
      setShowAudiobutton(false);
      setShowSendbutton(true)
    } else {
      setShowAudiobutton(true);
      setShowSendbutton(false)
    }
    // Send typing event immediately
    socket?.emit("typing", { from: me, to: partner });
    // Clear previous timeout
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    // Send stopTyping after 1.5 seconds of inactivity
    typingTimeout.current = setTimeout(() => {
      socket?.emit("stopTyping", { from: me, to: partner });
    }, 1500);
  };

  // Callback when emoji is selected in MyComponent
  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojioptions(false)
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const myId = me?.id || me;
      const senderId = item.msgByUserId?.id || item.msgByUserId;
      const isMine = String(senderId) === String(myId);

      return (
        <ChatMessageBody
          key={item.id}  // ✅ must be stable
          item={item}
          me={me}
          isMine={isMine}
          userinfo={userinfo}
          onLongPress={(msg: any) => {
            setSelectedMessage(msg);
            setMenuVisible(true);
          }}
        />
      );
    },
    [me]
  );
  {/* openLocation, openContact */ }

  const openLocation = async () => {
    //send current location live location
    setShowLocationModal(true)
  }
  const openContact = async () => {
    ///share phone contact from mobile
    setShowSharecontact(true)
  }
  const handleSelectedContactforward = async (contact: any) => {
    console.log('....send forware message no ........', JSON.stringify(contact));

  }

  const handleSelectedContact = async (contact: any) => {
    console.log('....contact no ........', JSON.stringify(contact));
    //  Alert.alert(`${contact.name}_${contact.phone}`)
    /* ....contact no ........ {"name":"Hasan","phone":"282724445252","thumbnail":""}*/
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const message = {
      id,
      _id: id,
      convoId: `${me}_${partner}`,
      sender: me,
      receiver: partner,
      text: JSON.stringify([contact]),
      imageUrl: "",
      audioUrl: "",
      videoUrl: "",
      status: "pending",
      type: "private",
      createdAt,
      msgByUserId: me,
      messagetype: "contact"
    };
    await insertMessage(message);
    // 2️⃣ Update UI instantly
    setMessages(prev => {
      if (prev.some(m => m._id === message._id)) return prev; // ✅ FIX dedupe
      return [...prev, message];
    });

    setShowSharecontact(false);
    // 3️⃣ Online check
    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && socket?.connected;
    if (!isOnline) {
      console.log("📴 Offline → stays pending");
      return;
    }
    sendWithAck(message);
    setTimeout(() => {
      scrollToBottom();
    }, 100);

  };

  /*
    Share a pinned location.

    The coordinates were concatenated onto a string — `"📍 Shared Location" +
    location` — which stringifies the object to "[object Object]", so whatever
    was sent could never be read back as a place. The row also omitted
    imageUrl/audioUrl/videoUrl/type, and was neither awaited nor sent: it went
    into SQLite and stopped there, so the other person never received it.

    Coordinates travel as JSON in `text`, the way the contact type already does,
    so the renderer has something structured to work with.
  */
  const handleLocationSelected = async (location: any) => {
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert("No location picked", "Drop a pin on the map first.");
      return;
    }

    const id = Date.now().toString();
    const message = {
      id,
      _id: id,
      convoId: `${me}_${partner}`,
      sender: me,
      receiver: partner,
      text: JSON.stringify({ latitude: lat, longitude: lng }),
      imageUrl: "",
      audioUrl: "",
      videoUrl: "",
      status: "pending",
      type: "private",
      createdAt: new Date().toISOString(),
      msgByUserId: me,
      messagetype: "location",
    };

    await insertMessage(message);
    setMessages(prev => (prev.some(m => m._id === message._id) ? prev : [...prev, message]));
    setShowLocationModal(false);

    const net = await NetInfo.fetch();
    if (!(net.isConnected && socket?.connected)) {
      console.log("📴 Offline → location stays pending");
      return;
    }
    sendWithAck(message);
    setTimeout(() => scrollToBottom(), 100);
  };

  const onEmojiSelected = (emoji: string) => {
    setText(emoji.emoji)
    //setMessages(prev => prev + emoji.emoji);
    setShowEmojioptions(false)
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleReply = (message: any) => {
    console.log('Reply to:', message.text);
    console.log('Reply to:', message);
    setReplyMessage(message)
    handleCloseMenu();
  };

  const handleForward = (message: any) => {
    console.log('Forward message:', message.text);
    setForwardMessage(message);
    handleCloseMenu();
  };

  const handleRemove = (message: any) => {
    console.log('Remove message:', message.text);
    // You can trigger delete logic here
    handleCloseMenu();
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ChatHeaders
          type={type}
          userinfo={userinfo}
          typing={typing}
         /*  onlineUserIds={onlineUserIds} */
          partnerOnline={partnerOnline}
          partnerLastSeen={partnerLastSeen}
          onBackPress={() => navigation.goBack()}
          onMorePress={() => Alert.alert("More icon tapped")}
        />
        <View style={{
          padding: 10, flexDirection: 'row', justifyContent: 'space-between'
        }}>
          <TouchableOpacity onPress={ChatHistory}>
            <Text>Chat History</Text>
          </TouchableOpacity>

          {/* deleteHistory */}

          <TouchableOpacity onPress={deleteHistory}>
            <Text>Delete History</Text>
          </TouchableOpacity>


          <TouchableOpacity onPress={dropTable}>
            <Text>Drop Table</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={NewScreen}>
            <Text>NewScreen</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={senPending}>
            <Text>send pending data</Text>
          </TouchableOpacity>
        </View>


        {/* Body */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id} // ✅ unique key
          renderItem={renderItem}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.2}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator size="small" style={{ margin: 10 }} />
          ) : null}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          contentContainerStyle={{ paddingVertical: 80 }}
          removeClippedSubviews={false} // 🚫 safer for dynamic messages
          // Only scroll when new message is added
          onContentSizeChange={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />

        {/*  <View>
          <Text>-----Me : {me} Partner : {partner}</Text>
        </View>
        <ScrollView style={{ width: '100%', padding: 10 }}>
          {datalist?.map((item: any) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.cell}>
                   {item?.isForwarded} -forward- {item?.text}
                - replyTo {item.replyTo}
                - status - {item.status}
                - id - {item.id}
                - mongoId - {item.mongoId}
                - status - {item.status}
                - m - {item.text}
              </Text>
              <TouchableOpacity onPress={() => {
                DeleteLocalmessage(item.id)
              }
              }>
                <Text>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <View style={{ marginBottom: 100 }}></View> */}

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
          <>
            {replyMessage && (
              <View style={styles.footerReplyContainer}>
                <View style={styles.replyBox}>

                  <View style={styles.replyIndicator} />

                  <View style={styles.replyContent}>
                    <Text style={styles.replyName}>
                      {replyMessage.sender === me ? "You" : replyMessage.senderName}
                    </Text>

                    <Text style={styles.replyText} numberOfLines={1}>
                      {replyMessage.text || "Media"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeReply}
                    onPress={() => setReplyMessage(null)}
                  >
                    <Text style={{ fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>

                </View>
              </View>
            )}
            {forwardMessage && (
              <ForwardBar
                forwardMessage={forwardMessage}
                onShare={shareMessage}
                // onClose={setForwardMessage(null)}
                onClose={() => setForwardMessage(null)}
                onForward={() => {
                  // Alert.alert("DDDDDD")
                  setForwardModal(true)
                }
                }
              />
            )}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => toggleAction('add')}>
                <Icon name="add" size={25} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleAction('emoji')}
              >
                <Icon name="happy-outline" size={20} color="blue" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message"
                placeholderTextColor="#999"   // 👈 Change color here
                value={text}
                multiline
                onFocus={() => {
                  setShowOptions(false)

                  //  setShowAudiobutton(false)
                  setShowEmojioptions(false)
                }}   // 👈 Add this
                onBlur={() => socket?.emit("seenMessages", { me, partner })}
                onChangeText={handleTyping}
              />
              {

                showSendbutton ? <TouchableOpacity onPress={submit}>
                  <Icon name="send" size={20} color="#007AFF" />
                </TouchableOpacity> : null

              }
              {
                showAudiobutton ?
                  <TouchableOpacity
                    onPress={() => {
                      startRecording()
                      setShowOptions(false)
                      setShowEmojioptions(false)
                    }}
                  >
                    <Icon name="mic" size={20} color="#007AFF" />
                  </TouchableOpacity> : null

              }

            </View>
          </>
        )}
      </View>

      {showOptions && (
        <View style={styles.options}>
          <TouchableOpacity onPress={openCamera} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="camera" size={17} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openGallery} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="image" size={17} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openFiles} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="document-text" size={17} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openLocation} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="location-outline" size={17} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Location</Text>
          </TouchableOpacity>
          {/* openLocation, openContact */}
          <TouchableOpacity onPress={openContact} style={styles.iconcontent}>
            <View style={styles.roundicon}>
              <Icon name="call-outline" size={17} color="#007AFF" />
            </View>
            <Text style={{ fontSize: 11 }}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Emoji Picker BELOW footer */}
      {showEmojioptions && (
        <EmojiPicker
          open={showEmojioptions}
          onClose={() => setShowEmojioptions(false)}
          onEmojiSelected={onEmojiSelected}
          enableSearchBar={true}
          height={300}   // important: makes it inline
          categoryPosition="top"
        />
      )}

      {
        showSharecontact ?
          <>
            <ShareContactModal
              visible={showSharecontact}
              onClose={() => setShowSharecontact(false)}
              onSelectContact={handleSelectedContact}
              apiUrl={base.BASE_URL}
            />
          </> : null
      }
      {
        forwardModal ?
          <>
            {/* ForwardContactModal */}
            <ForwardContactModal
              visible={forwardModal}
              onClose={() => setForwardModal(false)}
              //   onSelectContact={handleSelectedContact}
              onSelectContact={handleSelectedContactforward}
              apiUrl={base.BASE_URL}
              userId={me}
            />
          </> : null
      }
      {
        showLocationModal ?
          <LocationPickerModal
            visible={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onLocationSelected={handleLocationSelected}
          /> : null
      }
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
    </KeyboardAvoidingView>
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
    bottom: 0
  },
  iconcontent: {
    fontSize: 10, alignItems: 'center'
  },
  roundicon: {
    alignItems: 'center',
    backgroundColor: '#e1eafb', borderRadius: 50,
    justifyContent: 'center',
    width: 40, height: 40
  },

  /*  optionsEmoji: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-around',
     padding: 10,
     backgroundColor: 'white', height: 300,
     bottom: 0
   }, */
  optionsEmoji: {
    height: 300,
    backgroundColor: "white",
    position: "absolute",
    bottom: 60, // footer height
    width: "100%",
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
  footer_reply: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: "#eee",
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
  footerReplyContainer: {
    position: "absolute",
    bottom: 43, // above input box
    width: "100%",
    backgroundColor: "#f6f6f6",
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  replyBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  replyIndicator: {
    width: 4,
    height: "100%",
    backgroundColor: "#25D366",
    borderRadius: 2,
    marginRight: 8,
  },

  replyContent: {
    flex: 1,
  },

  replyName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#25D366",
  },

  replyText: {
    fontSize: 13,
    color: "#555",
  },

  closeReply: {
    padding: 6,
  }
});

export default ChatDetails