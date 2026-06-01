import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Dimensions, StyleSheet, Image, Text,
    TouchableOpacity, KeyboardAvoidingView, TextInput,
    Platform, ScrollView,
    Alert,
    ActivityIndicator, // Added ActivityIndicator for loading state
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
    createAgoraRtcEngine,
    RtcSurfaceView,
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine, VideoSourceType
} from 'react-native-agora';
import * as base from '../../../component/global';
import axios from 'axios';
import Icon from "react-native-vector-icons/Ionicons";
import io, { Socket } from "socket.io-client";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../../../component/api";
import SuccessModal from "./SuccessModal";
import LiveChatMessage from "../../../component/livechat/LiveChatMessage";
import LiveChatFooter from "../../../component/livechat/LiveChatFooter";
import LiveRoomHeader from "./liveroom/LiveRoomHeader";
import GiftModal from "../../../component/livechat/GiftModal";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

/* ===================== NAV TYPES ===================== */

type RootStackParamList = {
    InteractiveRoom: {
        channelName: string;
        hosterinfo: {
            _id: string; // Stream ID
            hoster: { _id: string, is_following: string, name: string, image: string },
            coins: number, viewers_count: number, activeGift: number
        };
        userid: string;
    };
};

type InteractiveRoomNavigationProp = StackNavigationProp<
    RootStackParamList,
    "InteractiveRoom"
>;

type InteractiveRoomRouteProp = RouteProp<
    RootStackParamList,
    "InteractiveRoom"
>;

interface Props {
    navigation: InteractiveRoomNavigationProp;
    route: InteractiveRoomRouteProp;
}

/* ===================== DATA TYPES ===================== */

interface Hoster {
    _id: string;
    name: string;
}

export interface LiveStream {
    _id: string;
    channelName: string;
    hoster: Hoster;
    thumbnail: string;
    title: string;
    location: string;
    viewers_count: number;
    status: string;
}
interface User {
    _id: string;
    name: string;
    email?: string;
    image?: string;
}


const InteractiveRoom: React.FC<Props> = ({ route, navigation }) => {
    const { channelName, hosterinfo, userid } = route.params;
  //  console.log('Inter......', JSON.stringify(hosterinfo))
    console.log('channelName......', channelName)
    //  const socket = useRef<any>(null);
    const [username, setUsername] = useState(null)
    const socket = useRef<Socket | null>(null);
    const engine = useRef<IRtcEngine>(createAgoraRtcEngine());
    const [joined, setJoined] = useState(false);
    const [loading, setLoading] = useState(false); // Added loading state
    // const [remoteUid, setRemoteUid] = useState<number | null>(null); // Removed: Using remoteUids[0]
    // const [coHosts, setCoHosts] = useState<number[]>([]); // Removed: Using remoteUids.slice(1)
    const [showEmojis, setShowEmojis] = useState(false);
    const [message, setMessage] = useState(""); // ORIGINAL: kept for handleEmojiSelect logic if needed
    const [messagesend, setMessagesend] = useState(""); //messagesend
    const [visible, setVisible] = useState(false);
    const commonEmojis = ["❤️", "🔥", "👏", "😮", "😍", "🙌", "😂", "💯"];
    const [messages, setMessages] = useState<{ text: string; system?: boolean; sender?: User }[]>([]);
    // const messagesEndRef = useRef<HTMLDivElement | null>(null); // ORIGINAL: Not used in RN
    const [messageInput, setMessageInput] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const [activeGift, setActiveGift] = useState(0)
    const [viewerCount, setViewerCount] = useState(0);
    const [showGifts, setShowGifts] = useState(false);
    const [isCohost, setIsCohost] = useState(false);
   // const [remoteUids, setRemoteUids] = useState<number[]>([]); // Tracks all remote users (Host is UIDs[0])
    const [remoteUid, setRemoteUid] = useState<number | null>(null);


    // --- ORIGINAL FUNCTION: Restored message state dependency ---
    const handleEmojiSelect = (emoji: string) => {
        setMessageInput(prev => prev + emoji); // Use messageInput for input field
        setMessage(prev => prev + emoji); // Keep original state update
    };

    // --- Agora Lifecycle ---
    useEffect(() => {
        initAndJoin();
        return () => {
            leaveChannel();
        };
    }, [channelName]);

    // --- Co-Host Logic (Restored) ---
    const becomeCoHost = useCallback(async () => {
        try {
            await engine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
            await engine.current.enableLocalVideo(true);
            await engine.current.enableLocalAudio(true);
            await engine.current.startPreview();

            setIsCohost(true);
            setVisible(true);
            setMessagesend("You are now a Co-host! Your video is starting.");
        } catch (e) {
            console.error("Failed to become co-host:", e);
            setVisible(true);
            setMessagesend("Failed to switch to Co-host role.");
        }
    }, [engine]);


    const initAndJoin_not_working = async () => {
        setLoading(true);
        try {
            // 1. Initialize Engine
            engine.current.initialize({ appId: base.AGORA_APP_ID });
            engine.current.enableVideo();
            engine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
            engine.current.setClientRole(ClientRoleType.ClientRoleAudience);

            // 2. Register Event Handlers
            engine.current.registerEventHandler({
                onJoinChannelSuccess: (connection, elapsed) => {
                    console.log(`✅ Audience joined channel successfully: ${connection.channelId}`);
                    setJoined(true);
                },
                onUserJoined: (connection, uid) => {
                    // Critical: Capture all remote UIDs
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
                    console.log(`[Agora Event] onUserOffline received UID: ${uid}`);
                    setRemoteUids(prev => prev.filter(u => u !== uid));
                },
                onError: (code, message) => {
                    console.error(`❌ Agora Error: ${code}, Message: ${message}`);
                }
            });

            // 3. Fetch Token
            const res = await axios.get(`${base.BASE_URL}/apis/live/get-token`, {
                params: { channelName }
            });

            // 4. Join Channel
            engine.current.joinChannel(res.data.token, channelName, null, { uid: 0 });
        } catch (e) {
            console.error("Join Error:", e);
        } finally {
            setLoading(false);
        }
    };

      const initAndJoin = async () => {
        setLoading(true);
        try {
          // 1. Initialize Engine
          engine.current.initialize({ appId: base.AGORA_APP_ID });
          engine.current.enableVideo();
          
          // 2. Set Profile and Role
          engine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
          engine.current.setClientRole(ClientRoleType.ClientRoleAudience);
    
          // 3. Register Events to catch the Host
          engine.current.registerEventHandler({
            onJoinChannelSuccess: () => {
              setJoined(true);
              console.log(`Successfully joined: ${channelName}`);
            },
            onUserJoined: (connection, uid) => {
              // When the host is detected, we save their UID to render the video
              console.log("Remote Host joined with UID:", uid);
              setRemoteUid(uid);
            },
            onUserOffline: () => {
              // If host leaves, clear the UID
              setRemoteUid(null);
            },
            onError: (err) => {
              console.error("Agora Error:", err);
            }
          });
    
          // 4. Fetch dynamic token from your backend
          const res = await axios.get(base.BASE_URL + `/apis/live/get-token`, {
            params: { channelName: channelName }
          });
          
          // 5. Join Channel (uid: 0 lets Agora assign us a unique audience ID)
          console.log('Interactive join token...', res.data.token)
          engine.current.joinChannel(res.data.token, channelName, 0, {});
    
        } catch (e) {
          console.error("Join Error:", e);
        } finally {
          setLoading(false);
        }
      };
    

    const leaveChannel = () => {
        engine.current.leaveChannel();
        engine.current.release();
        setJoined(false);
    };

    const onClose = () => {
        leaveChannel();
        navigation.goBack();
    };


    // --- Socket Logic (Restored) ---
    useEffect(() => {
        const initSocket = async () => {
            let userIdFinal = userid;
            let usernameFinal = "Test User";

            if (userIdFinal) {
                const jsonValue = await AsyncStorage.getItem("userdata");
                if (jsonValue) {
                    const data = JSON.parse(jsonValue);
                    userIdFinal = data._id;
                    usernameFinal = data.name;
                    setUser(JSON.parse(jsonValue));
                }
            }

            if (!userIdFinal) {
                console.warn("User ID not found, socket will not connect.");
                return;
            }

            socket.current = io(base.SOCKET_URL, {
                transports: ["websocket"],
                query: { userId: userIdFinal },
                autoConnect: false,
            });

            socket.current.connect();

            socket.current.on("connect", () => {
                console.log("✅ Socket connected:", socket.current?.id);

                socket.current?.emit("join-live-room", {
                    channelName,
                    user: {
                        _id: userIdFinal,
                        name: usernameFinal,
                    },
                    role: "audience",
                });
            });

            socket.current.on("user-joined", ({ user, role }) => {
                const joinMessage = {
                    text: `${user.name} joined as ${role}`,
                    system: true,
                };
                setMessages(prev => [...prev, joinMessage]);
            });

            socket.current.on("cohost-approved", (approvedUser) => {
                if (approvedUser._id === user?._id) {
                    becomeCoHost();
                }
            });

            socket.current.on("live-message", (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            socket.current.on("connect_error", (err) => {
                console.log("❌ Socket connection error:", err.message);
            });

            socket.current.on("disconnect", () => {
                console.log("❌ Socket disconnected");
            });
        };

        initSocket();

        return () => {
            socket.current?.disconnect();
            socket.current = null;
        };
    }, [channelName, becomeCoHost]);


    // --- Co-Host Request (Restored) ---
    const sendRequest = async () => {
        if(isCohost) return;

        const jsonValue = await AsyncStorage.getItem('userdata');
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    streamId: hosterinfo._id,
                    hosterId: hosterinfo.hoster._id,
                    userId: userData._id,
                    channelName: channelName
                };
                
                const res = await api.post(
                    `/apis/live/co-hoster-request`,
                    payload
                );

                if (res.data.success) {
                    setVisible(true)
                    setMessagesend("Request send")
                    const requestData = {
                        channelName: channelName,
                        user: {
                            _id: userData?._id,
                            name: userData?.name,
                        },
                    };
                    socket.current?.emit("request-cohost", requestData);
                } else {
                    setVisible(true)
                    setMessagesend(res.data.message || "Request failed")
                }
            } catch (error: any) {
                setVisible(true)
                setMessagesend(error?.response?.data?.message || "Request is already send")
                console.error("Co-host request error:", error?.response?.data || error);
            }
        }
    };


    // --- Send Message (Restored) ---
    const sendMessage = () => {
        if (!messageInput.trim()) return;

        const msg = {
            text: messageInput,
            sender: user,
        };

        socket.current?.emit("send-live-message", {
            channelName: channelName,
            message: msg,
        });

        // The message is displayed via socket echo, so no local append needed.
        setMessageInput("");
    };

    // --- Send Gift (Restored) ---
    const sendGift = (giftId: string) => {
        console.log("🎁 Gift selected:", giftId);
        socket.current?.emit("send-gift", {
            channelName,
            senderId: user?._id,
            giftId,
        });
        setShowGifts(false);
    };


    // --- Scroll to End (Restored) ---
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    // --- Handle Close Stream (Restored) ---
    const handleCloseStream = () => {
        leaveChannel()
        if (socket.current) {
            socket.current.disconnect();
            navigation.goBack();
        }
    };

    // --- Hand Gift (Restored) ---
    const handGift = () => {
        setShowGifts(true)
    }

    // --- Video Display Logic ---  setRemoteUid
 //   const hostUid = remoteUid.length > 0 ? remoteUid[0] : null;
 //   const coHostUids = remoteUid.slice(1);
   const hostUid = remoteUid;
    const coHostUids = remoteUid;

    return (
        <View style={styles.container}>
            
            {/* --- Debugging Text --- */}
            <Text style={styles.debugTextOverlay}>
                Host UID: {hostUid} | {/* All UIDs: {remoteUids.join(', ')} | Is Cohost: {isCohost ? 'YES' : 'NO'} */}
            </Text>

            {/* 1. BACKGROUND VIDEO (HOST) */}
            <View style={styles.videoContainer}>
                
                {hostUid ? (
                    // Host Video - FIX: zOrderMediaOverlay=false for main video
                    <RtcSurfaceView 
                        style={styles.fullVideo} 
                        canvas={{ uid: hostUid }} 
                        zOrderMediaOverlay={false} 
                    />
                ) : (
                    // Host Image Fallback / Loading Overlay
                    <>
                        <Image 
                            source={{ uri: hosterinfo?.hoster?.image }} 
                            style={styles.fullVideo} 
                            blurRadius={10} 
                        />
                         {loading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#ffffff" />
                                <Text style={styles.loadingText}>Connecting to host...</Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* 2. HEADER OVERLAY */}
            <LiveRoomHeader hosterinfo={hosterinfo}
                onClose={handleCloseStream} activeGift={activeGift}
                viewerCount={viewerCount} />

            {/* 3. CO-HOST SLOTS (5 Boxes) */}
            <View style={styles.coHostWrapper}>
                
                {/* Local Co-host slot (if approved) */}
                {isCohost && (
                     <View style={[styles.coHostBox, styles.localCohostBorder]}>
                        <RtcSurfaceView 
                            style={styles.coHostVideo} 
                            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                            zOrderMediaOverlay={true} // FIX: zOrderMediaOverlay=true for all floating videos
                        />
                     </View>
                )}

                {/* Remote Co-hosts slots (Up to 5) */}
              {/*   {coHostUids.slice(0, 5).map((uid) => (
                    <View key={`remote-${uid}`} style={styles.coHostBox}>
                        <RtcSurfaceView
                            style={styles.coHostVideo}
                            canvas={{ uid, sourceType: VideoSourceType.VideoSourceRemote }}
                            zOrderMediaOverlay={true} // FIX: zOrderMediaOverlay=true for all floating videos
                        />
                    </View>
                ))} */}
                
                {/* Co-Host Request Button */}
               {/*  {!isCohost && coHostUids.length < 5 && (
                     <View style={styles.coHostBox}>
                        <TouchableOpacity style={styles.requestBtn} onPress={sendRequest}>
                            <Icon name="videocam-outline" size={20} color="rgba(97, 94, 94, 0.5)" />
                            <Text style={styles.requestText}>Request</Text>
                        </TouchableOpacity>
                    </View>
                )} */}
            </View>
            
            {/* 4. Chat Area */}
            <View style={styles.chatArea}>
                <View style={styles.welcomeMsg}>
                    <Text style={styles.welcomeText}>
                        Welcome to the stream! Keep it friendly.
                    </Text>
                </View>
                <LiveChatMessage messages={messages} />
            </View>

            {/* 5. Live Chat Footer (Restored) */}
            <LiveChatFooter
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                sendMessage={sendMessage}
                showEmojis={showEmojis} // Restored original state usage
                setShowEmojis={setShowEmojis} // Restored original state usage
                commonEmojis={commonEmojis}
                onEmojiSelect={handleEmojiSelect}
                onModalGift = {handGift}
            />

            {/* 6. Modals (Restored) */}
            {
                showGifts ?
                <GiftModal show={showGifts} onHide={() => setShowGifts(false)}
                onSendGift={sendGift} />
                : null
            }
          
            {
                visible ?
                    <SuccessModal
                        visible={visible}
                        title="Request Sent"
                        message={messagesend}
                        onClose={() => setVisible(false)}
                        onOk={() => setVisible(false)}
                    />
                    : null
            }

        </View>
    );
};

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    videoContainer: { ...StyleSheet.absoluteFillObject },
    fullVideo: { width: "100%", height: "100%" },
    
    // --- Added Debugging/Loading Styles ---
    debugTextOverlay: {
        position: 'absolute', top: 50, left: 10, zIndex: 10, 
        color: 'red', backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, fontSize: 10
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 1,
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
    },
    localCohostBorder: {
        borderColor: '#00ff00', // Green border for local co-host video
    },
    // --- Existing Styles ---
    statBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 15,
        marginLeft: 5
    },
    statText: { color: "#fff", fontSize: 12, marginLeft: 4 },
    closeBtn: { marginLeft: 10 },

    coHostWrapper: {
        position: 'absolute',
        top: 120,
        right: 10,
        width: 80,
        gap: 10,
        zIndex: 5, // Ensure co-hosts are above the main video
    },
    coHostBox: {
        width: 80,
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
    },
    coHostVideo: { width: '100%', height: '100%', backgroundColor: '#ffffff' },
    requestBtn: { alignItems: 'center' },
    requestText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 },

    chatArea: {
        position: 'absolute',
        bottom: 100,
        left: 15,
        width: screenWidth * 0.7,
        height: 200,
        zIndex: 3,
    },
    welcomeMsg: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 8 },
    welcomeText: { color: '#FFD700', fontSize: 12 },

    footerWrapper: { position: "absolute", bottom: 20, width: "100%" },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        width: '100%',
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 20,
        paddingHorizontal: 15,
        color: "#fff",
    },
    sendBtn: { backgroundColor: 'red', borderRadius: 20 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    iconAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#9CA3AF", // gray-400
        justifyContent: "center",
        alignItems: "center",
    },
    emojiPopup: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    emojiText: {
        fontSize: 24,
        marginHorizontal: 8,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 25,
        paddingHorizontal: 5,
        height: 46,
        marginHorizontal: 5,
    },
    inputField: {
        flex: 1,
        color: "#fff",
        paddingHorizontal: 12,
        fontSize: 14,
    },
    sendInsideBtn: {
        backgroundColor: 'red',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtn: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 21,
    },
});

export default InteractiveRoom;