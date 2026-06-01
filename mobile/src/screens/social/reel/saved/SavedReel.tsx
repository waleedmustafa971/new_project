import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated
} from 'react-native';
import Video from 'react-native-video';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as base from '../../../../component/global';
import { RootStackParamList } from '../../../../navigation/navigation';

type SavedReelRouteProp = RouteProp<RootStackParamList, 'SavedReel'>;

type Props = {
  route: SavedReelRouteProp;
};

type TemplateItem = {
  id: string;
  url: string;
  templateVideoUrl: string;
  clip: string;
  durations: number[];
};

const screenWidth = Dimensions.get('window').width;

const SavedReel: React.FC<Props> = ({ route }) => {
  const { userId } = route.params;
  const navigation = useNavigation();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchTemplates = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {

      console.log(base.BASE_URL + `/apis/video/getusertemplate/${userId}?page=${page}&limit=${limit}`);
      const response = await axios.get(
        base.BASE_URL + `/apis/video/getusertemplate/${userId}?page=${page}&limit=${limit}`
      );
      const newTemplates = response.data.templates;
      setTemplates(prev => [...prev, ...newTemplates]);
      setPage(prev => prev + 1);
      if (page >= response.data.totalPages) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const renderItem = ({ item }: { item: TemplateItem }) => (
    <VideoCard item={item} navigation={navigation} />
  );

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={templates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.flatListContent}
        onEndReached={fetchTemplates}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && <ActivityIndicator size="large" color="#000" />}
      />
    </View>
  );
};

export default SavedReel;

type VideoCardProps = {
  item: TemplateItem;
  navigation: any;
};

const VideoCard: React.FC<VideoCardProps> = ({ item, navigation }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iconOpacity = useRef(new Animated.Value(1)).current;

  const togglePlay = () => {
    setIsPlaying(prev => !prev);

    Animated.sequence([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.videoContainer}>
      <TouchableOpacity activeOpacity={0.9} onPress={togglePlay}>
        <Video
          source={{ uri: base.BASE_URL + item.templateVideoUrl }}
          style={styles.video}
          muted={true}
          resizeMode="cover"
          repeat={true}
          paused={!isPlaying}
          ignoreSilentSwitch="ignore"
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          onLoad={() => setIsLoading(false)}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        <Animated.View style={[styles.centerOverlay, { opacity: iconOpacity }]}>
          <Icon name={isPlaying ? 'pause' : 'play'} 
          size={18} color="#ffffff" />
        </Animated.View>

        <View style={styles.clipInfo}>
          <Text style={{ fontSize: 14, color: '#ffffff', marginLeft: 10 }}>
            {item.clip} Clips
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', padding: 10 }}>Saved Template</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flatListContent: {
    padding: 5,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  videoContainer: {
    width: (screenWidth - 30) / 2, marginTop: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fffffff',
    marginBottom: 10,
    height: 250, borderWidth: 1, borderColor: 'green'
  },
  video: {
    width: '100%',
    height: 400,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centerOverlay: {
    position: 'absolute',
    alignContent: 'center', alignItems: 'center',
    alignSelf: 'center',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 40, height: 40,padding: 10,
    borderRadius: '50%', marginTop: '50%', left: '50%'

  },
  clipInfo: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
});