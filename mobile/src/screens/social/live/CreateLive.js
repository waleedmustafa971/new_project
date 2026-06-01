import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { height, width } = Dimensions.get('window');

const liveStreams = [{
  current_page: 1,
  per_page: 5,
  total_pages: 3,
  live_streams: [
    {
      id: 'stream1',
      host: { id: 'user123', name: 'BeachVibes', avatar: 'https://example.com/avatar1.jpg', followers_count: 12000, is_following: false },
      stream_url: 'https://your-streaming-server.com/stream1.m3u8',
      thumbnail: 'https://example.com/stream1-thumbnail.jpg',
      title: 'Live Beach Party 🎉',
      location: 'Miami, FL',
      coins: 1500,
      viewers_count: 2500,
      request_boxes: 5,
      messages: [{ id: 'm1', user: 'Alice', message: 'Nice view!' }, { id: 'm2', user: 'Bob', message: 'Send gifts!' }],
    },
    {
      id: 'stream2',
      host: { id: 'user456', name: 'CityWalker', avatar: 'https://example.com/avatar2.jpg', followers_count: 8000, is_following: true },
      stream_url: 'https://your-streaming-server.com/stream2.m3u8',
      thumbnail: 'https://example.com/stream2-thumbnail.jpg',
      title: 'Exploring New York 🚶',
      location: 'New York, NY',
      coins: 2200,
      viewers_count: 1800,
      request_boxes: 5,
      messages: [{ id: 'm3', user: 'Chris', message: 'Awesome place!' }, { id: 'm4', user: 'Dana', message: 'Wave to us!' }],
    },
    {
      id: 'stream3',
      host: { id: 'user789', name: 'GamerZone', avatar: 'https://example.com/avatar3.jpg', followers_count: 5000, is_following: false },
      stream_url: 'https://your-streaming-server.com/stream3.m3u8',
      thumbnail: 'https://example.com/stream3-thumbnail.jpg',
      title: 'Late Night Gaming 🎮',
      location: 'Los Angeles, CA',
      coins: 500,
      viewers_count: 700,
      request_boxes: 5,
      messages: [{ id: 'm5', user: 'Ella', message: 'Which game?' }, { id: 'm6', user: 'Mike', message: 'Cool stream!' }],
    },
  ],
}];

const CreateLive = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  const renderItem = ({ item }) => (
    <View style={styles.streamContainer}>
      {/* Background Image */}
      <Image source={{ uri: item.thumbnail }} style={styles.streamImage} />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.hostInfo}>
            <Image source={{ uri: item.host.avatar }} style={styles.avatar} />
            <View>
              <Text style={styles.hostName}>{item.host.name}</Text>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followText}>{item.host.is_following ? 'Following' : 'Follow'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.coinsView}>
              <Icon name="logo-bitcoin" size={16} color="#fff" />
              <Text style={styles.coinsText}>{item.coins}</Text>
            </View>
            <View style={styles.coinsView}>
              <Icon name="eye" size={16} color="#fff" />
              <Text style={styles.coinsText}>{item.viewers_count}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => Alert.alert('Close Pressed')}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Request Boxes */}
        <View style={styles.requestContainer}>
          {Array.from({ length: item.request_boxes }).map((_, index) => (
            <View key={index} style={styles.requestBox}>
              <Icon name="person-add" size={20} color="#fff" />
            </View>
          ))}
        </View>

        {/* Chat Messages - Take remaining space */}
        <View style={styles.messageWrapper}>
          <View style={styles.messageContainer}>
            {item.messages.map((msg) => (
              <Text key={msg.id} style={styles.messageText}>
                <Text style={{ fontWeight: 'bold' }}>{msg.user}: </Text>
                {msg.message}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#999"
            style={styles.input}
          />
          <TouchableOpacity>
            <Icon name="send" size={24} color="#fff" style={styles.footerIcon} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="gift" size={24} color="#fff" style={styles.footerIcon} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="share-social" size={24} color="#fff" style={styles.footerIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={liveStreams[0].live_streams}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.y / height);
        setCurrentIndex(index);
      }}
    />
  );
};

const styles = StyleSheet.create({
  streamContainer: {
    width,
    height,
    backgroundColor: '#000'
  },
  streamImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  hostInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, borderWidth: 2, borderColor: '#fff' },
  hostName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  followButton: { backgroundColor: 'red', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4 },
  followText: { color: '#fff', fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  coinsView: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  coinsText: { color: '#fff', marginLeft: 4 },
  closeButton: { marginLeft: 8 },

  requestContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  requestBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  messageWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: { paddingHorizontal: 16 },
  messageText: { color: '#fff', marginVertical: 2 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  footerIcon: { marginHorizontal: 8 },
});

export default CreateLive;
