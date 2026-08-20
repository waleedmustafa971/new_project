import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { 
  createAgoraRtcEngine, 
  RtcSurfaceView, 
  ChannelProfileType, 
  ClientRoleType,
  IRtcEngine
} from 'react-native-agora';
import axios from 'axios';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
//import * as base from '../../../component/global'
const { height, width } = Dimensions.get('window');
import * as base from '../../../component/global'
import { useNavigation } from '@react-navigation/native';

interface LiveItemProps {
  item: any;
  isActive: boolean;
  navigation?: any;
  userid?: string
}

const ListofLiveChild: React.FC<LiveItemProps> = ({ item, isActive, userid }) => {
  // Use a ref for the engine to ensure it persists correctly
  const engine = useRef<IRtcEngine>(createAgoraRtcEngine());
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  // FIX: State to track the Host's actual UID so we can display their video
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  useEffect(() => {
    if (isActive) {
      initAndJoin();
    } else {
      leaveChannel();
    }
    
    return () => {
      leaveChannel();
    };
  }, [isActive]);

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
          console.log(`Successfully joined: ${item.channelName}`);
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
        params: { channelName: item.channelName }
      });
      
      // 5. Join Channel (uid: 0 lets Agora assign us a unique audience ID)
      console.log('join token...', res.data.token)
      engine.current.joinChannel(res.data.token, item.channelName, 0, {});

    } catch (e) {
      console.error("Join Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const leaveChannel = () => {
    try {
      engine.current.leaveChannel();
      setJoined(false);
      setRemoteUid(null);
    } catch (e) {
      console.log("Leave Error:", e);
    }
  };

  const handleRedirect = () => {
    // Navigate to a dedicated full-screen Interactive room if you have one
    if (navigation) {
      console.log("Redirecting to channel:", item.channelName);
        navigation.navigate('InteractiveRoom', { channelName: item.channelName, hosterinfo: item, userid: userid });

    } else {
        console.log("Redirecting to channel:", item.channelName);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Background Placeholder / Thumbnail */}
      {(!joined || !remoteUid) && (
        <Image 
            source={{ uri: item.thumbnail || 'https://via.placeholder.com/500' }} 
            style={styles.thumbnail} 
            blurRadius={10} 
        />
      )}

     {/* 2. Video Rendering Logic */}
{isActive && joined && remoteUid ? (
  <>
    {/* Host Video Stream */}
    <RtcSurfaceView 
      style={StyleSheet.absoluteFill}
      canvas={{ uid: remoteUid }} 
    />
    {/* Optional Debug Text */}
    <Text style={styles.debugText}>Streaming: {remoteUid}</Text>
  </>
) : (
  <View style={styles.noVideoContainer}>
     {/* Show the thumbnail as a background while waiting */}
     <Image 
        source={{ uri: item.thumbnail }} 
        style={StyleSheet.absoluteFill} 
        blurRadius={10} 
      />
      <View style={styles.centeredContent}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: 'white', marginTop: 10, fontWeight: 'bold' }}>
          Waiting for Host...
        </Text>
      </View>
  </View>
)}

      {/* 3. Interface Overlays */}
      <View style={styles.overlay}>
        
        {/* Host Info Section */}
        <View style={styles.hostHeader}>
          <Image source={{ uri: item.thumbnail }} style={styles.avatar} />
          <View>
            <Text style={styles.hostName}>@{item.hoster?.name || 'Hoster'}</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>● LIVE</Text>
            </View>
          </View>
        </View>

        {/* Stream Details */}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.viewers}>👥 {item.viewers_count || 0} watching</Text>
        
        {/* Redirect / Join Button */}
        <TouchableOpacity style={styles.watchBtn} onPress={handleRedirect}>
             <MaterialCommunityIcons
                      name="access-point"
                      size={28}
                      color="#000"
                    />
           <Text style={styles.watchBtnText}> Watch live</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Spinner */}
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color="white" size="large" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    height: height, 
    width: width, 
    backgroundColor: '#000' 
  },
  thumbnail: { 
    ...StyleSheet.absoluteFillObject, 
    opacity: 0.5 
  },
  overlay: { 
    position: 'absolute', 
    bottom: 60, // Adjust based on your TabBar height
    left: 20, 
    right: 20 
  },
  hostHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 2, 
    borderColor: '#fff',
    marginRight: 12
  },
  hostName: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  liveBadge: { 
    backgroundColor: '#ff0000', 
    paddingHorizontal: 6, 
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2
  },
  liveText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  title: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600',
    marginBottom: 5
  },
  viewers: { 
    color: '#ddd', 
    fontSize: 14,
    marginBottom: 15
  },
  watchBtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  watchBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  },
  debugText: { 

  },  
  noVideoContainer: { }, centeredContent: {}
});

export default ListofLiveChild;