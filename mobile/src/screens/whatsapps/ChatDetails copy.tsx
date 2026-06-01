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
import { addToQueue,getQueue, clearQueue } from "../../utils/offlineQueue";

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
  const route = useRoute<ChatdetailsRouteProp>();
  const { me, partner, userinfo, type } = route.params; //partner is used for group id or partner id
  console.log('chatdetails' + '..me..' + me + '---partner...' + partner + '....' + JSON.stringify(userinfo) + '..type....' + type)
  const [messages, setMessages] = useState<any[]>([]);
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
  const [isloading, setIsloading] = useState(true);
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

  const getConversion = async(me: string,partner: string,type: string) => {
    console.log('...logo...',base.BASE_URL + '/apis/getChatdetails')
    console.log('...me...', me)
    console.log('...partner...', partner)
    console.log('...convoId...', partner)
    console.log('...type...', type)
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
        console.log('✅ Messages fetched:', data.messages.length);
      } else {
        console.log('⚠️ No messages in response:', data);
      }

    } catch (error) {
      console.error('❌ Error fetching chat details:', error);
    } finally {
      setIsloading(false);
    }
  }
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(async state => {
    const isOnline = state.isConnected && socket.current?.connected;
    if (!isOnline) return;
    console.log("🌐 Internet back → syncing queue");
    const queue = await getQueue();
    if (queue.length === 0) return;
    for (const msg of queue) {
      socket.current.emit("sendMessage", msg);
    }
    await clearQueue();
    socket.current.emit("getConversations", me);
  });

  return () => unsubscribe();
}, []);

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
    console.log("✅ Socket connected:", socket.current.id);
  });

socket.current.on("connect", async () => 
{
  console.log("🔌 Reconnected → syncing queue");
  const queue = await getQueue();
  queue.forEach((msg : any) => {
    socket.current.emit("sendMessage", msg);
  });
  await clearQueue();
});

  socket.current.on("disconnect", (reason : any) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  socket.current.on("connect_error", (err : any) => {
    console.log("❌ Socket connection error:", err.message);
  });

  // Message listeners
  socket.current.on("messages", (data : any) => {
    console.log('....📩 Received messages' + JSON.stringify(messages))
    setMessages(data);
  });

  socket.current.on("newMessages", (data : any) => {
    setMessages(data);
        console.log('....🆕 New messages ...' + JSON.stringify(messages))

  });

  // Typing listeners
  socket.current.on("typing", ({ from } : any) => {
    if (from === partner) setTyping(true);
  });

  socket.current.on("stopTyping", ({ from } : any) => {
    if (from === partner) setTyping(false);
  });

  // Get messages
  const msgType = userinfo?.type;
  if (msgType === "group") {
    console.log('📣 Group chat load');
    setGroupid(partner);
    socket.current.emit("getMessages", { me, type: "group", convoId: partner });
        console.log('..group..message ...' + JSON.stringify(messages))

  } else {
    console.log('💬 Private chat load');
    setGroupid(null);
    socket.current.emit("getMessages", { me, partner, type: "private" });
        console.log('..private..message ...' + JSON.stringify(messages))

  }
  if(messages.length === 0)
  {
    getConversion(me,partner,msgType) //msgType  type
  }

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


const submit = async () => {
  if (!text.trim()) return;
  const net = await NetInfo.fetch();
  const isOnline = net.isConnected && socket.current?.connected;
  const basePayload = {
    sender: me,
    receiver: partner,
    text,
    imageUrl: "",
    videoUrl: "",
    audioUrl: "",
    type,
    createdAt: new Date().toISOString(),
  };

  // ✅ OFFLINE MODE
  if (!isOnline) {
    console.log("📦 Offline → saving to queue");
    await addToQueue(basePayload);
    // optimistic UI
    setMessages(prev => [
      ...prev,
      {
        _id: "offline-" + Date.now(),
        ...basePayload,
        msgByUserId: me,
        pending: true, // mark unsent
      },
    ]);

    setText("");
    return;
  }
  // ✅ ONLINE MODE
  console.log("📡 Sending online");
  socket.current.emit("sendMessage", basePayload);

  setMessages(prev => [
    ...prev,
    {
      _id: Date.now().toString(),
      ...basePayload,
      msgByUserId: me,
    },
  ]);

  setText("");
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
      //file:////data/user/0/com.messengeruae/cache/sound.mp4
      const mimeType = mime.getType(uri) || 'audio/m4a';
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
          base.BASE_URL + '/apis/voice/addvoice',
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
          submitSound(data.url);
        } else {
          console.warn('Upload did not succeed:', data.message);
        }
      } catch (err) {
        console.error('Error uploading', err);
      }
      //end voice  socket
      console.log('Recording finished at', uri);
        setIsRunning(false);
    setElapsedTime(0);
    } catch (err) {
      console.warn(err);
    }
  };
  const submitSound = async (uri : any) => {
    const userid = await AsyncStorage.getItem("username");
    console.log("..JSON..." + JSON.stringify(uri)); //imageurl 
    setIsloading(true);
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
      {
        mediaType: 'photo',
        selectionLimit: 1, // Set to 1 if you only want one photo
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('ImagePicker Error:', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const selectedImageUri = response.assets[0].uri;
          console.log('Selected photo URI:', selectedImageUri);
          setCapturedPhoto(selectedImageUri);
          //start uploading to s3 bucket

          uploadImage(selectedImageUri)

          //end bucket
        }
      }
    );
  }
  const uploadImage = async (uri) => {
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
        base.BASE_URL + '/apis/voice/addvoice',
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

  const handleReply = (message : any) => {
    console.log('Reply to:', message.text);
    handleCloseMenu();
  };

  const handleForward = (message : any) => {
    console.log('Forward message:', message.text);
    handleCloseMenu();
  };

  const handleRemove = (message : any) => {
    console.log('Remove message:', message.text);
    // You can trigger delete logic here
    handleCloseMenu();
  };
  const toggleAction = (action: string) => {
      if(action == "add")
      {
        setShowOptions((prev) => !prev)
        setShowEmojioptions(false)
        //setShowEmojioptions(false)
        setIsRecording(false)
      }
      else if(action == "emoji")
      {
        setShowEmojioptions((prev) => !prev)
         setIsRecording(false)
         setShowOptions(false)
      }
      else if(action == "recording") 
      {
          startRecording()
             setShowOptions(false)
             setShowEmojioptions(false)
      }

  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{
            width: 80, flexDirection: 'row',
            borderWidth: 0, borderColor: 'green'
          }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image source={BackImage} style={{ marginRight: 17, marginTop: 10 }} />
            </TouchableOpacity>
            <TouchableOpacity>
              <>
                {
                  type == "group" ?
                    <>
                      {userinfo?.group?.groupimage ? (
                        <>
                          <Image
                            source={{ uri: userinfo?.group?.image }}
                            style={styles.avatar}
                          />
                          <Text style={{ marginRight: 7, marginTop: 3, fontWeight: 'bold' }}>{userinfo?.group?.groupName}</Text>
                        </>
                      ) : (
                        <>
                          <Image
                            source={GroupUserImage} style={styles.avatar} />
                        </>
                      )}
                    </>
                    :
                    <>

                      {userinfo?.partner?.image ? (
                        <Image
                          source={{ uri: userinfo.partner.image }}
                          style={styles.avatar}
                        />
                      ) : (
                        <Image
                          source={defaultUserImage} // this should be a local image, e.g.: require('../../assets/default-user.png')
                          style={styles.avatar}
                        />
                      )}
                    </>
                }
              </>


            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{
            flexDirection: 'column', alignContent: 'flex-start',
            borderWidth: 0, borderColor: 'green'
          }}>
            {
              type == "group" ?
                <Text style={{ marginRight: 7, marginTop: 3, fontWeight: 'bold' }}>{userinfo?.group?.groupName}</Text>
                :
                <Text style={{ marginRight: 7, marginTop: 3, fontWeight: 'bold' }}> {userinfo?.partner?.name}
                  {
                    typing ? ' Typing' : null
                  }
                </Text>

            }
            <Text style={{ marginRight: 17, marginTop: 0, marginLeft: 5, fontSize: 12 }}>
                  {
                    typing ? ' Typing' : 'Online'
                  }
            </Text>

          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('More icon tapped')}>
          <Icondot name="more-vert" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, marginBottom: 60 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
       {/*  {!socketConnected && <Text style={{ color: 'red' }}>Socket not connected</Text>} */}
        {
          isloading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : null
        }


        {/*  <Text>{me} {partner}</Text> */}

        {messages.map((m, index) => (
          <View key={m._id}>
            <TouchableOpacity style={m.msgByUserId === me ? styles.own : styles.other}
              onLongPress={() => {
                setSelectedMessage(m);
                setMenuVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={m.msgByUserId === me ? styles.textOwn : styles.textOther}>
                {m.text}
              </Text>
              {/*   <Text style={{ fontSize: 10 }}>{new Date(m.createdAt).toLocaleTimeString()} {m.seen ? ' seen ' : null}</Text> */}
              <Text style={{ fontSize: 10, flexDirection: 'row', alignItems: 'center', color: m.msgByUserId === me ? '#ffffff' : '#000' }}>
                {new Date(m.createdAt).toLocaleTimeString()}{' '}
                {m.msgByUserId === me && (
                  <>
                    {m.seen ? (
                      <Text style={{ color: 'white' }}>✓✓</Text> // Blue double tick
                    ) : (
                      <Text style={{ color: 'white' }}>✓</Text> // Gray single tick
                    )}
                  </>
                )}
              </Text>
            </TouchableOpacity>
            {m?.imageUrl && (
              <View style={m.msgByUserId === me ? styles.own : styles.other}>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentImage([{ url: m?.imageUrl }]);
                    setIsVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: m?.imageUrl }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/*  {m?.videoUrl && (
              <video src={m.videoUrl} className='w-full h-full object-scale-down' controls />
            )}  */}

            {m?.audioUrl && (
              <View style={m.msgByUserId === me ? styles.own : styles.other}>
                <VoicePlayer url={m.audioUrl} userimage={userinfo?.partner?.image} me={me} xpartner={m.msgByUserId} />
              </View>
            )}

          </View>
        ))}
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
       {/*    <Text style={styles.timer}>
            {elapsedTime}
          </Text> */}
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
});

export default ChatDetails