import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Image, BackHandler, Platform, Modal, Button
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import NativeSampleModule from '../../../../../../../specs/NativeSampleModule';
import EditorFooter from './EditorFooter';
import { Pressable } from 'react-native';
import GreenScreenEditor from './GreenScreenEditor';
import MusicModal from '../../../../music/MusicModal';
import Sound from 'react-native-sound';
//import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import api from '../../../../../../component/api';
import * as base from '../../../../../../component/global';
import ActiveMusicBadge from '../../../../music/ActiveMusicBadge';
import { BASE_URL } from '../../../../../../component/global';

Sound.setCategory('Playback');
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
type MusicItem = {
  _id: string;
  musicfile: string;
  musicname: string;
  id: string;
};
type MusicList = {
  id: string;
  file: string;
}

Sound.setCategory('Playback');

export default function VideoNativeffmge({ videoUri, onBack }: any) {
  const [videoDuration, setVideoDuration] = useState(10);
  const [multiSliderValue, setMultiSliderValue] = useState([0, 10]);
  const [currentUri, setCurrentUri] = useState(videoUri); // <-- hold current video
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [greenenable, setGreenenable] = useState(false);
  const [greendata, setGreendata] = useState("");
  const [paused, setPaused] = useState(true);
  const [modalEffect, setModalEffect] = useState(false)
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musiclist, setMusiclist] = useState<MusicList | null>(null);

  const [selectedMusic, setSelectedMusic] = useState(false);
  const soundRef = useRef<Sound | null>(null);
  const [playingId, setPlayingId] = useState(null); // this is play from child

  //get video duration from native
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const backgroundUri = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000";
  const [texts, setTexts] = useState([
    {
      id: 't1',
      text: 'Hello Reels 👋',
      start: 2,
      end: 6,
      x: 50,
      y: 80,
    },
  ]);
  //END DURATION

  const formattedUri = useMemo(() => {
    if (!currentUri) return null;
    return currentUri.startsWith('file://') ? currentUri : `file://${currentUri}`;
  }, [currentUri]);

  // ✅ Generate thumbnails
  const generateThumbnails = async (duration: number) => {
    if (!formattedUri) return;
    const count = 8;
    const interval = duration / count;
    const list: string[] = [];

    // 1. Use a small timeout or InteractionManager to allow 
    // the UI to show a "Loading" state before the heavy C++ work starts.
    //setLoading(true); 

    setTimeout(() => {
      for (let i = 0; i < count; i++) {
        const sec = i * interval;
        const fileName = `thumb_${Date.now()}_${i}.jpg`; // Unique name to avoid cache issues
        const output = `${RNFS.CachesDirectoryPath}/${fileName}`;

        try {
          const result = NativeSampleModule.getThumbnail(
            formattedUri,
            output,
            sec
          );

          // 2. Check if the C++ module returned an error string instead of a path
          if (result && !result.startsWith('Error')) {
            // On Android, file:// is mandatory. On iOS, it usually works too.
            list.push(Platform.OS === 'android' ? `file://${result}` : result);
          } else {
            console.error("C++ Thumbnail Error:", result);
          }
        } catch (e) {
          console.error("JSI Call Failed:", e);
        }
      }
      setThumbs(list);
      // setLoading(false);
    }, 100);

  };

  useEffect(() => {
    if (!currentUri) return;

    const d = NativeSampleModule.getVideoDuration(currentUri);
    setDuration(d);
    generateThumbnails(d)
    setTrimEnd(d);
  }, [currentUri]);

  // ✅ Android back
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };

    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => handler.remove();
  }, []);


  const handle_videoTrim = async () => {
        //return
    try {
      setIsExporting(true);
      // 1. Define where the font will live in the cache
      const localFontPath = `${RNFS.CachesDirectoryPath}/Classic.ttf`;
      // 2. Check if it's already there, if not, copy it from Assets
      const fontExists = await RNFS.exists(localFontPath);
      if (!fontExists) {
        console.log('Copying font from assets...');
        // Note: Use 'font/Classic.ttf' as per your folder structure
        await RNFS.copyFileAssets('font/Classic.ttf', localFontPath);
      }
      const output = `${RNFS.CachesDirectoryPath}/trim_${Date.now()}.mp4`;
      //  const trimStart = multiSliderValue[0];
      //  const trimEnd = multiSliderValue[1];
      const start = trimStart;
      const duration = trimEnd - trimStart;
      //  console.log(' start time : ', trimStart , ' end time :' + trimEnd) // this comming right
      console.log(' start time : ', start, ' end time :' + duration) // after this subscrition trimEnd - trimStart duration is not comming right

      const cleanFormattedUri = formattedUri.replace(/^file:\/\//, '');
      const audioUrl = `${BASE_URL}/uploads/music/1769839852954-audio.mp3`;
      const localAudio = `${RNFS.CachesDirectoryPath}/audio_temp.mp3`;
      // ✅ Download audio if not already downloaded
      const exists = await RNFS.exists(localAudio);
      if (!exists) {
        console.log('Downloading audio...');
        const downloadResult = await RNFS.downloadFile({
          fromUrl: audioUrl,
          toFile: localAudio,
        }).promise;
        if (downloadResult.statusCode !== 200) {
          throw new Error('Audio download failed');
        }
      } else {
        console.log('Audio already downloaded locally');
      }
      console.log({
        formattedUri: cleanFormattedUri,
        output: output,
        start: start,
        duration: duration,
      });
      //  return
      const result = NativeSampleModule.trimVideoMinimal(cleanFormattedUri, output, start, duration);
      console.log("Saved:", result);
      Alert.alert("Success", result);
      // Update the video URI to play the trimmed version
      setCurrentUri(result);


    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setIsExporting(false);
    }

  }
  const handle_DecodeTrim = async () => {
     setIsExporting(true);
     try {
     
      const cleanFormattedUri = formattedUri.replace(/^file:\/\//, ''); // from library
      const result = NativeSampleModule.decodeVideoFrames(
      cleanFormattedUri
      );

      console.log('decode video form here .... ', result);
      setIsExporting(false);
     }
     catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setIsExporting(false);
    }
  }

  const handleExport = async () => {
    //return
    try {
      setIsExporting(true);
      // 1. Define where the font will live in the cache
      const localFontPath = `${RNFS.CachesDirectoryPath}/Classic.ttf`;
      // 2. Check if it's already there, if not, copy it from Assets
      const fontExists = await RNFS.exists(localFontPath);
      if (!fontExists) {
        console.log('Copying font from assets...');
        // Note: Use 'font/Classic.ttf' as per your folder structure
        await RNFS.copyFileAssets('font/Classic.ttf', localFontPath);
      }
      const output = `${RNFS.CachesDirectoryPath}/trim_${Date.now()}.mp4`;
      //  const trimStart = multiSliderValue[0];
      //  const trimEnd = multiSliderValue[1];
      const start = trimStart;
      const duration = trimEnd - trimStart;
      //  console.log(' start time : ', trimStart , ' end time :' + trimEnd) // this comming right
      console.log(' start time : ', start, ' end time :' + duration) // after this subscrition trimEnd - trimStart duration is not comming right
      const cleanFormattedUri = formattedUri.replace(/^file:\/\//, '');
      const audioUrl = `${BASE_URL}/uploads/music/1769839852954-audio.mp3`;
      const localAudio = `${RNFS.CachesDirectoryPath}/audio_temp.mp3`;
      // ✅ Download audio if not already downloaded
      const exists = await RNFS.exists(localAudio);
      if (!exists) {
        console.log('Downloading audio...');
        const downloadResult = await RNFS.downloadFile({
          fromUrl: audioUrl,
          toFile: localAudio,
        }).promise;
        if (downloadResult.statusCode !== 200) {
          throw new Error('Audio download failed');
        }
      } else {
        console.log('Audio already downloaded locally');
      }
      console.log({
        formattedUri: cleanFormattedUri,
        output: output,
        start: start,
        duration: duration,
      });
      //  return
      const result = NativeSampleModule.trimVideoMinimal(cleanFormattedUri, output, start, duration);
      console.log("Saved:", result);
      Alert.alert("Success", result);
      // Update the video URI to play the trimmed version
      setCurrentUri(result);


    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setIsExporting(false);
    }

  };


  const playMusicFromChild = (item: any) => {
    console.log('music list', item);
    // Stop current sound if playing
    if (soundRef.current) {
      soundRef.current.stop(() => {
        soundRef.current?.release();
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
      setMusiclist({ id: item._id, file: musicUrl });
    });
  };

  const handleStopSound = () => {
    if (soundRef.current) {
      // 1. Stop the playback
      soundRef.current.stop(() => {
        console.log("Playback stopped successfully");

        // 2. Release native resources
        soundRef.current?.release();

        // 3. Nullify the reference
        soundRef.current = null;

        // 4. Update UI
        setPlayingId(null);
      });
    } else {
      // Fallback if the ref is lost but state remained
      setPlayingId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  const handleProcess = (url : string) => {
    console.log('....url.....', url)
     setCurrentUri(url)
     console.log('parents video url : ',url, '...fast url..... ');
     setGreendata(url)

  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        {
          playingId ?
            <ActiveMusicBadge
              playingId={playingId}
              onStop={handleStopSound}
            /> : <Text style={styles.title}>Video Editor</Text>
        }
       {/*  
       <TouchableOpacity onPress={handle_videoTrim}>
          {isExporting
            ? <ActivityIndicator color="#FFD700" />
            : <Text style={styles.done}>Video Trim</Text>
          }
        </TouchableOpacity>
         <TouchableOpacity onPress={handle_DecodeTrim}>
          {isExporting
            ? <ActivityIndicator color="#FFD700" />
            : <Text style={styles.done}>Decode Video</Text>
          }
        </TouchableOpacity> */}
        <TouchableOpacity onPress={handleExport}>
          {isExporting
            ? <ActivityIndicator color="#FFD700" />
            : <Text style={styles.done}>Next</Text>
          }
        </TouchableOpacity>
      </View>
      {/* VIDEO */}
      {
        greenenable ?
        <Video
        source={{ uri: greendata }}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={(d) => {
          setVideoDuration(d.duration);
          if (trimEnd === 0) {
            setTrimStart(0);
            setTrimEnd(d.duration);
          }
        }}
      />
      :
      <Video
        source={{ uri: currentUri }}
        style={styles.video}
        resizeMode="contain"
        paused={paused}
        onLoad={(d) => {
          setVideoDuration(d.duration);
          if (trimEnd === 0) {
            setTrimStart(0);
            setTrimEnd(d.duration);
          }
        }}
      />
      }
      
      <View style={{ alignContent: 'center', alignItems: 'center', padding: 5 }}>
        <Pressable onPress={() => setPaused(prev => !prev)}>
          <MaterialIcons name={paused ? 'play-arrow' : 'pause'} size={48} color="#fff" />
        </Pressable>

      </View>
      {/* TIMELINE */}
      <View style={styles.timelineBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
         {/*  {thumbs.length === 0 && <ActivityIndicator size="large" />} */}
          {thumbs?.map((t, i) => (
            <View key={i} style={styles.thumbContainer}>
              <Image
                source={{ uri: t }}
                style={styles.thumb} // e.g., width: 60, height: 100
                resizeMode="cover"
              />
              <Text style={styles.timeLabel}>{Math.floor(i * (duration / 8))}s</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ padding: 10, height: 50 }}>
          <MultiSlider
            values={[trimStart, trimEnd]}   // 👈 important
            sliderLength={width - 40}
            min={0}
            max={videoDuration}
            step={0.1}
            onValuesChange={(values) => {
              setTrimStart(values[0]);
              setTrimEnd(values[1]);
            }}
            selectedStyle={{ backgroundColor: '#FFD700' }}
            markerStyle={{ backgroundColor: '#FFD700' }}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.time}>
            {trimStart.toFixed(1)}s
          </Text>
          <Text style={styles.time}>
            {trimEnd.toFixed(1)}s
          </Text>
        </View>

      </View>
      <Modal
        animationType="slide"
        transparent={true} // 👈 Crucial: allows the background to be partially visible
        visible={modalEffect}
        onRequestClose={() => setModalEffect(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setModalEffect(false)} />
          <View style={styles.whiteSheet}>
            {/* The "Facebook" Drag Handle */}
            <View style={styles.dragHandle} />

            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setModalEffect(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <GreenScreenEditor
              videoUri={videoUri}
              onFinish={() => setModalEffect(false)}
           //   onApply={(outputUri: string) => setCurrentUri(outputUri)}
              onApply={(outputUri: string) => {
                handleProcess(outputUri)
            
              }}
            />
          </View>
        </View>
      </Modal>
      {showMusicModal ? (
        <MusicModal
          visible={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          takeMusictoparents={playMusicFromChild}
        />
      ) : (
        ""
      )}

      <EditorFooter
        onAddText={() => { }}
        onAddImage={() => { }}
        onAddMusic={() => { setShowMusicModal(true) }}
        onAddEffect={() => {
          console.log('green')
          setModalEffect(true)
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  cancel: { color: '#aaa', fontSize: isTablet ? 20 : 16 },
  done: { color: '#FFD700', fontSize: isTablet ? 20 : 16 },
  title: { color: '#fff', fontSize: isTablet ? 22 : 18 },

  video: {
    width: '100%',
    height: isTablet ? height * 0.55 : height * 0.4,
  },

  timelineBox: {
    padding: 5,
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  thumb: {
    width: isTablet ? 90 : 60,
    height: isTablet ? 90 : 60,
    marginHorizontal: 2,
    borderRadius: 6,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
  },

  time: {
    color: '#888',
  },
  thumbContainer: {
    marginHorizontal: 4, // Space between thumbnails
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333', // Placeholder color while loading
    borderRadius: 8,
    overflow: 'hidden', // Ensures the image doesn't bleed past the corners
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },

  // The Image itself
  /*   thumb: {
      width: 70,    // Adjusted for a typical timeline look
      height: 110,  // Taller for mobile video (9:16 aspect)
      borderRadius: 4,
    }, */

  // The text label showing the time (e.g., "05s")
  timeLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark background for readability
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.5, // 👈 This makes it exactly 50%
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // This dims the video behind the modal
    justifyContent: 'flex-end', // 👈 This pushes the content to the bottom
  },
  whiteSheet: {
    backgroundColor: 'white', // 👈 Your requested white background
    height: SCREEN_HEIGHT * 0.3, // 👈 Exactly 50% of the screen
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    // Add a slight shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
