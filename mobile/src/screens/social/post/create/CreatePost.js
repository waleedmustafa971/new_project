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

  return (
    <SafeAreaProvider>
      {/* Top Menu */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', padding: 5,
          backgroundColor: '#ffffff'
        }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="arrow-back" size={24} color="black"
            style={{ marginRight: 5 }} />
          <Text style={{ fontSize: 16 }}>Create Post</Text>
          <Text style={{ marginLeft: 8 }}>
            {selectedFeeling?.emoji} {selectedFeeling?.label}
          </Text>

        </TouchableOpacity>

        {playingId ? (
          <View style={styles.container}>
            <Text style={styles.text} numberOfLines={1}>
              {playingId.length > 18 ? playingId.substring(0, 18) + "..." : playingId}
            </Text>

            <TouchableOpacity style={styles.button} onPress={StopParentSound}>
              <Ionicons
                name={playingId ? "pause" : "play"}
                size={20}
                color={parentsoundstopStatus ? "red" : "black"}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Right side: Next button */}
        {isloading ? (
          <ActivityIndicator />
        ) : (
          <TouchableOpacity onPress={() => postSave()}>
            <Text style={{
              fontSize: 16, color: 'blue', marginRight: 7
            }}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Text Editor */}
      <ScrollView
        style={{
          borderWidth: 0,
          borderColor: "#000",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            borderWidth: 0,
            borderColor: "#df1b1b", flexDirection: 'row',
            alignItems: 'flex-start'
          }}
        >
          <LinearGradient
            colors={bgFontColor} // This should be an array like ['#ff7e5f', '#feb47b']
            style={{
              flex: 1,
              marginLeft: 0,
              padding: 2,
              height: 150,
            }}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              multiline
              style={{
                flexDirection: 'row', color: 'black',
                color: fontColor,
                fontSize,
                fontFamily,
                textAlignVertical: "top",
                textAlign: textAlign, // <- dynamically set
                padding: 12,
              }}
              placeholder="what is in your mind ?"
              placeholderTextColor="#aaa"
            />
          </LinearGradient>
        </View>

        {/* Picture and Video  */}
        {selectedMedia?.length > 0 && (
          <View
            style={{
              height: 180,
            }}
          >
            {/* scrollEnabled={false} because the composer's ScrollView is the
                scroller here — which is also what stops React Native warning
                that a VirtualizedList is nested inside a plain ScrollView.
                It is at most four thumbnails, so nothing is lost by rendering
                them all and letting the page scroll. */}
            <FlatList
              data={selectedMedia.slice(0, 4)}
              keyExtractor={(item, index) => index.toString()}
              numColumns={4}
              scrollEnabled={false}
              renderItem={(props) =>
                renderMediaItem(props, selectedMedia, setSelectedMedia)
              }
              contentContainerStyle={{ padding: 5 }}
            />
          </View>
        )}

        {/* End */}
        <View style={{
          width: '100%', padding: 10, marginTop: 15
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between'
          }}>
            <Text style={{
              fontSize: 14, marginBottom: 5
            }}>Text Alignment</Text>

            <View style={{
              flexDirection: 'row'
            }}>
              <TouchableOpacity style={{
                marginRight: 10
              }} onPress={() => setTextAlign('left')}>
                <MaterialCommunityIcons
                  name="format-align-left"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity style={{
                marginRight: 10
              }} onPress={() => setTextAlign('center')}>
                <MaterialCommunityIcons
                  name="format-align-center"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity style={{
                marginRight: 10
              }} onPress={() => setTextAlign('right')}>
                <MaterialCommunityIcons
                  name="format-align-right"
                  size={24}
                  color="black"
                />

              </TouchableOpacity>

              <TouchableOpacity style={{
                marginRight: 10
              }} onPress={() => setTextAlign('justify')} >
                <MaterialCommunityIcons
                  name="format-align-justify"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
     {/*    <View style={{
          width: '100%', padding: 10, flexDirection: 'row', justifyContent: 'space-between'
        }}>
          <Text className="text-sm font-medium">Font Size</Text>
         <VolumeBar onChange={setFontSize} />
        </View>
 */}
        <View style={{
          width: '100%', padding: 10, flexDirection: 'row', justifyContent: 'space-between'
        }}>
          <Text className="text-sm font-medium">Font Size</Text>
         <VolumeVisualizer onChange={setFontSize} />
        </View>

        <View style={{ flexDirection: 'row', padding: 10 }}>
          <View
            style={{
              width: "40%",
            }}
          >
            <Text style={{
              fontSize: 14, marginTop: 5
            }}>Background Color</Text>
          </View>
          <View
            style={{
              width: "60%",
            }}
          >
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 5,
                justifyContent: "flex-end",
                flexDirection: "row",
              }}
            >
              {gradients?.map((colorss, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setBgFontColor(colorss)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    overflow: "hidden",
                    borderWidth:
                      fontColor?.toString() === colorss.toString() ? 3 : 1,
                    borderColor:
                      fontColor?.toString() === colorss.toString()
                        ? "#000"
                        : "#ccc",
                    marginHorizontal: 4,
                  }}
                >
                  <LinearGradient
                    colors={colorss}
                    style={{ flex: 1, borderRadius: 15 }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={{
          padding: 10, width: '100%', flexDirection: 'row'
        }}>
          <View style={{ width: "40%" }}>
            <Text className="text-sm font-medium mt-2">Font Color</Text>
          </View>
          <View
            style={{
              width: "60%",
            }}
          >
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 5,
                justifyContent: "flex-end",
                marginRight: 3,
                flexDirection: "row",
              }}
            >
              {colorsdata?.map((color) => (
                <TouchableOpacity
                  key={color.toString()}
                  onPress={() => setFontColor(color)}
                  style={{
                    backgroundColor: color,
                    width: 30,
                    height: 30,
                    marginRight: 5,
                    borderRadius: 15,
                    borderWidth: fontColor === color ? 3 : 1,
                    borderColor: fontColor === color ? "#000" : "#ccc",
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
        <View
          style={{
            padding: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14 }}>Who can see the reel?</Text>

          <TouchableOpacity
            onPress={() => {
              setVisibility((prev) =>
                prev === "Public" ? "Private" : "Public"
              );
            }}
          >
            <Text style={{ color: 'gray', fontWeight: '600' }}>{visibility}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: '100%', padding: 10 }}>
          {actions.map(({ icon, label, lib: Icon, color }, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                checkType(label);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between', marginBottom: 23
              }}
            >
              <Text className="text-sm font-medium">{label}</Text>
              <Icon name={icon} size={20} className={color} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
