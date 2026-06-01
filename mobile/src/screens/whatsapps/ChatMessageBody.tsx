import React, { useState } from 'react';
import {
  Image, Modal, Platform, Dimensions, Alert,
  View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid
} from 'react-native';
import VoicePlayer from './modal/VoicePlayer';
import ImageViewer from 'react-native-image-zoom-viewer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import ReplyMessage from './ReplyMessage';

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

const ChatMessageBody = React.memo(({ item, isMine, onLongPress, userinfo, me }: any) => {
  // Fix: Show the bubble if there is ANY content (text, image, or audio)
  if (!item.text && !item.imageUrl && !item.audioUrl) return null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);


  const formatImages = (imageInput: any) => {
    if (!imageInput) return [];

    let urls: string[] = [];

    try {
      // If input is a string, try JSON.parse first
      if (typeof imageInput === "string") {
        try {
          const parsed = JSON.parse(imageInput);
          if (Array.isArray(parsed)) urls = parsed;
          else urls = [parsed];
        } catch {
          // If JSON.parse fails, treat as comma-separated string
          urls = imageInput.split(",").map((url) => url.trim());
        }
      } else if (Array.isArray(imageInput)) {
        urls = imageInput.flatMap((url) =>
          typeof url === "string" ? url.split(",").map((u) => u.trim()) : []
        );
      }
    } catch (err) {
      console.log("Error parsing images:", err);
      return [];
    }

    // Filter out empty strings
    return urls.filter((url) => url && url.length > 0);
  };
  const imageUrls = formatImages(item?.imageUrl);
  // Then render using imagesArray
  const imagesArray = imageUrls.map((url) => url);
  //console.log("Final image array:", imagesArray);


  let contactsArray = [];
  if (item?.messagetype === "contact") {
    try {
      contactsArray = JSON.parse(item.text || "[]");
    } catch (e) {
      contactsArray = [];
    }
  }
  const contact = contactsArray[0]; // first contact

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
  const ViewSinglecontact = () => {
    Alert.alert('View this contact', JSON.stringify(item?.text))
  }

  return (
    <>
        {
        item?.messagetype == "image" ?
          <View style={isMine ? styles.ownContainer : styles.otherContainer}>
            <View style={styles.imageContainer}>
              {imagesArray.slice(0, 4).map((url: string, index: number) => {
                const remaining = imagesArray.length - 4;
                // Ensure local path works
                const sourceUri =
                  url.startsWith("http") || url.startsWith("file://")
                    ? url
                    : `file://${url}`;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.imageWrapper}
                    onPress={() => {
                      setCurrentIndex(index);
                      setIsVisible(true);
                    }}
                    onLongPress={() => onLongPress(item)}
                  >
                    <Image source={{ uri: sourceUri }} style={styles.messageImage} />

                     Show +X overlay on 4th image 
                    {index === 3 && imagesArray.length > 4 && (
                      <View style={styles.overlay}>
                        <Text style={styles.overlayText}>+{remaining}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.statusContainer}>
              <Text style={[styles.timeText, { color: isMine ? "#000" : "#000" }]}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                  : "..."}</Text>
              {isMine && (
                <Text style={styles.tickTextimage}>
                 
                  {item.status === "pending" ? "🕒" : item.status === "seen" ? "✓✓" : "✓"}
                </Text>
              )}
            </View>
          </View> : null

      } 


     {/*  {
        item?.messagetype === "image" && imagesArray.length > 0 ? (
          <View style={isMine ? styles.ownContainer : styles.otherContainer}>
            <View style={styles.imageContainer}>
              {imagesArray.slice(0, 4).map((url, index) => {
                const remaining = imagesArray.length - 4;

                // Ensure local path works
                const sourceUri =
                  url.startsWith("http") || url.startsWith("file://")
                    ? url
                    : `file://${url}`;

                // Adjust size for multiple images
                const imageStyle =
                  imagesArray.length === 1
                    ? { width: '100%', aspectRatio: 1 }
                    : { width: '48%', aspectRatio: 1, margin: '1%' };

                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`} // unique key
                    style={imageStyle}
                    onPress={() => {
                      setCurrentIndex(index);
                      setIsVisible(true);
                    }}
                    onLongPress={() => onLongPress(item)}
                  >
                    <Image
                      source={{ uri: sourceUri }}
                      style={{ width: '100%', height: '100%', borderRadius: 8 }}
                      resizeMode="cover"
                    />
                    {index === 3 && imagesArray.length > 4 && (
                      <View style={styles.overlay}>
                        <Text style={styles.overlayText}>+{remaining}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.statusContainer}>
              <Text
                style={[styles.timeText, { color: isMine ? "#000" : "#000" }]}
              >
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                  : "..."}
              </Text>
              {isMine && (
                <Text style={styles.tickTextimage}>
                  {item.status === "pending"
                    ? "🕒"
                    : item.status === "seen"
                      ? "✓✓"
                      : "✓"}
                </Text>
              )}
            </View>
          </View>
        ) : null
      } */}

      {item?.messagetype == "text" ?
        <View style={isMine ? styles.ownContainer : styles.otherContainer}>
          <TouchableOpacity
            style={isMine ? styles.own : styles.other}
            onLongPress={() => onLongPress(item)}
            activeOpacity={0.7}
          >
            {/* Reply Preview */}
            {item?.replyTo && (
              <View style={styles.replyPreview}>
                <Text style={styles.replyTitle}>Reply</Text>
                <ReplyMessage replyTo={item.replyTo} />
              </View>
            )}

            <Text style={isMine ? styles.textOwn : styles.textOther}>
              {item.text}

            </Text>
            <View style={styles.statusContainer}>
              <Text style={[styles.timeText, { color: isMine ? "#fff" : "#000" }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
              </Text>
              {isMine && (
                <Text style={styles.tickText}>
                  {item.status === "pending" ? "🕒" : item.seen ? "✓✓" : "✓"}- {item.status}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View> : null
      }

      {item?.messagetype == "location" ?
        <View style={isMine ? styles.ownContainer : styles.otherContainer}>
          <TouchableOpacity style={isMine ? styles.own : styles.other} onLongPress={() => onLongPress(item)} activeOpacity={0.7}>
            <Text style={isMine ? styles.textOwn : styles.textOther}>
              {item.text}
            </Text>
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

        </View> : null
      }

      {item?.messagetype == "contact" ?
        <View style={isMine ? styles.ownContainer_contact : styles.otherContainer_contact}>
          <TouchableOpacity
            style={isMine ? styles.own_contact : styles.other_contact}
            onLongPress={() => onLongPress(item)}
            activeOpacity={0.7}
          >
            <Text style={isMine ? styles.textOwn_contact : styles.textOther_contact}>
              {contact ? `${contact.name} (${contact.phone})` : ""}
            </Text>
            <View style={styles.statusContainer}>
              <Text style={[styles.timeText, { color: isMine ? "#000" : "#000" }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
              </Text>
              {isMine && (
                <Text style={styles.tickText_contact}>
                  {item.status === "pending" ? "🕒" : item.seen ? "✓✓" : "✓"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={{
            alignContent: 'center', alignItems: 'center',
            marginTop: -10, marginBottom: 5
          }}>
            <TouchableOpacity onPress={ViewSinglecontact}>
              <Text style={{ fontSize: 12 }}>Message</Text>
            </TouchableOpacity>
          </View>


        </View> : null
      }
      {
        item?.messagetype === "audio" && (
          <View style={isMine ? styles.ownContainer_audio : styles.otherContainer_audio}>

            <VoicePlayer
              url={item.audioUrl}
              userimage={isMine ? userinfo?.me?.image : userinfo?.partner?.image}
              me={me}
              xpartner={item.msgByUserId}
            />

            <View style={styles.audioFooter}>
              <Text style={styles.timeText_audio}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  })
                  : "..."}
              </Text>

              {isMine && (
                <Text style={styles.tickText_audio}>
                  {item.status === "pending"
                    ? "🕒"
                    : item.seen
                      ? "✓✓"
                      : "✓"}
                </Text>
              )}

            </View>

          </View>
        )
      }

      <Modal visible={isVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <ImageViewer
            imageUrls={imagesArray.map((url) => ({
              url: url.startsWith("http") ? url : `file://${url}`,
            }))}
            index={currentIndex}
            enableSwipeDown
            onSwipeDown={() => setIsVisible(false)}
            renderHeader={renderHeader}
            renderFooter={renderFooter}
            footerContainerStyle={{ width: "100%", bottom: isTablet ? 40 : 20 }}
            menus={() => null}
          />
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  ownContainer_reply: {
    alignSelf: 'flex-end', marginRight: 5,
    backgroundColor: '#f2f2f2', borderRadius: 10,
    marginTop: 16
  },
  ownContainer: { alignSelf: 'flex-end', marginRight: 5 },
  ownContainer_contact: {
    alignSelf: 'flex-end', marginRight: 5,
    backgroundColor: 'rgba(216, 226, 237, 1)', marginBottom: 5,
    borderRadius: 15
  },
  otherContainer_contact: { alignSelf: 'flex-start', marginRight: 5 },
  /* Audio */
  ownContainer_audio: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    borderRadius: 18,
    padding: 8,
    marginVertical: 4,
    maxWidth: "75%"
  },

  otherContainer_audio: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 8,
    marginVertical: 4,
    maxWidth: "75%",
    borderWidth: 0.3,
    borderColor: "#ddd"
  },
  audioFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4
  },

  timeText_audio: {
    fontSize: 11,
    color: "#666",
    marginRight: 4
  },

  tickText_audio: {
    fontSize: 12,
    color: "#4FC3F7"
  },
  duration: {
    fontSize: 11,
    color: "#666",
    marginLeft: 6
  },
  /* End Audio */

  /* Image */


  /* End image */
  otherContainer: { alignSelf: 'flex-start', marginRight: 5 },
  otherContainer_reply: { alignSelf: 'flex-start', marginRight: 5 },
  own: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    marginRight: 10,
    maxWidth: '85%',
  },
  own_contact: {
    backgroundColor: 'rgba(216, 226, 237, 1)',
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
  other_contact: {
    backgroundColor: '#E5E5EA',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    marginLeft: 10,
    maxWidth: '85%',
  },
  textOwn: { color: '#fff', fontSize: 12 },
  textOther: { color: '#000', fontSize: 12 },

  textOwn_contact: { color: '#000', fontSize: 12 },
  textOther_contact: { color: '#000', fontSize: 12 },

  statusContainer_audio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 10, opacity: 0.7 },

  tickText: { fontSize: 10, color: "#fff", marginLeft: 4 },

  tickText_contact: { fontSize: 10, color: "#000", marginLeft: 4 },
  tickTextimage: { fontSize: 10, color: "#000", marginLeft: 4 },
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

  imageContainer: {
    borderWidth: 1, borderColor: '#f2f2f2',
    flexDirection: "row",
    flexWrap: "wrap",
    width: 200, // adjust based on your layout
  },

  imageWrapper: {
    width: "50%", // 2 per row
    aspectRatio: 1,
    padding: 2,
  },

  messageImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },

  overlayText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  replyPreview: {
    borderLeftWidth: 3,
    borderLeftColor: "#34C759",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
  },

  replyTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#34C759",
    marginBottom: 2,
  },
});

export default ChatMessageBody;