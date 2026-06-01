import React, { useState } from 'react';
import { 
  Image, Modal, Platform, Dimensions, Alert, 
  View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid 
} from 'react-native';
import VoicePlayer from './modal/VoicePlayer';
import ImageViewer from 'react-native-image-zoom-viewer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

// MOVE THIS OUTSIDE: Prevent re-creating function on every render
const downloadImageToGallery = async (imageUrl: string) => {
  if (!imageUrl) return;

  if (Platform.OS === 'android') {
    // Android 13+ (SDK 33) uses different permission logic, but DownloadManager 
    // often works without explicit WRITE permission on newer OS versions.
    if (Platform.Version < 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission Denied", "Storage access is required to download.");
        return;
      }
    }
  }

  const { config, fs } = ReactNativeBlobUtil;
  const date = new Date();
  // Use PictureDir for Gallery visibility
  const fileDir = Platform.OS === 'ios' ? fs.dirs.DocumentDir : fs.dirs.PictureDir;
  const ext = 'jpg';
  const path = `${fileDir}/download_${Math.floor(date.getTime())}.${ext}`;

  config({
    fileCache: true,
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      path: path,
      description: 'Image',
      mime: 'image/jpeg',
      mediaScannable: true,
    },
  })
    .fetch('GET', imageUrl)
    .then((res) => {
      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.previewDocument(res.path());
      } else {
        Alert.alert("Success", "Image saved to Gallery");
      }
    })
    .catch((err) => {
      console.log(err);
      Alert.alert("Error", "Download failed");
    });
};

const ChatMessageBody = React.memo(({ item, isMine, onLongPress }: any) => {
  // Fix: Show the bubble if there is ANY content (text, image, or audio)
  if (!item.text && !item.imageUrl && !item.audioUrl) return null;

  console.log('imageUrl.........', JSON.stringify(item))
  /* 
  imageUrl......... "https://api.dokandarapps.com/uploads/chat/1772563627052-2a0fe43e8ed6.png,https://api.dokandarapps.com/uploads/chat/1772563626968-ddb43701610b.png"
  */
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 1. Parse the stringified array into a real JavaScript array
  // Safety check: only parse if it's a string
   const imagesArray = typeof item?.imageUrl === 'string' 
    ? JSON.parse(item?.imageUrl) 
    : item?.imageUrl;  

  const handleDownload = () => {
    // currentImage is an array [{url: '...'}]
    if (currentImage && currentImage[0]?.url) {
      downloadImageToGallery(currentImage[0].url);
    } else {
      Alert.alert("Error", "No image found to download");
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.iconButton} onPress={() => setIsVisible(false)}>
        <Icon name="close" size={isTablet ? 35 : 28} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={handleDownload}>
        <Icon name="download" size={isTablet ? 35 : 28} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <TouchableOpacity style={styles.footerButton} onPress={() => Alert.alert("Share", "Sharing...")}>
        <Icon name="share-variant" size={isTablet ? 30 : 24} color="white" />
        <Text style={styles.footerText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerButton} onPress={() => setIsVisible(false)}>
        <Icon name="delete-outline" size={isTablet ? 30 : 24} color="white" />
        <Text style={styles.footerText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={isMine ? styles.ownContainer : styles.otherContainer}>
        <TouchableOpacity
          style={isMine ? styles.own : styles.other}
          onLongPress={() => onLongPress(item)}
          activeOpacity={0.7}
        >
        {/* 2. Map through the array of URLs */}
        {imagesArray && imagesArray.map((url : string, index : number) => (
        <TouchableOpacity
          key={index} // Always provide a unique key
          onPress={() => {
            setCurrentImage([{ url: url }]);
            setIsVisible(true);
          }}
        >
          <Image
            source={{ uri: url }}
            style={styles.messageImage}
          />
        </TouchableOpacity>
      ))} 
 
          {/* TEXT SECTION */}
          {item.text && (
            <Text style={isMine ? styles.textOwn : styles.textOther}>
              {item.text}
            </Text>
          )}

          {/* AUDIO SECTION */}
          {item?.audioUrl && (
            <VoicePlayer url={item.audioUrl} xpartner={item.msgByUserId} />
          )}

          {/* STATUS SECTION */}
          <View style={styles.statusContainer}>
            <Text style={[styles.timeText, { color: isMine ? "#fff" : "#000" }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
            </Text>
            {isMine && (
              <Text style={styles.tickText}>
                {item.status === "pending" ? "🕒" : item.seen ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={isVisible} transparent={true} animationType="fade">
        <ImageViewer
          imageUrl={currentImage}
          enableSwipeDown
          onSwipeDown={() => setIsVisible(false)}
          renderHeader={renderHeader}
          renderFooter={renderFooter}
          footerContainerStyle={{ width: '100%', bottom: isTablet ? 40 : 20 }}
          menus={() => null}
        />
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  ownContainer: { alignSelf: 'flex-end' },
  otherContainer: { alignSelf: 'flex-start' },
  own: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    marginRight: 10,
    maxWidth: '85%',
  },
  other: {
    backgroundColor: '#E5E5EA',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    marginLeft: 10,
    maxWidth: '85%',
  },
 messageImage: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
  },
  textOwn: { color: '#fff', fontSize: 16 },
  textOther: { color: '#000', fontSize: 16 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 10, opacity: 0.7 },
  tickText: { fontSize: 10, color: "#fff", marginLeft: 4 },
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconButton: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 50 },
  footerButton: { alignItems: 'center', justifyContent: 'center', minWidth: isTablet ? 120 : 80 },
  footerText: { color: 'white', marginTop: 5, fontSize: isTablet ? 16 : 12 },
});

export default ChatMessageBody;