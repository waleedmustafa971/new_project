import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Video from 'react-native-video';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// 1. Types
interface VideoTemplate {
  id: string;
  url: string;
  clip: number;
  durations: number[];
}

type RootStackParamList = {
  CreateTemplate: {
    id: string;
    videoUrl: string;
    clip: number;
    durations: number[];
  };
};

const { width: screenWidth } = Dimensions.get('window');

const imageData: VideoTemplate[] = [
  { id: '1', url: 'https://stream.mux.com/3At1EX4VUlU1cyGXrmXTB00heL8BDq5yCmw024nbWmWhY.m3u8', clip: 2, durations: [10, 10.3] },
  { id: '2', url: 'https://stream.mux.com/xFi3f9CN36tURUG7FwzcUAKmOPk8lZyo8mYugX3VpnQ.m3u8', clip: 3, durations: [5, 5, 5] },
  { id: '3', url: 'https://stream.mux.com/v7k8Wb89kVxwLmYYWEum8iTfx5lfxJDQtXvbwPwxy02E.m3u8', clip: 4, durations: [3.2, 3.7, 3.7, 3.6] },
  { id: '4', url: 'https://stream.mux.com/X6yLabWWFDaKZf7AykAo01Mh23x01sDPiQviRTPXz475g.m3u8', clip: 5, durations: [5, 5, 5, 5, 5] }
];

const ListTemplate: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleNavigation = (item: VideoTemplate) => {
    console.log("Navigating with:", item.id);
    navigation.navigate("CreateTemplate", {
      id: item.id,
      videoUrl: item.url,
      clip: item.clip,
      durations: item.durations
    });
  };

  const renderItem = ({ item }: { item: VideoTemplate }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.videoContainer}
      onPress={() => handleNavigation(item)}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Video
          source={{ uri: item.url }}
          style={styles.videoStyle}
          muted={true}
          resizeMode="cover"
          paused={true}
          playInBackground={false}
          playWhenInactive={false}
        />
      </View>
      
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.clipBadge}>
          <Text style={styles.clipText}>{item.clip} Clips</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      <FlatList
        data={imageData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.flatListContent}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Easily Create with Templates</Text>
            <Text style={styles.subtitle}>
              Replace clips in these reels with your photos and videos
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ListTemplate;

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { padding: 16 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 11, color: '#666', marginTop: 2 },
  flatListContent: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  videoContainer: {
    width: (screenWidth / 2) - 18, 
    height: 460, 
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  videoStyle: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  clipBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  clipText: { fontSize: 10, color: '#fff', fontWeight: 'bold' }
});