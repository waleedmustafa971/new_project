import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Platform, PermissionsAndroid, StatusBar, Alert,
} from "react-native";
import {
  createAgoraRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  VideoSourceType,
} from "react-native-agora";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../component/api";
import * as base from "../../component/global";
import { useSocket } from "../context/SocketContext";

/*
  One screen for a whole call, in either direction.

  The calling backend has been complete for a while — start, answer, decline,
  end, per-participant media state, history — and nothing in the app ever
  called it, so a DM had no way to place a call at all.

  Outgoing and incoming share this screen because after the first moment they
  are the same thing: two people in an Agora channel. Only how it opens
  differs, and that is one route param. Keeping them together means the
  controls, the teardown and the socket handling exist once instead of twice.
*/

type Peer = { _id?: string; name?: string; image?: string };

const avatarFor = (image?: string) => {
  if (!image) return require("../../assets/user.png");
  const p = String(image);
  const uri = /^(https?:|file:|data:)/.test(p)
    ? p
    : `${base.BASE_URL}/${p.replace(/^[/]+/, "")}`;
  return { uri };
};

const mmss = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const CallScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { socket } = useSocket();

  const {
    callId: initialCallId,
    channelName: initialChannel,
    kind = "audio",
    token: initialToken,
    uid: initialUid,
    appId: initialAppId,
    peer = {} as Peer,
    incoming = false,
  } = route.params || {};

  const isVideo = kind === "video";

  const engineRef = useRef<IRtcEngine | null>(null);
  const callIdRef = useRef<string | null>(initialCallId || null);
  /* Ending can be reached from the button, the socket and unmount at once;
     without this the call is ended three times and two of them conflict. */
  const endedRef = useRef(false);

  const [phase, setPhase] = useState<"ringing" | "connecting" | "ongoing" | "ended">(
    incoming ? "ringing" : "connecting"
  );
  const [statusLine, setStatusLine] = useState(incoming ? "Incoming call" : "Calling...");
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(isVideo);
  const [speakerOn, setSpeakerOn] = useState(isVideo);
  /* An RtcSurfaceView attached before the engine exists renders a black
     rectangle and never recovers, because nothing re-attaches it. The self
     view waits for the engine instead. */
  const [engineReady, setEngineReady] = useState(false);

  const me = useCallback(async () => {
    const raw = await AsyncStorage.getItem("userdata");
    return raw ? JSON.parse(raw)?._id : null;
  }, []);

  const teardown = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.leaveChannel();
      engine.release();
      engineRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (why: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase("ended");
      setStatusLine(why);
      teardown();
      setTimeout(() => navigation.goBack(), 900);
    },
    [navigation, teardown]
  );

  /* ------------------------------------------------------------ */
  /* Agora                                                         */
  /* ------------------------------------------------------------ */

  const join = useCallback(
    async (creds: { appId?: string; token?: string; uid?: number; channelName?: string }) => {
      const appId = creds.appId || initialAppId || base.AGORA_APP_ID;
      const channel = creds.channelName || initialChannel;
      if (!appId || !channel || !creds.token) {
        Alert.alert("Call failed", "This call could not be set up.");
        navigation.goBack();
        return;
      }

      if (Platform.OS === "android") {
        const wanted = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (isVideo) wanted.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        const granted = await PermissionsAndroid.requestMultiple(wanted);
        if (granted["android.permission.RECORD_AUDIO"] !== "granted") {
          Alert.alert("Microphone needed", "A call needs the microphone.");
          navigation.goBack();
          return;
        }
      }

      const engine = createAgoraRtcEngine();
      engine.initialize({ appId });

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          setStatusLine(incoming ? "Connecting..." : "Ringing...");
        },
        onUserJoined: (_c: any, uid: number) => {
          setRemoteUid(uid);
          setPhase("ongoing");
        },
        /* The other side hanging up is what ends the call here — waiting for
           the server round trip would leave a dead screen up meanwhile. */
        onUserOffline: () => finish("Call ended"),
        onError: (err: any, msg: any) => console.warn("[call] agora", err, msg),
      });

      /* Communication profile, not live broadcasting: both sides publish and
         subscribe, and Agora tunes for two-way latency rather than a stream. */
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      engine.enableAudio();
      if (isVideo) {
        engine.enableVideo();
        engine.startPreview();
      } else {
        engine.disableVideo();
      }
      engine.setEnableSpeakerphone(isVideo);

      engine.joinChannel(creds.token, channel, creds.uid ?? 0, {});
      engineRef.current = engine;
      setEngineReady(true);
    },
    [initialAppId, initialChannel, isVideo, incoming, navigation, finish]
  );

  /* An outgoing call already holds its credentials from the start response. */
  useEffect(() => {
    if (!incoming && initialToken) {
      join({
        token: initialToken,
        uid: initialUid,
        appId: initialAppId,
        channelName: initialChannel,
      });
    }
    return () => {
      teardown();
      /*
        Leaving the screen any other way than hanging up — the back gesture, a
        navigation reset — must still close the call, or it stays open on the
        server and the next call is refused with "You are already on a call".
        endedRef means the deliberate paths do not send this twice.
      */
      if (!endedRef.current && callIdRef.current) {
        endedRef.current = true;
        AsyncStorage.getItem("userdata")
          .then((raw) => {
            const userId = raw ? JSON.parse(raw)?._id : null;
            if (!userId) return;
            return api.post(`/apis/messaging/calls/${callIdRef.current}/end`, { userId });
          })
          .catch(() => {
            /* The server expires an abandoned call on its own; this is the
               tidy path, not the only one. */
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ */
  /* Answer, decline, hang up                                      */
  /* ------------------------------------------------------------ */

  const answer = async () => {
    try {
      setPhase("connecting");
      setStatusLine("Connecting...");
      const userId = await me();
      const { data } = await api.post(
        `/apis/messaging/calls/${callIdRef.current}/answer`,
        { userId }
      );
      await join({
        token: data?.token,
        uid: data?.uid,
        appId: data?.appId,
        channelName: data?.call?.channelName || initialChannel,
      });
    } catch (e: any) {
      Alert.alert(
        "Could not join",
        e?.response?.data?.message || "That call is no longer available."
      );
      finish("Call ended");
    }
  };

  const hangUp = async () => {
    /* Before anyone answers, leaving is a decline; after, it ends the call.
       The server treats them differently and so does the history row. */
    const path = phase === "ringing" ? "decline" : "end";
    try {
      const userId = await me();
      await api.post(`/apis/messaging/calls/${callIdRef.current}/${path}`, { userId });
    } catch {
      /* Hanging up is a local decision — a failed report must not trap
         anyone on a call screen they have already left. */
    }
    finish(path === "decline" ? "Declined" : "Call ended");
  };

  /* ------------------------------------------------------------ */
  /* Socket                                                        */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    if (!socket) return;
    const mine = (callId: any) => String(callId) === String(callIdRef.current);

    const onAnswered = ({ callId }: any) => {
      if (mine(callId)) setStatusLine("Connecting...");
    };
    const onEnded = ({ callId, status }: any) => {
      if (mine(callId)) finish(status === "declined" ? "Call declined" : "Call ended");
    };
    const onMissed = ({ callId }: any) => {
      if (mine(callId)) finish("No answer");
    };

    socket.on("callAnswered", onAnswered);
    socket.on("callEnded", onEnded);
    socket.on("callMissed", onMissed);
    socket.on("callParticipantDeclined", onEnded);

    return () => {
      socket.off("callAnswered", onAnswered);
      socket.off("callEnded", onEnded);
      socket.off("callMissed", onMissed);
      socket.off("callParticipantDeclined", onEnded);
    };
  }, [socket, finish]);

  /* The timer starts when the other side is actually there, not when the
     screen opened — otherwise a 40 second ring reads as 40 seconds of call. */
  useEffect(() => {
    if (phase !== "ongoing") return;
    setStatusLine("");
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  /* ------------------------------------------------------------ */
  /* Controls                                                      */
  /* ------------------------------------------------------------ */

  /* Mic and camera state is per-participant on the server, so the other side
     can show that you muted rather than inferring it from silence. */
  const reportMedia = async (mic: boolean, camera: boolean) => {
    try {
      const userId = await me();
      await api.post(`/apis/messaging/calls/${callIdRef.current}/media`, {
        userId, micOn: mic, cameraOn: camera,
      });
    } catch {
      /* Presentational only — never worth interrupting a call over. */
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    engineRef.current?.muteLocalAudioStream(!next);
    reportMedia(next, cameraOn);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    engineRef.current?.muteLocalVideoStream(!next);
    reportMedia(micOn, next);
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    engineRef.current?.setEnableSpeakerphone(next);
  };

  /* ------------------------------------------------------------ */

  const showRemoteVideo = isVideo && remoteUid !== null && phase === "ongoing";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1020" />

      {showRemoteVideo ? (
        <RtcSurfaceView
          style={StyleSheet.absoluteFillObject}
          canvas={{ uid: remoteUid as number, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <View style={styles.identity}>
          <Image source={avatarFor(peer?.image)} style={styles.avatar} />
          <Text style={styles.name}>{peer?.name || "Unknown"}</Text>
          <Text style={styles.status}>
            {phase === "ongoing" ? mmss(seconds) : statusLine}
          </Text>
          <Text style={styles.kindHint}>
            {isVideo ? "Video call" : "Voice call"}
          </Text>
        </View>
      )}

      {isVideo && cameraOn && engineReady && phase !== "ended" && (
        <View style={styles.selfView}>
          <RtcSurfaceView
            style={styles.selfVideo}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
            zOrderMediaOverlay
          />
        </View>
      )}

      {showRemoteVideo && (
        <View style={styles.videoHeader}>
          <Text style={styles.videoName}>{peer?.name}</Text>
          <Text style={styles.videoTimer}>{mmss(seconds)}</Text>
        </View>
      )}

      {phase === "ringing" ? (
        <View style={styles.answerRow}>
          <TouchableOpacity style={[styles.round, styles.decline]} onPress={hangUp}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.round, styles.accept]} onPress={answer}>
            <Ionicons name={isVideo ? "videocam" : "call"} size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.round, styles.neutral, !micOn && styles.active]}
            onPress={toggleMic}
          >
            <Ionicons name={micOn ? "mic" : "mic-off"} size={22} color={micOn ? "#fff" : "#0B1020"} />
          </TouchableOpacity>

          {isVideo ? (
            <>
              <TouchableOpacity
                style={[styles.round, styles.neutral, !cameraOn && styles.active]}
                onPress={toggleCamera}
              >
                <Ionicons
                  name={cameraOn ? "videocam" : "videocam-off"}
                  size={22}
                  color={cameraOn ? "#fff" : "#0B1020"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.round, styles.neutral]}
                onPress={() => engineRef.current?.switchCamera()}
              >
                <Ionicons name="camera-reverse" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.round, styles.neutral, speakerOn && styles.active]}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={speakerOn ? "volume-high" : "volume-low"}
                size={22}
                color={speakerOn ? "#0B1020" : "#fff"}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.round, styles.decline]} onPress={hangUp}>
            <Ionicons
              name="call"
              size={24}
              color="#fff"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1020" },
  identity: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  avatar: { width: 116, height: 116, borderRadius: 58, backgroundColor: "#1E2637" },
  name: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 20 },
  status: { color: "#9AA6BF", fontSize: 15, marginTop: 8, minHeight: 20 },
  kindHint: { color: "#5C6B8A", fontSize: 12.5, marginTop: 26, letterSpacing: 0.4 },
  selfView: {
    position: "absolute", right: 16, top: 60, width: 108, height: 156,
    borderRadius: 12, overflow: "hidden", backgroundColor: "#131A2A",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  selfVideo: { width: "100%", height: "100%" },
  videoHeader: { position: "absolute", top: 56, left: 20 },
  videoName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  videoTimer: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  controlRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 18, paddingBottom: 54, paddingTop: 20,
  },
  answerRow: {
    flexDirection: "row", justifyContent: "space-evenly", alignItems: "center",
    paddingBottom: 64, paddingTop: 20,
  },
  round: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  neutral: { backgroundColor: "rgba(255,255,255,0.15)" },
  active: { backgroundColor: "rgba(255,255,255,0.85)" },
  accept: { backgroundColor: "#22C55E", width: 68, height: 68, borderRadius: 34 },
  decline: { backgroundColor: "#EF4444", width: 68, height: 68, borderRadius: 34 },
});
