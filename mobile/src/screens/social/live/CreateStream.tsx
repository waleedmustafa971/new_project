import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert, 
  ScrollView
} from 'react-native';
import axios from 'axios';
import api from '../../../component/api';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
  RtcEngine,
} from 'react-native-agora';
import * as base from '../../../component/global'; // Assuming this path is correct
const AGORA_APP_ID = 'd9f79aff2b2341b991fbdf080250a8e0';
import AsyncStorage from "@react-native-async-storage/async-storage";
import HosterHeader from '../../../component/hostermessenger/HosterHeader'; 
import HosterMessage from '../../../component/hostermessenger/HosterMessage'; 
import HosterFooter from '../../../component/hostermessenger/HosterFooter'; 
const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
import io, { Socket } from "socket.io-client";
import StartJoinChannel from './StartJoinChannel'; 
import { useNavigation } from '@react-navigation/native'; 
import CoRequestAcceptModal from './CoRequestAcceptModal';

const localUid = 0; // Standard UID for the local user/host

interface User {
  _id: string;
  name: string;
  email?: string;
  image?: string;
}

interface ChatMessage {
  text: string;
  system?: boolean;
  sender?: User;
}


const CreateStream = () => {
  const engineRef = useRef<RtcEngine | null>(null);
  const socket = useRef<Socket | null>(null);
  const navigation = useNavigation();

  const [engineReady, setEngineReady] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(true);

  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [message, setMessage] = useState('Initializing Agora...');
  const [token, setToken] = useState('');
  const [channel, setChannel] = useState('');
  const [channelName, setChannelName] = useState<string | null>(null)
  
  const [showEmojis, setShowEmojis] = useState(false);
  const commonEmojis = ["❤️", "🔥", "👏", "😮", "😍", "🙌", "😂", "💯"];
  const [user, setUser] = useState<User | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  const hosterinfo = {
    hoster: {
      image: user?.image || "",
      name: user?.name || "Live Host",
      is_following: false,
    },
    coins: 0,
    viewers_count: 0,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [joinModal, setJoinModal] = useState(true);
  const [activeGift, setActiveGift] = useState(0)

  // Co-host request states
  const [coHostRequests, setCoHostRequests] = useState<User[]>([]);
  const [showCoHosterRequest, setShowCoHosterRequest] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<User | null>(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);


  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  // --- AGORA INITIALIZATION & HANDLER SETUP ---
  const initAgora = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        if (permissions['android.permission.CAMERA'] !== 'granted') {
          setMessage('Camera permission denied');
          return;
        }
      }

      const engine = createAgoraRtcEngine();
      engine.initialize({ appId: AGORA_APP_ID });

      engine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          setIsJoined(true);
          setMessage('Joined successfully!');
          engine.startPreview();

          if (user && socket.current) {
            socket.current.emit("join-live-room", {
              channelName: connection.channelId,
              user: { _id: user._id, name: user.name },
              role: "host",
            });
            setChannelName(connection.channelId);
          }
        },
        
        onUserJoined: (connection, uid) => {
          console.log(`[Agora Event] onUserJoined received UID: ${uid}`);
          setRemoteUids(prev => {
            const isDuplicate = prev.includes(uid);
            if (!isDuplicate) {
              return [...prev, uid];
            }
            return prev;
          });
        },

        onUserOffline: (connection, uid) => {
          setRemoteUids(prev => prev.filter(u => u !== uid));
        },
        onError: (err, msg) => {
          console.error('Agora Error:', err, msg);
          setMessage(`Agora Error: ${err}`);
        },
      });

      engine.enableVideo();
      engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);

      engineRef.current = engine;
      setEngineReady(true);
      setMessage('Ready to Join');
    } catch (e) {
      console.error('Init Failed:', e);
      setMessage('Init Failed');
    }
  };


  // --- SOCKET INITIALIZATION (Runs once) ---
  useEffect(() => {
    initAgora();

    const initSocket = async () => {
      let userIdFinal = "";

      const jsonValue = await AsyncStorage.getItem("userdata");
      if (jsonValue) {
        const data: User = JSON.parse(jsonValue);
        userIdFinal = data._id;
        setUser(data);
      }

      if (!userIdFinal) return;

      socket.current = io(base.SOCKET_URL, {
        transports: ["websocket"],
        query: { userId: userIdFinal },
        autoConnect: true,
      });

      socket.current.on("cohost-request", (requester: User) => {
        setCoHostRequests(prev => {
          if (!prev.some(r => r._id === requester._id)) {
            const newList = [...prev, requester];
            if (!showCoHosterRequest && !currentRequest) {
              setCurrentRequest(requester);
              setShowCoHosterRequest(true);
            }
            return newList;
          }
          return prev;
        });
      });

      socket.current.on("gift-received", ({ gift, sender, totalCoins }) => {
        setMessages(prev => [
          ...prev,
          {
            system: true,
            text: `${sender.name} sent ${gift.name} ${gift.icon}`,
          },
        ]);
        setActiveGift(totalCoins);
      });

      socket.current.on("user-joined", ({ user, role }: { user: User, role: string }) => {
        const joinMessage = {
          text: `${user.name} joined as ${role}`,
          system: true,
        };
        setMessages(prev => [...prev, joinMessage]);
      });
      socket.current.on("viewer-count-updated", ({ viewers }) => {
        setViewerCount(viewers);
      });
    }
    initSocket();

    return () => {
      endStream();

      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
      socket.current?.disconnect();
    };
  }, []);

  // --- CHAT MESSAGE LISTENER ---
  useEffect(() => {
    if (socket.current && user) {

      const messageListener = (msg: ChatMessage) => {
        if (msg.sender?._id !== user._id) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      socket.current.on("live-message", messageListener);
      

      return () => {
        socket.current?.off("live-message", messageListener);
        socket.current?.off("viewer-count-updated");
      };
    }
  }, [user]); 


  // --- STREAM START/JOIN LOGIC ---
  /*
    The backend has had POST /apis/live/end-stream all along and nothing ever
    called it, so every broadcast stayed status:'live' forever. The LIVE tab
    then listed streams nobody was hosting, and tapping one sat on 'Waiting
    for Host...' indefinitely. A ref rather than state, because the unmount
    cleanup below runs with the values it closed over on mount.
  */
  const liveRef = useRef<{ hostId: string; channelName: string } | null>(null);

  const endStream = async () => {
    const current = liveRef.current;
    if (!current) return;
    liveRef.current = null;
    try {
      await api.post('/apis/live/end-stream', { ...current, status: 'ended' });
    } catch (e) {
      console.warn('Could not mark the stream ended:', e);
    }
  };

  const joinChannel = async () => {
    if (!engineReady || !engineRef.current) return;
    setJoinLoading(true);

    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue == null) {
      setMessage('User data not found.');
      setJoinLoading(false);
      return;
    }

    const userData: User = JSON.parse(jsonValue);

    try {
      setMessage('Requesting token...');
      const channelToJoin = `room_${Math.floor(Math.random() * 10000)}`;

      const res = await api.post(
        '/apis/live/create-stream',
        {
          hostId: userData._id,
          channelName: channelToJoin,
          title: 'Welcome to my Live Stream!',
          // ... rest of stream data
        }
      );

      if (res.data.success) {
        const backendToken = res.data.token;
        const backendChannel = res.data.data.channelName;

        liveRef.current = { hostId: userData._id, channelName: backendChannel };

        setToken(backendToken);
        setChannel(backendChannel);
        setChannelName(backendChannel); 

        engineRef.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engineRef.current.joinChannel(backendToken, backendChannel, localUid, {}); // Use localUid (0)

        const payload = {
          channelName: backendChannel,
          hoster: {
            _id: userData?._id,
            name: userData?.name,
            image: userData?.image
          },
        };
        socket.current?.emit("create-live-room", payload);

        setJoinModal(false)
        setJoinLoading(false);
      } else {
        setMessage('Backend error: ' + res.data.message);
        setJoinLoading(false);
      }
    } catch (error) {
      setJoinLoading(false);
      console.error('Failed to start live:', error);
      setMessage('Failed to get token or start stream.');
    }
  };

  // --- SEND MESSAGE LOGIC ---
  const sendMessage = () => {
    if (!messageInput.trim() || !channelName || !user) return;

    const msg = {
      text: messageInput,
      sender: user,
    };

    socket.current?.emit("send-live-message", {
      channelName: channelName,
      message: msg,
    });

    setMessages((prev) => [...prev, { ...msg, system: false }]);
    setMessageInput("");
  };

  // --- CO-HOST REQUEST HANDLERS ---
  const processNextRequest = (acceptedId: string) => {
    setCoHostRequests(prev => {
      const remainingRequests = prev.filter(r => r._id !== acceptedId);

      if (remainingRequests.length > 0) {
        setCurrentRequest(remainingRequests[0]);
      } else {
        setCurrentRequest(null);
        setShowCoHosterRequest(false);
      }
      return remainingRequests;
    });
  };

  const handleAcceptCohost = async (requester: User) => {
    if (!socket.current || !channelName) return;
    setRequestActionLoading(true);

    try {
      // 1. Notify the socket server of acceptance
      socket.current.emit("accept-cohost", {
        channelName: channelName,
        user: requester,
      });

      // 2. Clean up the request and move to the next one
      processNextRequest(requester._id);

    } catch (e) {
      console.error("Acceptance failed:", e);
      Alert.alert("Failed to accept co-host.");
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleRejectCohost = (requester: User) => {
    processNextRequest(requester._id);
  };

  const handleCloseModal = () => {
    if (!requestActionLoading) {
      setShowCoHosterRequest(false);
    }
  };

  const handleCloseStream = () => {
    endStream();

    if (engineRef.current && isJoined) {
      engineRef.current.leaveChannel();
      engineRef.current.stopPreview();
      setIsJoined(false);
      setMessage("Stream closed.");
    }

    if (socket.current) {
      socket.current.disconnect();
      navigation.goBack();
    }
  };

  // --- Early Return for Loading State ---
  if (joinLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0055cc" />
        <Text style={styles.loadingText}>Joining Stream...</Text>
      </View>
    );
  }

const renderVideos = () => {
  if (!isJoined) {
    return (
      <View style={styles.placeholder}>
        <Text>Join a channel</Text>
      </View>
    );
  }

  const firstCoHost = remoteUids[0];
  const remainingCoHosts = remoteUids.slice(1);

  return (
    <>
      {/* ROW 1: Host + First Co-host */}
      <View style={styles.row}>
        {/* Host */}
        <View style={[styles.videoBox, styles.half]}>
          <Text style={styles.roleText}>HOST (You)</Text>
          <RtcSurfaceView
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
            style={styles.video}
          />
        </View>

        {/* First Co-host */}
        {firstCoHost && (
          <View style={[styles.videoBox, styles.half]}>
            <Text style={styles.roleText}>CO-HOST</Text>
            <RtcSurfaceView
              canvas={{ uid: firstCoHost, sourceType: VideoSourceType.VideoSourceCamera }}
              style={styles.video}
            />
          </View>
        )}
      </View>

      {/* NEXT ROWS: 3-column grid */}
      <View style={styles.grid}>
        {remainingCoHosts.map(uid => (
          <View key={uid} style={[styles.videoBox, styles.third]}>
            <RtcSurfaceView
              canvas={{ uid, sourceType: VideoSourceType.VideoSourceCamera }}
              style={styles.video}
            />
          </View>
        ))}
      </View>
    </>
  );
};


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
      <HosterHeader hosterinfo={hosterinfo} isHost 
      onClose={handleCloseStream} activeGift={activeGift} 
      viewerCount={viewerCount}/>
      </View>
      
  {/* Body */}
    <View style={{ flex: 1 }}>
      {!engineReady && !joinModal ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0055cc" />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.videoContainer}>
          {renderVideos()}
        </ScrollView>
      )}
    </View>

      <View style={styles.chatArea}>
        <View style={styles.welcomeMsg}>
          <Text style={styles.welcomeText}>
            Welcome to the stream! {user?.name}
          </Text>
        </View>
        <HosterMessage messages={messages} />
      </View>

      <HosterFooter
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sendMessage={sendMessage}
        showEmojis={showEmojis}
        setShowEmojis={setShowEmojis}
        commonEmojis={commonEmojis}
        onEmojiSelect={handleEmojiSelect}
      />
      {joinModal && (
        <StartJoinChannel
          visible={joinModal}
          title="Live"
          message="Join and enjoy live stream"
          loading={joinLoading}
          onClose={() => {
            if (!joinLoading) setJoinModal(false);
          }}
          onOk={joinChannel}
        />
      )}

      {/* --- CO-HOST REQUEST MODAL --- */}
      {currentRequest && ( 
        <CoRequestAcceptModal
          visible={showCoHosterRequest}
          coHostRequest={currentRequest} 
          loading={requestActionLoading}
          onClose={handleCloseModal}
          onAccept={handleAcceptCohost}
          onReject={handleRejectCohost}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainerFull: {
      width: screenWidth, // Full width
      height: screenHeight * 0.7, 
      backgroundColor: '#000',
      position: 'relative',
    },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: screenHeight - 100,
  },
  // --- SCROLL/VIDEO CONTAINER STYLES ---
  videoContainer: {
      width: screenWidth, 
      height: screenHeight * 0.7, // Allocate 70% of screen height for video
      backgroundColor: '#000',
      position: 'relative', // CRITICAL: Reference for absolute children
  },
  
  // --- FULL SCREEN HOST VIDEO STYLES ---
  mainHostVideoBox: { // Replaced fullScreenVideo for clarity
    width: '100%', 
    height: '100%', 
    position: 'absolute', // This is what allows co-hosts to overlap it
  },
  fullScreenVideoInner: { // Style applied directly to RtcSurfaceView
    width: '100%', 
    height: '100%', 
  },
  roleTag: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      zIndex: 15,
  },
  
  // --- CO-HOST OVERLAY STYLES ---
  coHostListContainer: {
    position: 'absolute',
    top: 100,          
    right: 10,        
    zIndex: 20,       // Higher Z-index to ensure it sits on top of the host video
    flexDirection: 'column', 
    alignItems: 'flex-end',
  },
  coHostVideoBox: {
    width: 150,       
    height: 150,      
    marginBottom: 8,  
    borderRadius: 8,
    overflow: 'hidden', 
    borderWidth: 2,
    borderColor: '#FFF',
  },
  coHostVideo: { // This ensures the RtcSurfaceView fills its 150x150 parent box
    width: '100%',
    height: '100%',
    // IMPORTANT: No 'position: absolute' here
  },

  coHostRoleTag: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        zIndex: 15,
    },
  roleText: {
        color: '#fff',
        fontSize: 12,
    },
  videoPlaceholderText: {
        color: '#aaa',
        textAlign: 'center',
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
    },
  
  // --- CHAT/FOOTER STYLES ---
  chatArea: {
    position: 'absolute',
    bottom: 100, 
    left: 15,
    width: screenWidth * 0.7,
    height: screenHeight * 0.3,
    zIndex: 30, 
    justifyContent: 'flex-end', 
  },
  welcomeMsg: { 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    padding: 8, 
    borderRadius: 8,
    marginBottom: 5,
  },
  welcomeText: { color: '#FFD700', fontSize: 12 },
  scroll: { flex: 1, backgroundColor: '#ddeeff', width: '100%' },    
  scrollContainer: { alignItems: 'center' },    
  videoView: { width: '90%', height: 200 },

  /* new added */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b5ed7',
  },
  headerText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    padding: 6,
  },

  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  videoBox: {
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 3,
  },

  half: {
    width: '50%',
  },

  third: {
    width: '33.33%',
  },

  video: {
    flex: 1,
  },

  roleText: {
    position: 'absolute',
    zIndex: 1,
    top: 6,
    left: 6,
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },


  /* end new added */

});

export default CreateStream;