import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  Text,
  View,
  FlatList,
  Image,
  PermissionsAndroid, Dimensions, ActivityIndicator,
  TouchableOpacity, StyleSheet
} from 'react-native';
import Permissions, { PERMISSIONS } from 'react-native-permissions';
import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  NewReelcamera: { typescreen: string, picture: string, imagetype: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const GalleryShow: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [hasPermission, setHasPermission] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const imageSize = screenWidth / 4 - 6; // 4 columns with spacing
  //const imageSize = screenWidth / 4 - 6; // spacing adjustment
  // const [photos, setPhotos] = useState([]);
  const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
  const openSettingsAlert = useCallback(({ title }: { title: string }) => {
    Alert.alert(title, '', [
      { text: 'Open Settings', onPress: () => Linking?.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [albums, setAlbums] = useState<{ title: string; count: number }[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);



  const checkAndroidPermissions = useCallback(async () => {
    if (parseInt(Platform.Version as string, 10) >= 33) {
      const permissions = await Permissions.checkMultiple([
        PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
      ]);
      if (
        permissions[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] === Permissions.RESULTS.GRANTED &&
        permissions[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] === Permissions.RESULTS.GRANTED
      ) {
        setHasPermission(true);
        return;
      }
      const res = await Permissions.requestMultiple([
        PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
      ]);
      if (
        res[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] === Permissions.RESULTS.GRANTED &&
        res[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] === Permissions.RESULTS.GRANTED
      ) {
        setHasPermission(true);
      } else if (
        res[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] === Permissions.RESULTS.BLOCKED ||
        res[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] === Permissions.RESULTS.BLOCKED
      ) {
        openSettingsAlert({
          title: 'Please allow access to your photos and videos from settings',
        });
      }
    } else {
      const permission = await Permissions.check(
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
      );
      if (permission === Permissions.RESULTS.GRANTED) {
        setHasPermission(true);
        return;
      }
      const res = await Permissions.request(
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
      );
      if (res === Permissions.RESULTS.GRANTED) {
        setHasPermission(true);
      } else if (res === Permissions.RESULTS.BLOCKED) {
        openSettingsAlert({
          title: 'Please allow access to your gallery from settings',
        });
      }
    }
  }, [openSettingsAlert]);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const permission = await Permissions.check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      if (
        permission === Permissions.RESULTS.GRANTED ||
        permission === Permissions.RESULTS.LIMITED
      ) {
        setHasPermission(true);
        return;
      }
      const res = await Permissions.request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      if (
        res === Permissions.RESULTS.GRANTED ||
        res === Permissions.RESULTS.LIMITED
      ) {
        setHasPermission(true);
      } else if (res === Permissions.RESULTS.BLOCKED) {
        openSettingsAlert({
          title: 'Please allow access to the photo library from settings',
        });
      }
    } else if (Platform.OS === 'android') {
      checkAndroidPermissions();
    }
  }, [checkAndroidPermissions, openSettingsAlert]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);


  const loadPhotos = async (after = null) => {
    try {
      const result = await CameraRoll.getPhotos({
        first: 20,
        assetType: 'All',
        //  assetType: 'video',
        ...(after && { after }),
      });

      const reversedEdges = result.edges.reverse();

      if (after) {
        // Append for pagination
        setPhotos(prev => [...prev, ...reversedEdges]);
      } else {
        // First load or refresh, start fresh
        setPhotos(reversedEdges);
      }

      setEndCursor(result.page_info.end_cursor);
      setHasNextPage(result.page_info.has_next_page);
    } catch (error) {
      console.warn('Error loading photos', error);
    }
  };


  const loadMorePhotos = () => {
    if (hasNextPage && !loadingMore) {
      setLoadingMore(true);
      loadPhotos(endCursor).finally(() => setLoadingMore(false));
    }
  };

  useEffect(() => {
    if (hasPermission) {
      loadPhotos();
    }
  }, [hasPermission]);

  // Load albums when button pressed
  const loadAlbums = async () => {
    try {
      const result = await CameraRoll.getAlbums({ assetType: 'All' });
      setAlbums(result);
    } catch (error) {
      console.warn('Failed to get albums', error);
    }
  };

  // Load photos of selected album
  const loadPhotosFromAlbum = async (albumTitle: string) => {
    try {
      const result = await CameraRoll.getPhotos({
        first: 50,
        assetType: 'All',
        groupName: albumTitle,
      });
      setPhotos(result.edges);
      setSelectedAlbum(albumTitle);
    } catch (error) {
      console.warn(`Failed to load photos from album ${albumTitle}`, error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <TouchableOpacity style={{
          padding: 10
        }} onPress={loadAlbums}>
          <Text>Camera Roll</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{
          padding: 10
        }} onPress={loadAlbums}>
          <Text>Picture</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{
          padding: 10
        }} onPress={loadAlbums}>
          <Text>Video</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={albums}
        keyExtractor={(item) => item.title}
        style={{ marginVertical: 10, maxHeight: 60 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.albumButton,
              selectedAlbum === item.title && styles.albumSelected,
            ]}
            onPress={() => loadPhotosFromAlbum(item.title)}
          >
            <Text
              style={[
                styles.albumText,
                selectedAlbum === item.title && styles.albumTextSelected,
              ]}
              numberOfLines={1}
            >
              {item.title} ({item.count})
            </Text>
          </TouchableOpacity>
        )}
      />

      {hasPermission && (
        <FlatList
          data={photos}
          numColumns={4}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          onEndReached={loadMorePhotos}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => {

              const uri = item?.node?.image?.uri ?? '';

              const mimeType = item?.node?.type ?? '';

              let imagetypes: 'image' | 'video' | null = null;

              if (mimeType.startsWith('image')) {
                imagetypes = 'image';
              } else if (mimeType.startsWith('video')) {
                imagetypes = 'video';
              }

              console.log('...media type:', imagetypes);
                navigation.navigate('NewReelcamera', {
                typescreen: 'Reel',
                picture: uri,
                imagetype: imagetypes // dynamically set based on file extension
              }); 
 
            }}>
              <Image
                source={{ uri: item.node.image.uri }}
                style={{
                  width: imageSize,
                  height: imageSize,
                  margin: 2,
                  borderRadius: 6,
                }}
              />
            </TouchableOpacity>
          )}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2089dc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  albumButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  albumSelected: {
    backgroundColor: '#2089dc',
  },
  albumText: {
    color: '#333',
    fontWeight: '600',
  },
  albumTextSelected: {
    color: 'white',
  },
  image: {
    // width: imageSize,
    // height: imageSize,
    margin: 2,
    borderRadius: 6,
  },
});

export default GalleryShow;



