import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    TextInput,
    Dimensions, Pressable, StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Video } from "react-native-video";
import StoryViewersSheet from "./StoryViewersSheet";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AntDesign from "react-native-vector-icons/AntDesign"; //Entypo
import Entypo from "react-native-vector-icons/Entypo"; //Entypo
import { MaterialIcons } from "react-native-vector-icons/MaterialIcons"; // for mute/unmute icon
import { useVideoController } from "../../hooks/useVideoController";
import * as base from "../../../component/global";
import api from "../../../component/api";
import { useUser } from "../../context/UserContext";
import Toast from "react-native-toast-message";
import uuid from "react-native-uuid";
//import EmojiGrid from "../../component/emoji/EmojiGrid";

const { width, height } = Dimensions.get("window");

//const ReelItem = ({ reel, isActive, onClose }) => {

/* How long an image story stays up. Videos run to their own length. */
const IMAGE_STORY_MS = 5000;

const StoryItem = ({
    reel, isActive, navigation, onVideoEnd, onClose,
    index = 0, total = 1, onPrev, onDeleted,
}) => {
    //const StoryItem = ({ item, navigation, onVideoEnd }) => {
    const [muted, setMuted] = useState(true); // 👈 Mute state
    //  const [isPaused, setIsPaused] = useState(false);

    const [emojiEnable, setEmojiEnable] = useState(false)
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const [deleting, setDeleting] = useState(false);
    /* Held while a finger is down, while the reply box has focus, and while a
       sheet is open -- a story that keeps advancing under a dialog is the
       single most irritating thing a story viewer can do. */
    const [held, setHeld] = useState(false);
    const progress = useRef(new Animated.Value(0)).current;
    /* One view per story per mount. The endpoint is idempotent -- it returns
       `counted: false` for a repeat -- but there is no reason to ask twice as
       the carousel scrolls back and forth. */
    const viewedRef = useRef(new Set());
    const { user } = useUser();
    const me = user?._id;
    const hasSound = !!reel.sound;
    /*
      Same guard as the reel list. `?.` protects against null and undefined, not
      against a value that simply is not a string — and videoUrl arrives as an
      array from some rows and as { url, type } from others. Calling .endsWith on
      those throws "_reel$videoUrl.endsWith is not a function" and takes the
      story viewer down, which is what happened opening your own story.
    */
    const mediaUrl = Array.isArray(reel?.videoUrl)
        ? String(reel.videoUrl[0]?.url || reel.videoUrl[0] || '')
        : typeof reel?.videoUrl === 'string'
            ? reel.videoUrl
            : String(reel?.videoUrl?.url || '');
    const endsWithAny = (exts) => exts.some((e) => mediaUrl.toLowerCase().endsWith(e));

    const isVideo = endsWithAny(['.mp4', '.m3u8', '.mov', '.webm']);
    const isImage = endsWithAny(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

    /*
      mediaUrl above only decided which branch to render; the branches
      themselves still handed the raw videoUrl to source.uri. When that value
      is the { url, type } object the API sends, React Native gets a map where
      it requires a string and the whole app red-screens with 'Value for uri
      cannot be cast from ReadableNativeMap to String'. The normalised string
      is what has to reach the view, made absolute for the relative paths the
      server stores.
    */
    const absolute = (p) =>
        !p ? null
        : /^(https?:|file:|data:)/.test(p) ? p
        : `${base.BASE_URL}/${String(p).replace(/^[/]+/, '')}`;
    const mediaSrc = absolute(mediaUrl);

    /* The header avatar was pointed at videoUrl — the story's own media —
       so every story showed itself as a 40px circle beside the name. */
    const avatarSrc = absolute(reel?.userInfo?.image);
    const {
        videoRef,
        isVideoMuted,
        isPaused,
        setIsPaused
    } = useVideoController({
        isActive,
        videoUrl: reel.videoUrl,
        soundData: reel.sound,
        checkvideosoundisenableornot: reel.videosound,
        hasSound
    });


    const togglePause = () => {
        setIsPaused(prev => !prev);
    };



    const handleClose = () => {
        if (onClose) onClose();
    };
    /*
      Quick reactions.

      This set `emojiEnable` to true and nothing ever set it back, while the
      panel it was meant to open (EmojiGrid) is still commented out at the top
      of this file. So the smiley was a button that did nothing -- and once the
      story auto-advances, a flag that pauses playback with no way to clear it
      would have wedged the story instead. A toggle, and a row that puts the
      emoji where the reply is being typed.
    */
    const QUICK_REACTIONS = ["😂", "😮", "😍", "😢", "👏", "🔥"];
    const emojiHandle = () => setEmojiEnable((prev) => !prev);

    const paused = !isActive || isPaused || held || showViewers || emojiEnable;

    /*
      Advance on its own.

      `onVideoEnd` was a prop that nothing ever called: there was no `onEnd` on
      the video and no timer for an image, so a story never moved on and never
      closed. You opened one and it sat there until you swiped or found the X.
      That is most of what "it doesn't feel reactive" was.

      The bar is driven by the same clock, so what you see is what is actually
      counting down. A video reports its own duration; an image gets a fixed
      five seconds, which is the length every other app uses.
    */
    const [videoDuration, setVideoDuration] = useState(null);
    const runFor = isVideo && videoDuration ? videoDuration * 1000 : IMAGE_STORY_MS;

    useEffect(() => {
        if (!isActive) {
            progress.setValue(0);
            return;
        }
        if (paused) {
            progress.stopAnimation();
            return;
        }

        // Resume from wherever it got to rather than restarting on every pause.
        progress.stopAnimation((value) => {
            const remaining = Math.max(runFor * (1 - (value || 0)), 0);
            Animated.timing(progress, {
                toValue: 1,
                duration: remaining,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) onVideoEnd?.();
            });
        });
    }, [isActive, paused, runFor]);

    // A new story starts its bar from empty.
    useEffect(() => { progress.setValue(0); }, [reel?._id]);

    /*
      Delete your own story.

      Soft delete: the server marks it `deleted` rather than dropping the row,
      so the notifications and replies that point at it do not dangle.
    */
    const confirmDelete = () => {
        Alert.alert(
            "Delete story",
            "This removes it for everyone. It can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await api.delete(`/apis/posting/posts/${reel?._id}`, {
                                data: { userId: me },
                            });
                            onDeleted?.(reel?._id);
                        } catch (e) {
                            Toast.show({
                                type: "error",
                                text1: "Could not delete the story",
                                text2: e?.response?.data?.message || "Please try again.",
                                position: "bottom",
                            });
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    /* Posted-at, in the form a person reads. */
    const postedAgo = (() => {
        const iso = reel?.xtime || reel?.createdAt;
        if (!iso) return "";
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h`;
    })();

    const storyOwnerId = String(
        reel?.userInfo?._id || reel?.username?._id || reel?.username || ""
    );
    const isMyStory = !!me && storyOwnerId === String(me);

    /*
      Count the view.

      POST /apis/feed/content/:id/view has existed all along and nothing ever
      called it, which is why the poster's counter sat at zero no matter how
      many people opened the story. The server ignores a repeat view from the
      same person, so the count is viewers rather than openings, and it fires
      the "viewed your story" notification on the first one only.

      Your own story is skipped: watching yourself is not a view, and it would
      notify you about yourself.
    */
    useEffect(() => {
        const id = reel?._id;
        if (!isActive || !id || !me || isMyStory) return;
        if (viewedRef.current.has(String(id))) return;
        viewedRef.current.add(String(id));

        api.post(`/apis/feed/content/${id}/view`, { userId: me })
            .catch((e) => {
                // A view is bookkeeping; failing to record one must never
                // interrupt watching. Allow a retry on the next pass.
                viewedRef.current.delete(String(id));
                console.log("story view not recorded:", e?.response?.data?.message || e?.message);
            });
    }, [isActive, reel?._id, me, isMyStory]);

    /*
      Reply to a story.

      The input was decoration: a TextInput with no value, no handler, and an
      arrow that was an icon rather than a button. Nothing it typed went
      anywhere.

      A reply is an ordinary direct message to the person who posted, which is
      what "it should go to the poster's messages" means and what every story
      reply is underneath. Routed through /apis/send-message so it takes exactly
      the same path as a message sent from the chat screen -- the same privacy
      rules decide whether it is allowed, the same socket delivers it, and the
      same offline notification fires if they are not connected.
    */
    const sendReply = async () => {
        const text = replyText.trim();
        if (!text || sendingReply) return;

        if (!me) {
            Toast.show({ type: "error", text1: "You are not signed in", position: "bottom" });
            return;
        }
        if (!storyOwnerId) {
            Toast.show({ type: "error", text1: "Can't tell whose story this is", position: "bottom" });
            return;
        }

        setSendingReply(true);
        // Cleared up front: the reply is going, and leaving the text sitting
        // there invites a double send on a slow connection.
        setReplyText("");

        try {
            const res = await api.post("/apis/send-message", {
                clientMessageId: String(uuid.v4()),
                sender: me,
                receiver: storyOwnerId,
                msgByUserId: me,
                text,
                type: "private",
                messagetype: "text",
                createdAt: new Date().toISOString(),
                /*
                  What is being replied to. The media url is copied rather than
                  looked up later because the story is gone within a day and the
                  bubble still has to show what the reply was about.
                */
                storyReply: { story: reel?._id, mediaUrl: mediaSrc || "" },
            });

            if (res.data?.success === false) throw new Error(res.data?.message);
            Toast.show({ type: "success", text1: "Reply sent", position: "bottom" });
        } catch (e) {
            /*
              A refusal is not a network failure. The server answers 403 when
              the poster's privacy settings mean this message will never be
              delivered, and saying "try again" about that is a lie.
            */
            const refused = e?.response?.status === 403;
            Toast.show({
                type: "error",
                text1: refused ? "You can't message this account" : "Reply not sent",
                text2: refused ? undefined : "Please try again.",
                position: "bottom",
            });
            setReplyText(text);   // hand it back so it is not lost
        } finally {
            setSendingReply(false);
        }
    };

    return (
        <View style={{ width, height, backgroundColor: "#000" }}>
            {/* if video */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                {isVideo ? (
                    <Pressable onPress={togglePause}>
                        <Video
                            ref={videoRef}
                            source={{ uri: mediaSrc }}
                            style={{
                                //  ...StyleSheet.absoluteFillObject,
                                width: '100%',
                                height: '100%',
                            }}
                            resizeMode="cover"
                            paused={paused}
                            /* Was repeat -- a video story looped forever and
                               never handed over to the next one. */
                            repeat={false}
                            muted={isVideoMuted}
                            onLoad={(meta) => setVideoDuration(meta?.duration || null)}
                            onEnd={() => onVideoEnd?.()}
                        />
                    </Pressable>
                ) : isImage ? (
                    <Image
                        source={{ uri: mediaSrc }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-white text-xl">{reel.videoTitle}</Text>
                    </View>
                )}
                {/*
                  Tap zones.

                  There was no way to move between stories except a horizontal
                  swipe, which is not what anybody tries -- every story viewer
                  in existence advances on a tap to the right and goes back on a
                  tap to the left. Holding pauses, which is the other universal
                  gesture. These sit under the header and the reply bar, so the
                  controls still win.
                */}
                <Pressable
                    style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: width * 0.3 }}
                    onPress={() => onPrev?.()}
                    onLongPress={() => setHeld(true)}
                    onPressOut={() => setHeld(false)}
                    delayLongPress={200}
                />
                <Pressable
                    style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: width * 0.7 }}
                    onPress={() => onVideoEnd?.()}
                    onLongPress={() => setHeld(true)}
                    onPressOut={() => setHeld(false)}
                    delayLongPress={200}
                />

                {/*
                  Segment bars.

                  One per story in this person's ring, the active one filling in
                  real time. Without them there is no way to tell how many
                  stories there are, which one you are on, or how long it will
                  stay -- so every story felt like it might be stuck.
                */}
                <View style={styles.progressRow}>
                    {Array.from({ length: total }).map((_, i) => (
                        <View key={i} style={styles.progressTrack}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    i < index && { width: "100%" },
                                    i === index && {
                                        width: progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ["0%", "100%"],
                                        }),
                                    },
                                    i > index && { width: "0%" },
                                ]}
                            />
                        </View>
                    ))}
                </View>

                <View
                    style={{
                        position: "absolute",
                        top: 40,
                        left: 20,
                        right: 20,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Image
                            source={avatarSrc ? { uri: avatarSrc } : require("../../../assets/user.png")}
                            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                        />
                        <Text style={{ color: "#fff", fontSize: 16 }}>
                            {reel?.userInfo?.name}
                        </Text>
                        {/* When it was posted. A story is a thing with a
                            deadline; not saying how old it is leaves out the
                            one fact that matters about it. */}
                        {!!postedAgo && (
                            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginLeft: 8 }}>
                                {postedAgo}
                            </Text>
                        )}
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {/*    <TouchableOpacity
            onPress={handleStopMedia}
            style={{ marginRight: 15 }}
          >
            <Entypo name="controller-stop" size={24} color="#fff" />
          </TouchableOpacity>
 */}
                        {/* Mute Button */}
                        {/*    <TouchableOpacity
            onPress={() => {
              handleMute();
            }}
            style={{ marginRight: 15 }}
          >
            <MaterialIcons
              name={muted ? "volume-up" : "volume-off"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
 */}
                        {/* Deleting is offered on your own story only, which
                            is also what the server enforces. */}
                        {isMyStory && (
                            <TouchableOpacity
                                onPress={confirmDelete}
                                disabled={deleting}
                                style={{ marginRight: 18 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                {deleting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <AntDesign name="delete" size={22} color="#fff" />}
                            </TouchableOpacity>
                        )}

                        {/* Close Button */}
                        <TouchableOpacity onPress={handleClose}>
                            <AntDesign name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View
                    style={{
                        position: "absolute",
                        bottom: 40,
                        left: 20,
                        right: 20,

                    }}
                >

                    <View style={{ position: "absolute", bottom: 0, left: 20, right: 20 }}>
                        {/*
                          The bottom bar depends on whose story it is.

                          It was a reply box for everyone, so the poster was
                          invited to send themselves a message about their own
                          story -- which does nothing anybody wants. What a
                          poster actually comes back for is who watched, and
                          that had no home at all: the rail showed a count and
                          there was nowhere to find the names behind it.

                          So: your own story gets the audience, everyone else's
                          gets the reply box.
                        */}
                        {isMyStory ? (
                            <TouchableOpacity
                                style={styles.seenByBar}
                                onPress={() => setShowViewers(true)}
                                activeOpacity={0.8}
                            >
                                <AntDesign name="eye" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.seenByText}>
                                    {(() => {
                                        const n = reel?.views || 0;
                                        if (!n) return "No views yet";
                                        return n === 1 ? "Seen by 1 person" : `Seen by ${n} people`;
                                    })()}
                                </Text>
                                {(reel?.views || 0) > 0 && (
                                    <AntDesign name="right" size={14} color="rgba(255,255,255,0.7)" />
                                )}
                            </TouchableOpacity>
                        ) : (
                            <>
                            {emojiEnable && (
                                <View style={styles.reactionRow}>
                                    {QUICK_REACTIONS.map((e) => (
                                        <TouchableOpacity
                                            key={e}
                                            onPress={() => {
                                                setReplyText((prev) => prev + e);
                                                setEmojiEnable(false);
                                            }}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                            <Text style={styles.reactionEmoji}>{e}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <View style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "rgba(0,0,0,0.5)",
                                borderRadius: 30,
                                paddingHorizontal: 15,
                                paddingVertical: 10,
                            }}  >
                                <TouchableOpacity onPress={emojiHandle}>
                                    <FontAwesome
                                        name="smile-o"
                                        size={22}
                                        color="#fff"
                                        style={{ marginRight: 10 }}
                                    />
                                </TouchableOpacity>

                                <TextInput
                                    placeholder="Send message"
                                    placeholderTextColor="#ccc"
                                    style={{ flex: 1, color: "#fff", fontSize: 16 }}
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    editable={!sendingReply}
                                    onSubmitEditing={sendReply}
                                    returnKeyType="send"
                                    blurOnSubmit={false}
                                    /* Typing a reply must not let the story run
                                       out from under the keyboard. */
                                    onFocus={() => setHeld(true)}
                                    onBlur={() => setHeld(false)}
                                />
                                {/* The arrow was a bare icon -- nothing to press.
                                    Dimmed until there is something to send. */}
                                <TouchableOpacity
                                    onPress={sendReply}
                                    disabled={!replyText.trim() || sendingReply}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <AntDesign
                                        name="arrowup"
                                        size={24}
                                        color={replyText.trim() && !sendingReply ? "#fff" : "#777"}
                                    />
                                </TouchableOpacity>
                            </View>
                            </>
                        )}
                    </View>
                </View>

                <StoryViewersSheet
                    visible={showViewers}
                    storyId={reel?._id}
                    viewerId={me}
                    onClose={() => setShowViewers(false)}
                />
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    progressRow: {
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        flexDirection: "row",
    },
    progressTrack: {
        flex: 1,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.35)",
        marginHorizontal: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#fff",
    },
    seenByBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    seenByText: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    reactionRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    reactionEmoji: { fontSize: 26 },
});


export default StoryItem;


