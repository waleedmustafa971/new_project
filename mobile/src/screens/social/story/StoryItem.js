import React, { useState } from "react";
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    TextInput,
    Dimensions, Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Video } from "react-native-video";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AntDesign from "react-native-vector-icons/AntDesign"; //Entypo
import Entypo from "react-native-vector-icons/Entypo"; //Entypo
import { MaterialIcons } from "react-native-vector-icons/MaterialIcons"; // for mute/unmute icon
import { useVideoController } from "../../hooks/useVideoController";
//import EmojiGrid from "../../component/emoji/EmojiGrid";

const { width, height } = Dimensions.get("window");

//const ReelItem = ({ reel, isActive, onClose }) => {

const StoryItem = ({ reel, isActive, navigation, onVideoEnd, onClose }) => {
    //const StoryItem = ({ item, navigation, onVideoEnd }) => {
    const [muted, setMuted] = useState(true); // 👈 Mute state
    //  const [isPaused, setIsPaused] = useState(false);

    const [emojiEnable, setEmojiEnable] = useState(false)
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
    const emojiHandle = () => {
        setEmojiEnable(true)
    }

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
                            source={{ uri: reel.videoUrl }}
                            style={{
                                //  ...StyleSheet.absoluteFillObject,
                                width: '100%',
                                height: '100%',
                            }}
                            resizeMode="cover"
                            paused={!isActive || isPaused}
                            repeat={true}
                            muted={isVideoMuted}
                        />
                    </Pressable>
                ) : isImage ? (
                    <Image
                        source={{ uri: reel.videoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-white text-xl">{reel.videoTitle}</Text>
                    </View>
                )}
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
                            source={{ uri: reel?.videoUrl }}
                            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                        />
                        <Text style={{ color: "#fff", fontSize: 16 }}>
                            {reel?.userInfo?.name}
                        </Text>
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

                    <View className="w-full border-2 border-red-500 mb-2 flex-row">
                        {/*  <EmojiGrid/> */}
                    </View>
                    <View style={{ position: "absolute", bottom: 0, left: 20, right: 20 }}>
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
                            />
                            <AntDesign name="arrowup" size={24} color="#fff" />
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default StoryItem;


