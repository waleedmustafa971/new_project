import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Dimensions, Alert, ActivityIndicator
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../../navigation/navigation'; // adjust as needed
import Ionicons from 'react-native-vector-icons/Ionicons'; // or any icon library
import Video from 'react-native-video';
const screenWidth = Dimensions.get('window').width;
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
type CreateTemplateRouteProp = RouteProp<RootStackParamList, 'CreateTemplate'>;
type Props = {
  route: CreateTemplateRouteProp;
};
import * as base from '../../../../component/global'
import * as Progress from 'react-native-progress'; // Import the progress bar component
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../../component/api';
import SubmitPostTemplate from './SubmitPostTemplate';

const CreateTemplate = ({ route }: Props) => {
  const [userid, setUserid] = useState(null)
  const [showpostbutton, setShowPostbutton] = useState(false)
  const [finalSubmit, setFinalSubmit] = useState(false)
  const [allownext, setAllownext] = useState(true)
  const navigation = useNavigation();
  const { id, videoUrl, clip, durations } = route.params; //durations: [3.8, 3.2, 3.2]
  console.log('...durations...' + durations)
  // Fallback values for clip and durations
  const clips = clip || 0; // Default to 0 if clip is not passed
  const clipDurations = durations || []; // Default to an empty array if durations is not passed
  const [videofile, setVideofile] = useState(videoUrl); //setVideolocalpath
  const [videolocalpath, setVideolocalpath] = useState(""); //
  const [showModal, setShowModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false); //
  const [isloading, setIsloading] = useState(false); //setIsloading
  const [selectedImages, setSelectedImages] = useState([]);
  const [isloadingnext, setIsloadingnext] = useState(false)
  const [progress, setProgress] = useState(0);  // Progress percentage
  const [isProcessing, setIsProcessing] = useState(false);  // Processing state

  const handleImagePick = async (index) => {
    if (selectedImages.length >= clip) {
      setIsloadingnext(false)
      Alert.alert(`You can only select ${clip} images`);
      return;
    }
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        const updatedImages = [...selectedImages];
        updatedImages[index] = imageUri;
        setSelectedImages(updatedImages);
      }
    });
  };

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      console.log("user id....." + userData._id);
      setUserid(userData._id);
    } else {
      console.log("No user data found");
    }
  }


  const uploadImages = async () => {
    if (selectedImages.length < clip || selectedImages.includes(undefined)) {
      setIsloadingnext(false)
      Toast.show({
        type: 'error', // 'success' or 'error'
        position: 'bottom',
        text1: 'Error!',
        text2: 'Please select all required images',
        visibilityTime: 4000,
        autoHide: true,
      });

      Toast.error('')
      return;
    }

    const formData = new FormData();
    selectedImages.forEach((imageUri, index) => {
      formData.append('images', {
        uri: imageUri,
        type: 'image/jpeg', // or image/png
        name: `image${index}.jpg`,
      });
    });
    formData.append('durations', JSON.stringify(durations));
    formData.append('userId', userid);
    formData.append('videoUrl', videoUrl)
    console.log('....formData.....', JSON.stringify(formData))
    /* 
    ....formData..... {"_parts":[["images",{"uri":"file:///data/user/0/com.messengeruae/cache/rn_image_picker_lib_temp_ac78442e-f459-41f9-a62c-745d2f4875a0.webp","type":"image/jpeg","name":"image0.jpg"}],["images",{"uri":"file:///data/user/0/com.messengeruae/cache/rn_image_picker_lib_temp_6e505c8d-a885-4fba-993e-7534401c454b.webp","type":"image/jpeg","name":"image1.jpg"}],["durations",[5,5.3]],["userId","69d15b5366cbdaff652cec27"],["videoUrl","https://stream.mux.com/3At1EX4VUlU1cyGXrmXTB00heL8BDq5yCmw024nbWmWhY.m3u8"]]}
    */
    try {
      const response = await api.post(
        '/apis/video/convert-image-to-video',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const result = response.data;

      console.log('Video created at:', result);

      if (result.message === "Video created successfully") {
        setIsloadingnext(false);

        Toast.show({
          type: 'success',
          position: 'bottom',
          text1: 'Success!',
          text2: 'Video Created Successfully',
          visibilityTime: 4000,
          autoHide: true,
        });

        setVideofile(base.BASE_URL + result.url);
        setVideolocalpath(result.url)
        setShowPostbutton(true)
        setAllownext(false)

      } else {
        setIsloadingnext(false);

        Toast.show({
          type: 'error',
          position: 'bottom',
          text1: 'Error!',
          text2: 'Having issue with images please change ur image its corrupt',
          visibilityTime: 4000,
          autoHide: true,
        });
      }

    } catch (error) {
      setIsloadingnext(false);
      console.error('Upload error:', error);
    }




    /*    try {
         const response = await fetch(base.BASE_URL + '/apis/video/convert-image-to-video', {
           method: 'POST',
           headers: { 'Content-Type': 'multipart/form-data' },
           body: formData,
         });
   
         const result = await response.json();
         console.log('Video created at:', result);
         if (result.message == "Video created locally") {
           setIsloadingnext(false)
           Toast.show({
             type: 'success', // 'success' or 'error'
             position: 'bottom', // You can change the position ('top', 'bottom', 'center')
             text1: 'Success!',  // Main title
             text2: 'Video Created Successfully', // Message body
             visibilityTime: 4000, // How long the toast stays on screen
             autoHide: true, // Will hide automatically after visibilityTime
           });
           setVideofile(result.url);
         } else {
           setIsloadingnext(false)
           Toast.show({
             type: 'error', // 'success' or 'error'
             position: 'bottom',
             text1: 'Error!',
             text2: 'Having issue with images please change ur image its corrupt',
             visibilityTime: 4000,
             autoHide: true,
           });
   
         }
         // Navigate or show success
       } catch (error) {
         setIsloadingnext(false)
         console.error('Upload error:', error);
       } */
  };
  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleNextPress = () => {
    if (selectedImages.length < clip || selectedImages.includes(undefined)) {
      Toast.show({
        type: 'error', // 'success' or 'error'
        position: 'bottom',
        text1: 'Error!',
        text2: 'Please select all required clips',
        visibilityTime: 4000,
        autoHide: true,
      });
    } else {
      setIsloadingnext(true);
      setIsProcessing(true);
      // Simulate a processing upload, update progress
      let uploadProgress = 0;
      const interval = setInterval(() => {
        if (uploadProgress < 100) {
          uploadProgress += 10; // Increase progress
          setProgress(uploadProgress);  // Update progress state
        } else {
          clearInterval(interval);  // Stop when 100%
          setIsProcessing(false);
          setIsloadingnext(false);
          // setVideofile('https://your-video-url.com/video.mp4');  // Set your video URL here
        }
      }, 500);  // Simulate 500ms intervals for upload processing

      uploadImages();
    }
  };
  const handleSubmit = () => {
    setShowModal(true)
  }

  const handleSubmitPost = async (text: any) => {
    try {
      console.log("video processing------");
      const jsonValue = await AsyncStorage.getItem("userdata");
      if (!jsonValue) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const userData = JSON.parse(jsonValue);

      setIsloading(true);

      const formData = new FormData();

      formData.append("video", videolocalpath);

      formData.append("layers", "");
      formData.append("videoTitle", text);
      formData.append("username", userData._id);
      formData.append("isimagefile", "");
      formData.append("tagpeople", JSON.stringify([])); // ✅ FIX
      formData.append("sharegroup", JSON.stringify([]));
      formData.append("emojioverlays", JSON.stringify([]));
      formData.append("textoverlays", "");
      formData.append("location", "");
      formData.append("posttype", "Reel");
      formData.append("posttypechild", "Image and text");
      formData.append("ispost", "public");
      formData.append("status_draft_publish", "draft");

      console.log('....formData......', JSON.stringify(formData))
      console.log('url.... ', base.BASE_URL + "/api/videoprocessing/template-post-to-reel")

      const response = await api.post(
        "/api/videoprocessing/template-post-to-reel",
        {
          video: videolocalpath,
          videoTitle: text,
          username: userData._id,
          tagpeople: [],
          sharegroup: [],
          emojioverlays: [],
          textoverlays: [],
          location: "",
          posttype: "Reel",
          posttypechild: "Image and text",
          ispost: "public",
          status_draft_publish: "draft",
        }
      );
      console.log('-----save-----', response.data)

        if (response.data?.message === "optimized successfully") {
         Toast.show({
           type: "success",
           text1: "Post is processing, please wait...",
           position: "bottom",
         });
 
         setShowModal(false);
         navigation.navigate("HomeSocial");
       } else {
         Toast.show({
           type: "error",
           text1: "Upload failed",
           position: "bottom",
         });
       }  

    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: "error",
        text1: "Something went wrong",
        position: "bottom",
      });
    } finally {
      setIsloading(false);
    }
  };

  const handleNextPressVideoEditor = async() => {
    navigation.navigate("VideoEditorImgly")
  }
  //CameraEditorImgly
  const handleCameraEditorImgly = async() => {
    navigation.navigate("CameraEditorImgly")
  }
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={30} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.topSection}>
          <Text style={styles.title}>Use this template</Text>
        </View>


        <View style={styles.middleSection}>
          <Text>{videoUrl}</Text>
          <TouchableOpacity
            onPress={() => setIsPlaying(!isPlaying)}
            style={{ position: 'relative', width: '100%', height: '100%' }}
          >
            <Video
              source={{ uri: videofile }} //https://stream.mux.com/8gau5M7qGZfgLXOQA01nZDCaC2hf8p2mzkBPEnavGZ1E.m3u8
              style={styles.video}
              muted={false}
              resizeMode="cover"
              repeat={false}
              paused={!isPlaying} // ✔️ Control play/pause with state
              ignoreSilentSwitch="ignore"
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
              onEnd={() => setIsPlaying(false)}
            />

            {!isPlaying && (
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={64} color="white" />
              </View>
            )}
          </TouchableOpacity>

        </View>
        <View style={{ display: 'flex', flexDirection: 'row', alignSelf: 'center', padding: 20 }}>
          {[...Array(clips)].map((_, i) => (
            <View style={styles.iconRow} key={i}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleImagePick(i)}
              >
                {selectedImages[i] ? (
                  <Image
                    source={{ uri: selectedImages[i] }}
                    style={{ width: 30, height: 30, borderRadius: 8 }}
                  />
                ) : (
                  <View>
                    <Ionicons name="add" size={20} color="#333" />
                    <Ionicons name="image-outline" size={20} color="#333" />
                  </View>
                )}
              </TouchableOpacity>
              {/* Display the duration for this clip */}
              <Text style={styles.durationText}>
                {clipDurations[i] ? `${clipDurations[i]}s` : 'N/A'}
              </Text>
            </View>
          ))}
        </View>


        <View style={styles.Nextbutton}>
          {
            isloadingnext ?
              (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  {isProcessing && (
                    <Text style={styles.processingText}>
                      Processing... {progress}% completed
                    </Text>
                  )}
                  {/* Cross-platform Progress Bar */}
                  <Progress.Bar
                    progress={progress / 100}  // 0 to 1 scale
                    width={200}  // Width of the progress bar
                    height={10}  // Height of the progress bar
                    borderRadius={5}  // Rounded corners
                    color="#4caf50"  // Green color for progress
                    unfilledColor="#e0e0e0"  // Light gray color for the background
                  />
                </View>
              )
              :

              allownext ?
              <>
                <TouchableOpacity
                  style={styles.nextButtonInner}
                  onPress={handleNextPress}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                  <TouchableOpacity
                  style={styles.nextButtonInner}
                  onPress={handleNextPressVideoEditor}
                >
                  <Text style={styles.nextButtonText}>Edit Video</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                {/* handleCameraEditorImgly */}
                <TouchableOpacity
                  style={styles.nextButtonInner}
                  onPress={handleCameraEditorImgly}
                >
                  <Text style={styles.nextButtonText}>Open Camera</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

              </>
                :
                <TouchableOpacity
                  style={styles.nextButtonInner}
                  onPress={handleSubmit}
                >
                  <Text style={styles.nextButtonText}>Submit to Reels</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
          }
        </View>
      </View>
      <Toast />

      {
        showModal ?
          <>
            <SubmitPostTemplate
              visible={showModal}
              onClose={() => setShowModal(false)}
              onSubmit={handleSubmitPost}
              videourl={videolocalpath}
              loading={isloading}   // ✅ ADD THIS

            />
          </> : null
      }

    </SafeAreaProvider>
  );
};

export default CreateTemplate;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  durationText: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 5, marginLeft: 7 // Adds a small gap between the icon and the duration
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 10, marginBottom: 5,
    fontSize: 16,
    color: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    padding: 10,
    zIndex: 1, // Ensure it's above other content
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, flexDirection: 'row'
  },
  topSection: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, flexDirection: 'row'
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }], // half of icon size (64/2)
  },
  middleSection: {
    width: (screenWidth - 30) / 2, // Adjust width for 2 columns with spacing
    height: 500,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000', marginBottom: 0, borderWidth: 1,
    borderColor: '#000',
    alignContent: 'center', alignItems: 'center', alignSelf: 'center'
  },
  bottomSection: {
    //flex: 2,
    justifyContent: 'center',
    alignItems: 'center', display: 'flex', flexDirection: 'row'
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  iconRow: {
    justifyContent: 'center',
    width: 50, marginRight: 10
  },
  iconButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    marginBottom: 0
  },
  Nextbutton: {
    marginTop: 20,
    alignItems: 'center',
  },

  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007BFF', // Blue color
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  nextButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },

});
