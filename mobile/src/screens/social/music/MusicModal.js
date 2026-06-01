import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import AntDesign from "react-native-vector-icons/AntDesign";
import Sound from 'react-native-sound';
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";
Sound.setCategory('Playback');

const MusicModal = ({ visible = false, onClose, takeMusictoparents }) => {
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const soundRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [isloading, setIsloading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  // Functionality remains exactly as per your code
  useEffect(() => {
    fetchProducts(page);
    return () => {
       if (soundRef.current) {
        soundRef.current.stop(() => {
          soundRef.current = null;
          setPlayingId(null);
          setLoadingId(null);
        });
      } 
    };
  }, [page]);

  useEffect(() => {
  return () => {
    if (soundRef.current) {
      soundRef.current.release();
    }
  };
}, []);

  const fetchProducts = async (currentPage) => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setIsloading(true);
      try {
        const response = await axios.get(
          base.BASE_URL + `/apis/musics/getMusic`,
          {
            params: { userId: userData._id, page: currentPage, limit: 10 },
          }
        );
        const { users, totalPages } = response.data;
        setProducts((prevProducts) =>
          currentPage === 1 ? users : [...prevProducts, ...users]
        );
        setTotalPages(totalPages);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsloading(false);
      }
    }
  };
const safeSendToParent = (item) => {
  if (typeof takeMusictoparents === 'function') {
    console.log('✅ sending to parent', item);
    takeMusictoparents(item);
  } else {
    console.log('❌ takeMusictoparents is undefined');
  }
};

const handlePlayPause = async (item) => {
  const url = base.MUSIC_URL + item?.musicfile;
  
  // 1. If the SAME song is already playing, toggle Pause/Play
  if (playingId === item._id && soundRef.current) {
    if (soundRef.current.isPlaying()) {
      soundRef.current.pause();
      setPlayingId(null);
    } else {
      soundRef.current.play((success) => {
        if (!success) console.log('playback failed due to audio decoding errors');
        setPlayingId(null); // Reset when finished
      });
      setPlayingId(item._id);
    }
    return;
  }

  // 2. If a DIFFERENT song is playing, stop and release the old one
  if (soundRef.current) {
    soundRef.current.stop();
    soundRef.current.release();
    soundRef.current = null;
  }

  // 3. Start Loading the NEW song
  setLoadingId(item._id);
  
  const newSound = new Sound(url, null, (error) => {
    setLoadingId(null);
    if (error) {
      console.log('failed to load the sound', error);
      Alert.alert("Error", "Could not load music file.");
      return;
    }

    // Play the sound
    newSound.play((success) => {
      if (success) {
        console.log('successfully finished playing');
      } else {
        console.log('playback failed');
      }
      setPlayingId(null);
    });

    soundRef.current = newSound;
    setPlayingId(item._id);
    safeSendToParent(item);
  });
};
  
  return (
    <Modal visible={!!visible} animationType="slide" transparent>
      <View style={styles.fullScreenOverlay}>
        {/* Top Header Section (Black Area) */}
        <SafeAreaView style={styles.topHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerActionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerActionText, { fontWeight: 'bold' }]}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* White Sheet Section */}
        <View style={styles.sheetContainer}>
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={styles.activeTab}>
              <Ionicons name="musical-notes" size={16} color="#007AFF" />
              <Text style={styles.activeTabText}>Music</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inactiveTab}>
              <MaterialCommunityIcons name="tune-variant" size={16} color="black" />
              <Text style={styles.inactiveTabText}>Controls</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search lyrics"
                placeholderTextColor="#8E8E93"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.bookmarkBtn}>
              <Ionicons name="bookmark" size={22} color="black" />
            </TouchableOpacity>
          </View>

          {/* List Content */}
          <View style={styles.listHeader}>
            <Text style={styles.forYouTitle}>For you</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.musicItemRow}>
                <TouchableOpacity 
                    onPress={() => handlePlayPause(item)} 
                    style={styles.musicInfoContainer}
                >
                  <Image source={{ uri: item.image }} style={styles.albumArt} />
                  <View style={styles.textContainer}>
                    <Text numberOfLines={1} style={styles.songName}>{item.musicname}</Text>
                    <Text style={styles.artistSubText}>Artist • 25.8K</Text>
                    <View style={styles.royaltyBadge}>
                      <Text style={styles.royaltyText}>Royalty-free</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionIcons}>
                 {/*  <TouchableOpacity>
                     <MaterialCommunityIcons name="dots-vertical" size={24} color="black" />
                  </TouchableOpacity> */}
                  
                  {loadingId === item._id ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <TouchableOpacity onPress={() => handlePlayPause(item)}>
                      <Ionicons 
                        name={playingId === item._id ? "pause-circle" : "play-circle"} 
                        size={32} 
                        color="black" 
                      />
                    </TouchableOpacity>
                  )}
                  
                  {playingId === item._id && (
                    <TouchableOpacity 
                        style={styles.checkIcon}
                        onPress={() => {
                        //  Alert.alert('ddddd')
                            takeMusictoparents(item);
                            onClose();
                        }}
                    >
                        <Feather name="check" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            onEndReached={() => { if(!isloading && page < totalPages) setPage(p => p + 1); }}
            ListFooterComponent={isloading && <ActivityIndicator style={{ margin: 10 }} />}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'black',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    height: 100,
  },
  headerActionText: {
    color: 'white',
    fontSize: 17,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
    gap: 15,
  },
  activeTab: {
    flexDirection: 'row',
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  inactiveTab: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
  },
  inactiveTabText: {
    color: 'black',
    fontWeight: '600',
    fontSize: 14,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: 'black',
  },
  bookmarkBtn: {
    backgroundColor: '#F2F2F7',
    padding: 10,
    borderRadius: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  forYouTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 16,
  },
  musicItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  musicInfoContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  albumArt: {
    width: 55,
    height: 55,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  songName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'black',
  },
  artistSubText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  royaltyBadge: {
    backgroundColor: '#F2F2F7',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  royaltyText: {
    fontSize: 10,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
      marginLeft: 5
  }
});

export default MusicModal;