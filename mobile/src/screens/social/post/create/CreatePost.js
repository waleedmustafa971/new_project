import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";

import { SafeAreaView, Platform, StatusBar } from "react-native";
// import Slider from "@react-native-community/slider";
//import FeelingPicker from "./FeelingPicker";
//import * as ImagePicker from "expo-image-picker";
import { launchImageLibrary } from 'react-native-image-picker';

//import * as MediaLibrary from "expo-media-library";
import { Video } from "react-native-video";
import { Sound } from "react-native-sound";
//import MusicModal from "../createpost/MusicModal";
import MusicModal from "../../music/MusicModal";
import * as base from "../../../../component/global";
import ModalTagPeople from "../ModalTagPeople";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VolumeBar from "./VolumeBar";
import VolumeVisualizer from "./VolumeVisualizer";
import { useUser } from "../../../context/UserContext";
import api from "../../../../component/api";
import { FB } from "../../../../theme/social";

const CreatePost = ({ navigation }) => {
  const { user, setUserData, logout } = useUser();  
  console.log('..userinfo..', user)
  const inputRef = useRef(null);
  const [text, setText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [fontSize, setFontSize] = useState(14);
  const [tempFontSize, setTempFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000");
  //const [bgFontColor, setBgFontColor] = useState("#ffffff");
  const [bgFontColor, setBgFontColor] = useState(["#ffffff", "#ffffff"]); // "#ff7e5f", "#feb47b" default gradient
  const [showPickerfeeling, setShowPickerfeeling] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [visibility, setVisibility] = useState("Public");
  const IMAGE_SIZE = (Dimensions.get("window").width - 48) / 4; // 4 columns, 16px padding/margin
  // Inside your component
  //const soundRef = useRef(null);
  const soundRef = useRef<Sound | null>(null);
  const [volume, setVolume] = useState(1.0); // 1.0 = 100%
  const [showMusicModal, setShowMusicModal] = useState(null);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [playingId, setPlayingId] = useState(null); // this is play from child
  const [musiclist, setMusiclist] = useState(null); // this is play from child
  const [parentsoundstopStatus, setParentsoundstopStatus] = useState(null);
  const [showModalTagpeople, setShowModalTagpeople] = useState(null);
  const [userid, setUserid] = useState(null);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [shareGroup, setShareGroup] = useState([]);
  const [isloading, setIsloading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  /*
    Text styling is collapsed behind an "Aa" button.

    Alignment, size and colour used to be three permanent rows of a settings
    form stacked under the input -- the first thing you saw when you went to
    write something was a control panel. They are options, not the task, so
    they live behind one toggle now and the writing surface gets the screen.
  */
  const [showTextStyle, setShowTextStyle] = useState(false);

  const colorsdata = [
    "#000000", // Black
    "#ffffff", // White
    "#ff0000", // Red
    "#00ff00", // Lime
    "#0000ff", // Blue
    "#facc15", // Yellow (Tailwind style amber-400)
    "#ff7f50", // Coral
    "#ffa500", // Orange
    "#800080", // Purple
    "#4b0082", // Indigo
    "#00ffff", // Cyan
    "#008080", // Teal
    "#ff69b4", // Hot Pink
    "#a52a2a", // Brown
    "#808080", // Gray
    "#d2691e", // Chocolate
    "#1e90ff", // Dodger Blue
    "#32cd32", // Lime Green
    "#ff1493", // Deep Pink
    "#7fffd4", // Aquamarine
  ];

  const gradients = [
    ["#ff7e5f", "#feb47b"], // Peach
    ["#6a11cb", "#2575fc"], // Purple to Blue
    ["#ff6a00", "#ee0979"], // Orange to Pink
    ["#00c6ff", "#0072ff"], // Light Blue to Blue
    ["#f7971e", "#ffd200"], // Orange to Yellow
    ["#a1c4fd", "#c2e9fb"], // Soft Blue
    ["#667eea", "#764ba2"], // Indigo Purple
    ["#43e97b", "#38f9d7"], // Green to Aqua
    ["#f953c6", "#b91d73"], // Pink
    ["#30cfd0", "#330867"], // Teal to Purple
  ];

  const actions = [
    {
      icon: "photo-video",
      label: "Photo",
      lib: FontAwesome5,
      color: "text-green-600",
    },
   /*  {
      icon: "photo-video",
      label: "Video",
      lib: FontAwesome5,
      color: "text-green-600",
    }, */
    {
      icon: "user-plus",
      label: "Tag People",
      lib: Feather,
      color: "text-blue-600",
    },
    {
      icon: "emoji-emotions",
      label: "Feeling/Activity",
      lib: MaterialIcons,
      color: "text-yellow-500",
    },

    {
      icon: "music-note",
      label: "Music",
      lib: MaterialIcons,
      color: "text-indigo-500",
    },
  ];

  useEffect(() => {
    return () => {
      StopParentSound();
    };
  }, []);
  const pickMedia = async (type) => {
    const options = {
      mediaType: 'photo', // 'photo', 'video', or 'mixed'
      selectionLimit: 5, // set to 1 for single selection
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled media picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        setSelectedMedia(response.assets); // array of selected media
      }
    });
  };
  const StopParentSound = async () => {
    setParentsoundstopStatus(true);
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (e) {
        console.warn("Failed to stop parent sound:", e);
      }
    }

    // setPlayingId(null);
  };

  const renderMediaItem = ({ item, index }, media, setMedia) => {
    const remaining = media.length - 4;

    const removeItem = (i) => {
      const updated = media.filter((_, idx) => idx !== i);
      setMedia(updated);
    };

    const isLastVisible = index === 3 && remaining > 0;

    return (
      <View style={{ position: "relative", margin: 4 }}>
        <Image
          source={{ uri: item.uri }}
          style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: 8,
          }}
        />

        {/* Delete Icon */}
        <TouchableOpacity
          onPress={() => removeItem(index)}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 12,
            padding: 2,
          }}
        >
          <Ionicons name="close" size={14} color="white" />
        </TouchableOpacity>

        {/* +N Overlay */}
        {isLastVisible && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              +{remaining}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const checkType = (label) => {
    console.log("...chcktype...." + label);
    switch (label) {
      case "Photo":
        // handle photo/video
        pickMedia();
        break;
      case "Tag People":
        // handle tag people
        setShowModalTagpeople(true);
        break;
      case "Background Color":
        // handle background
        break;
      case "Feeling/Activity":
        setShowPickerfeeling();
        break;
      case "Music":
        setShowMusicModal(true);
        break;
      default:
        // fallback
        break;
    }
  };

const playMusicFromChild = (item) => {
  // Stop current sound if playing
  if (soundRef.current) {
    soundRef.current.stop(() => {
      soundRef.current.release();
      soundRef.current = null;
    });
  }

  const musicUrl = base.BASE_URL + item.musicfile;
  const newSound = new Sound(musicUrl, null, (error) => {
    if (error) {
      console.error('Failed to load sound', error);
      return;
    }

    // Play the sound
    newSound.play((success) => {
      if (success) {
        console.log('Playback finished successfully');
      } else {
        console.warn('Playback failed due to audio decoding errors');
      }

      // Clean up
      newSound.release();
      soundRef.current = null;
      setPlayingId(null);
    });

    soundRef.current = newSound;
    setPlayingId(item.musicname);
    setMusiclist({ id: item._id, file: item.musicfile });
  });
};

  
  const handleTaggedUsers = (users) => {
    console.log("Selected users from child:", users);
    setTaggedUsers(users);
  };

  const postSave = async () => {
    //  setIsloading(true)
    const userid = user._id;
    setIsloading(true);
    const formData = new FormData();
    selectedMedia.forEach((file, index) => {
      const isImage = file.type?.includes("image");

      formData.append("file", {
        uri: file.uri,
        type: isImage ? "image/jpeg" : "video/mp4", // Set appropriate MIME type
        name: `file_${index}.${isImage ? "jpg" : "mp4"}`,
      });
    });
    formData.append("videoTitle", text);
    formData.append("username", userid);
    formData.append("sound", JSON.stringify(musiclist));
    formData.append("tagpeople", JSON.stringify(taggedUsers));
    formData.append("location", "");
    formData.append("sharegroup", JSON.stringify(shareGroup));
    formData.append("posttype", "Post");
    formData.append("ispost", visibility);
    formData.append("posttypechild", "POST");
    formData.append("xbackgroundcolor", bgFontColor);
    formData.append("xfontstyle", '');
    formData.append("xfontsize", fontSize);
    formData.append("textalign", textAlign);
 
    console.log("...formdata....." + JSON.stringify(formData));
    try {
      const response = await api.post("/apis/postreel/updatePost",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("User updated:", response.data);
      if (response.data.message == "File uploaded and optimized locally successfully") {
        setIsloading(false);
        //  props.navigation.navicate("")
        StopParentSound();
        navigation.navigate("HomeSocial");
      } else {
        /*   Toast.show({
          type: "error",
          text1: "Image Updated",
          position: "bottom",
        }); */
        setIsloading(false);
      }
    } catch (error) {
      setIsloading(false);

      if (error.response) {
        // Server responded with a status code outside 2xx
        console.log("🔴 Response data:", error.response.data);
        console.log("🔴 Status:", error.response.status);
        console.log("🔴 Headers:", error.response.headers);
      } else if (error.request) {
        // Request was made but no response received
        console.log("🟡 No response received:", error.request);
      } else {
        // Something happened in setting up the request
        console.log("⚠️ Error message:", error.message);
      }

      Alert.alert("Upload Failed", "Something went wrong on the server.");
    }
  };

  /* A gradient is "chosen" only when it is not the default white-on-white. */
  const hasBackground =
    Array.isArray(bgFontColor) && bgFontColor[0] !== "#ffffff";
  const canPost = !!text.trim() || selectedMedia?.length > 0;

  const audience = visibility === "Public"
    ? { icon: "earth", label: "Public" }
    : { icon: "lock-closed", label: "Only me" };

  const avatarUri = user?.image
    ? (/^(https?:|file:|data:)/.test(user.image)
        ? user.image
        : `${base.BASE_URL}/${String(user.image).replace(/^\/+/, "")}`)
    : null;

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: FB.surface }}>
      {/*
        A Facebook composer, not a settings form.

        What was here was a stack of labelled rows -- Text Alignment, Font
        Size, Background Color, Font Color, "Who can see the reel?", then four
        more rows of actions -- every one of them permanently expanded. Writing
        a post meant scrolling past a control panel to find the box.

        The shape now is Facebook's: a header with one primary button, who you
        are and who can see it, the writing surface, and the options as a sheet
        at the foot of the screen.
      */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={26} color={FB.text} />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Create post</Text>

        {isloading ? (
          <ActivityIndicator color={FB.primary} />
        ) : (
          /* One primary action, and it says what it does. "Next" implied a
             second step that does not exist -- this posts. */
          <TouchableOpacity
            onPress={() => postSave()}
            disabled={!canPost}
            style={[styles.postBtn, !canPost && styles.postBtnOff]}
            activeOpacity={0.85}
          >
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextOff]}>
              Post
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        {/* Who is posting, and who can see it. The audience was a row at the
            bottom of the form labelled "Who can see the reel?" -- on a post. */}
        <View style={styles.identity}>
          <Image
            source={avatarUri ? { uri: avatarUri } : require("../../../../assets/user.png")}
            style={styles.identityAvatar}
          />
          <View style={{ marginLeft: 10 }}>
            <View style={styles.identityNameRow}>
              <Text style={styles.identityName} numberOfLines={1}>
                {user?.name || "You"}
              </Text>
              {selectedFeeling?.label ? (
                <Text style={styles.identityFeeling} numberOfLines={1}>
                  {" is feeling "}{selectedFeeling.emoji} {selectedFeeling.label}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.audienceChip}
              onPress={() =>
                setVisibility((prev) => (prev === "Public" ? "Private" : "Public"))
              }
              activeOpacity={0.7}
            >
              <Ionicons name={audience.icon} size={12} color={FB.textSecondary} />
              <Text style={styles.audienceText}>{audience.label}</Text>
              <Ionicons name="caret-down" size={10} color={FB.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* The writing surface. On a colour it centres and grows, the way a
            Facebook background post does; on white it is a plain tall field. */}
        {hasBackground ? (
          <LinearGradient colors={bgFontColor} style={styles.canvas}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              multiline
              style={[
                styles.canvasInput,
                { color: fontColor, fontSize: Math.max(fontSize, 22), textAlign: "center" },
              ]}
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(255,255,255,0.85)"
            />
          </LinearGradient>
        ) : (
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            multiline
            style={[
              styles.plainInput,
              { color: fontColor === "#ffffff" ? FB.text : fontColor, fontSize: Math.max(fontSize, 18), textAlign },
            ]}
            placeholder="What's on your mind?"
            placeholderTextColor={FB.textTertiary}
          />
        )}

        {/* Music, if one is attached — it was a floating strip in the header. */}
        {playingId ? (
          <View style={styles.musicChip}>
            <Ionicons name="musical-notes" size={15} color={FB.primary} />
            <Text style={styles.musicChipText} numberOfLines={1}>{playingId}</Text>
            <TouchableOpacity onPress={StopParentSound} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={FB.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedMedia?.length > 0 && (
          <View style={{ paddingHorizontal: 8 }}>
            {/* scrollEnabled={false} because the composer's ScrollView is the
                scroller here — which is also what stops React Native warning
                that a VirtualizedList is nested inside a plain ScrollView. */}
            <FlatList
              data={selectedMedia.slice(0, 4)}
              keyExtractor={(item, index) => index.toString()}
              numColumns={4}
              scrollEnabled={false}
              renderItem={(props) =>
                renderMediaItem(props, selectedMedia, setSelectedMedia)
              }
            />
          </View>
        )}

        {/* Background swatches. Hidden once there is media, because a coloured
            background behind a photo is not a thing Facebook offers and the
            two settings fight each other. */}
        {!selectedMedia?.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.swatchRow}
            contentContainerStyle={{ paddingHorizontal: 12, alignItems: "center" }}
          >
            {/* "Aa" clears back to plain — there was no way to undo picking a
                colour once you had. */}
            <TouchableOpacity
              onPress={() => { setBgFontColor(["#ffffff", "#ffffff"]); setFontColor("#000"); }}
              style={[styles.swatchPlain, !hasBackground && styles.swatchOn]}
            >
              <Text style={styles.swatchAa}>Aa</Text>
            </TouchableOpacity>

            {gradients?.map((g, i) => {
              const on = String(bgFontColor) === String(g);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setBgFontColor(g); setFontColor("#ffffff"); }}
                  style={[styles.swatch, on && styles.swatchOn]}
                >
                  <LinearGradient colors={g} style={styles.swatchFill} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Text styling, behind one button instead of three permanent rows. */}
        <TouchableOpacity
          style={styles.styleToggle}
          onPress={() => setShowTextStyle((v) => !v)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="format-color-text" size={18} color={FB.textSecondary} />
          <Text style={styles.styleToggleText}>Text style</Text>
          <Ionicons
            name={showTextStyle ? "chevron-up" : "chevron-down"}
            size={16}
            color={FB.textSecondary}
          />
        </TouchableOpacity>

        {showTextStyle && (
          <View style={styles.stylePanel}>
            <View style={styles.styleRow}>
              <Text style={styles.styleLabel}>Alignment</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  ["left", "format-align-left"],
                  ["center", "format-align-center"],
                  ["right", "format-align-right"],
                  ["justify", "format-align-justify"],
                ].map(([value, icon]) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setTextAlign(value)}
                    style={[styles.styleBtn, textAlign === value && styles.styleBtnOn]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={19}
                      color={textAlign === value ? FB.primary : FB.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.styleRow}>
              <Text style={styles.styleLabel}>Size</Text>
              <VolumeVisualizer onChange={setFontSize} />
            </View>

            <View style={[styles.styleRow, { alignItems: "center" }]}>
              <Text style={styles.styleLabel}>Colour</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: "center" }}
              >
                {colorsdata?.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setFontColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      fontColor === color && styles.colorDotOn,
                    ]}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        )}

      </ScrollView>
      {/* The options sheet. Same four actions, but as a card with coloured
          icons rather than four bare label/icon rows floating on white. */}
      <View style={styles.sheet}>
        <View style={styles.sheetGrabber} />
        {actions.map(({ icon, label, lib: Icon }, idx) => {
          const tint = {
            "Photo": "#45BD62",
            "Tag People": FB.primary,
            "Feeling/Activity": "#F7B928",
            "Music": "#8B5CF6",
          }[label] || FB.textSecondary;

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => checkType(label)}
              style={styles.sheetRow}
              activeOpacity={0.6}
            >
              <View style={[styles.sheetIcon, { backgroundColor: `${tint}1A` }]}>
                <Icon name={icon} size={17} color={tint} />
              </View>
              <Text style={styles.sheetLabel}>
                {label === "Photo" ? "Photo/video" : label}
              </Text>
              {label === "Photo" && selectedMedia?.length > 0 ? (
                <Text style={styles.sheetCount}>{selectedMedia.length}</Text>
              ) : null}
              {label === "Tag People" && taggedUsers?.length > 0 ? (
                <Text style={styles.sheetCount}>{taggedUsers.length}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showPickerfeeling}>
        {/*   <FeelingPicker
          navigation={navigation}
          onSelect={(item) => {
            setSelectedFeeling(item);
            setShowPickerfeeling(false);
          }}
        /> */}
      </Modal>
      {
        showMusicModal && (
          <MusicModal
            visible={showMusicModal}
            onClose={() => setShowMusicModal(false)}
            takeMusictoparents={playMusicFromChild}
            onSelect={(music) => {
              setSelectedMusic(music);
              setShowMusicModal(false);
              playSound(music.audio_url); // or store for export
            }}
          />
        )
      }

      {showModalTagpeople && (
        <ModalTagPeople
          visible={showModalTagpeople}
          onClose={() => setShowModalTagpeople(false)}
          onSelect={handleTaggedUsers}
        />
      )} 
 
    </SafeAreaProvider>
  );
};
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FB.divider,
    backgroundColor: FB.surface,
  },
  topTitle: { ...FB.font.title, flex: 1, marginLeft: 14 },
  postBtn: {
    backgroundColor: FB.primary,
    paddingHorizontal: 18,
    height: 34,
    borderRadius: FB.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  /* Greyed rather than hidden: the button has to stay where it is so its
     position does not jump the moment you type the first character. */
  postBtnOff: { backgroundColor: FB.fill },
  postBtnText: { color: FB.onPrimary, fontSize: 15, fontWeight: "700" },
  postBtnTextOff: { color: FB.textTertiary },

  identity: { flexDirection: "row", alignItems: "center", padding: 12 },
  identityAvatar: {
    width: FB.avatar.md, height: FB.avatar.md, borderRadius: FB.avatar.md / 2,
    backgroundColor: FB.fill,
  },
  identityNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  identityName: { ...FB.font.name, fontSize: 16 },
  identityFeeling: { ...FB.font.meta, fontSize: 14, color: FB.text },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: FB.radius.sm,
    backgroundColor: FB.fill,
  },
  audienceText: { ...FB.font.meta, fontSize: 12, fontWeight: "600" },

  canvas: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  canvasInput: { width: "100%", fontWeight: "700", textAlignVertical: "center" },
  plainInput: {
    minHeight: 150,
    paddingHorizontal: 14,
    paddingTop: 4,
    textAlignVertical: "top",
    lineHeight: 24,
  },

  musicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: FB.radius.md,
    backgroundColor: FB.primarySoft,
  },
  musicChipText: { ...FB.font.meta, color: FB.text, flex: 1 },

  swatchRow: { paddingVertical: 12 },
  swatch: {
    width: 34, height: 34, borderRadius: 8,
    marginRight: 8, overflow: "hidden",
    borderWidth: 1, borderColor: FB.divider,
  },
  swatchFill: { flex: 1 },
  swatchPlain: {
    width: 34, height: 34, borderRadius: 8, marginRight: 8,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: FB.divider, backgroundColor: FB.surface,
  },
  swatchAa: { fontSize: 13, fontWeight: "700", color: FB.text },
  swatchOn: { borderWidth: 2, borderColor: FB.primary },

  styleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    paddingVertical: 10,
  },
  styleToggleText: { ...FB.font.action, flex: 1 },
  stylePanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: FB.radius.lg,
    backgroundColor: FB.page,
  },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  styleLabel: { ...FB.font.meta, width: 76 },
  styleBtn: {
    width: 34, height: 30, borderRadius: FB.radius.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: FB.surface,
  },
  styleBtnOn: { backgroundColor: FB.primarySoft },
  colorDot: {
    width: 26, height: 26, borderRadius: 13, marginRight: 8,
    borderWidth: 1, borderColor: FB.divider,
  },
  colorDotOn: { borderWidth: 3, borderColor: FB.primary },

  /*
    Pinned to the bottom edge, outside the scroller.

    Inside it, the sheet floated wherever the content happened to end -- on an
    empty composer that left it stranded halfway up the screen with white
    below it. A sheet is a bottom-anchored surface or it is just a card.
  */
  sheet: {
    paddingTop: 8,
    paddingBottom: 6,
    borderTopLeftRadius: FB.radius.xl,
    borderTopRightRadius: FB.radius.xl,
    backgroundColor: FB.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FB.divider,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: FB.divider,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  sheetLabel: { ...FB.font.body, flex: 1, fontWeight: "500" },
  sheetCount: {
    ...FB.font.meta,
    fontWeight: "700",
    color: FB.primary,
  },

  container: {
    transform: [{ translateX: 0.5 * 100 }], // You may need to tweak this
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 200, // You can adjust this based on your UI
    height: 56, // 14 * 4
    paddingHorizontal: 16,
    borderRadius: 9999, // fully rounded
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  text: {
    color: "black",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    marginLeft: 16,
  },
});

export default CreatePost;
