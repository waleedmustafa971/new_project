import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const liveData = [
  {
    id: '1',
    title: 'Live Music Show',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    background: 'https://images.unsplash.com/photo-1589983846983-b2aa3f65069c',
    viewers: 1200,
  },
  {
    id: '2',
    title: 'Cooking with Anna',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    background: 'https://images.unsplash.com/photo-1589983846983-b2aa3f65069c',
    viewers: 935,
  },
  {
    id: '3',
    title: 'Gaming Marathon',
    avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
    background: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
    viewers: 2020,
  },
  // Add more live streams
];

const LiveScreen = () => {
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.background }} style={styles.backgroundImage} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.liveBadge}>LIVE</Text>
          <Text style={styles.viewerCount}>{item.viewers} watching</Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={liveData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
    />
  );
};
const styles = StyleSheet.create({
  itemContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'flex-start',
    marginBottom: 60,
  },
  liveBadge: {
    backgroundColor: 'red',
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    fontSize: 14,
  },
  viewerCount: {
    color: '#fff',
    marginTop: 6,
    fontSize: 14,
  },
});

export default LiveScreen;
