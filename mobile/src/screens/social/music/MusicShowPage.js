import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image, Alert,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Entypo from "react-native-vector-icons/Entypo";
import Feather from "react-native-vector-icons/Feather";
import AntDesign from "react-native-vector-icons/AntDesign";
import Sound from 'react-native-sound';
//import { Audio } from "expo-av";

//import * as ImagePicker from "expo-image-picker";
import * as base from "../../../component/global";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';
// Load sound files from network
Sound.setCategory('Playback');

const MusicShowPage = () => {

  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  //const [filteredList, setFilteredList] = useState(mockMusicList);
  const [filteredList, setFilteredList] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const soundRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [artistName, setArtistName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bannerImage, setBannerImage] = useState(null);
  const [artistmusicname, setArtistmusicname] = useState(null);
  const [isloading, setIsloading] = useState(false); //userdata
  const [profileImage, setProfileImage] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [loadingId, setLoadingId] = useState(null);



  const handleImportSound = () => {
    // Open file picker (expo-document-picker or react-native-document-picker)
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setBannerImage(null);
      setArtistName(null);
      setArtistmusicname(null);
      setAudioUri(null);
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
    setRecording(null);
    setShowModal(true); // Show modal to enter artist name

    console.log("Recording saved to", uri);
    ////
  };

  const handleLoad = () => {
    console.log("current page.....with scroll", page);
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  const fetchProducts = async (currentPage) => {
    console.log("Fetching page:", currentPage);

    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      //  setUserid(userData._id);
      //  setCurrentuserid(userData._id);
      setIsloading(true);

      try {
        const response = await axios.get(
          base.BASE_URL + `/apis/musics/getMusic`,
          {
            params: {
              userId: userData._id,
              page: currentPage,
              limit: 10,
            },
          }
        );
        const { users, totalPages } = response.data;

        setProducts((prevProducts) =>
          currentPage === 1 ? users : [...prevProducts, ...users]
        );
        // console.log("music data " + JSON.stringify(response.data));
        setTotalPages(totalPages);
      } catch (error) {
        console.error(
          "Error fetching products:",
          error.response?.data || error.message
        );
      } finally {
        setIsloading(false);
      }
    }
  };


  const handlePlayPause = (item) => {
  setLoadingId(item._id); // Start loader for this item

  if (playingId === item._id && soundRef.current) {
    soundRef.current.stop(() => {
      soundRef.current.release();
      soundRef.current = null;
      setPlayingId(null);
      setLoadingId(null); // Stop loader
    });
    return;
  }

  if (soundRef.current) {
    soundRef.current.stop(() => {
      soundRef.current.release();
      soundRef.current = null;
    });
  }

  const sound = new Sound(base.BASE_URL + item.musicfile, null, (error) => {
    if (error) {
      console.log("Failed to load sound:", error);
      setLoadingId(null);
      return;
    }

    soundRef.current = sound;
    setPlayingId(item._id);
    setLoadingId(null); // Stop loader once loaded

    sound.play((success) => {
      if (!success) console.log("Sound playback failed");
      sound.release();
      soundRef.current = null;
      setPlayingId(null);
    });
  });
};

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            height: '100%',
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
          }}
        >
          {/* Top Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <TouchableOpacity onPress={() => {
                navigation.goBack()
            }}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingHorizontal: 12,
                marginLeft: 12,
              }}
            >
              <Ionicons name="search" size={18} color="gray" />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  color: 'black',
                }}
                placeholder="Search music..."
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="gray" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Import & Record */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              paddingHorizontal: 8,
            }}
          >
            <TouchableOpacity
              onPress={handleImportSound}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Ionicons name="musical-notes-outline" size={20} color="#334155" />
              <Text
                style={{
                  marginLeft: 8,
                  color: '#334155',
                  fontWeight: '500',
                }}
              >
                Import Sound
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={recording ? stopRecording : startRecording}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFE4E6',
                borderRadius: 12,
                padding: 12,
              }}
            >
              {recording ? (
                <>
                  <MaterialCommunityIcons
                    name="record-circle-outline"
                    size={24}
                    color="red"
                  />
                  <Text style={{ marginLeft: 8, color: '#BE123C', fontWeight: '500' }}>
                    Stop Voice
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="mic-outline" size={20} color="#BE123C" />
                  <Text style={{ marginLeft: 8, color: '#BE123C', fontWeight: '500' }}>
                    Record Voice
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: 'black',
              marginBottom: 8,
            }}
          >
            For You
          </Text>

          {/* FlatList: Music List */}
          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                key={item._id}
                onPress={() => handlePlayPause(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                }}
              >
                <TouchableOpacity
                  onPress={() => handlePlayPause(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={{ uri: base.BASE_URL + item.image }}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: 'black', fontSize: 12, maxWidth: 160 }}
                    >
                      {item.musicname.length > 30
                        ? item.musicname.substring(0, 30) + '...'
                        : item.musicname}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>{item.type}</Text>
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {playingId === item._id && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#3B82F6',
                        borderRadius: 9999,
                        padding: 4,
                      }}
                      onPress={async () => {
                        if (soundRef.current) {
                          soundRef.current.stop(() => {
                            soundRef.current.release();
                            soundRef.current = null;
                          });
                        }
                        /*
                          Three things were wrong with this one handler.

                          `takeMusictoparents` is not defined anywhere in this
                          file and this screen takes no props -- it is a
                          registered route, not a child component -- so the tap
                          threw ReferenceError before it did anything else.
                          Behind that sat `Alert.alert(JSON.stringify(item))`,
                          a raw debug dump shown to the user, and then a
                          navigation to "StartStory", which is not a registered
                          route: that file imports ./TextEditor and
                          ./FinalPostmodal, neither of which exists beside it,
                          so it cannot be registered without breaking the
                          bundle. It is abandoned.

                          This screen is a music browser reached from within
                          Social. Confirming a track stops playback and returns
                          to whatever opened it, which keeps it inside the
                          module and is the only honest behaviour available
                          until a picker actually consumes the choice.
                        */
                        navigation.goBack();
                      }}
                    >
                      <Feather name="check" size={20} color="white" />
                    </TouchableOpacity>
                  )}

                  {loadingId === item._id && playingId !== item._id ? (
                    <ActivityIndicator size="small" color="#0000ff" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => handlePlayPause(item)}
                      style={{
                        backgroundColor: '#E5E7EB',
                        padding: 4,
                        borderRadius: 9999,
                      }}
                    >
                      <Ionicons
                        name={playingId === item._id ? 'pause' : 'play'}
                        size={20}
                        color={playingId === item._id ? 'blue' : 'black'}
                      />
                    </TouchableOpacity>
                  )}
                </View>

              </TouchableOpacity>
            )}
            onEndReached={handleLoad}
            onEndReachedThreshold={0.5}
            numColumns={1}
            ListFooterComponent={
              isloading ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : null
            }
          />
        </View>
      </View>
    </SafeAreaProvider>

  );
};

export default MusicShowPage;
