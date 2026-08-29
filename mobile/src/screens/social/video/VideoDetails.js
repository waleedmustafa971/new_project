// VideoDetailsScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, 
    FlatList, Dimensions, ScrollView } from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL } from '../../../component/global';

const { width } = Dimensions.get('window');


const VideoDetails = ({ route, navigation }) => {
    const { video } = route.params;

    const relatedVideos = [video, video, video]; // Replace with your real related videos

    const renderRelatedItem = ({ item }) => (
        <TouchableOpacity
            style={styles.relatedItem}
            onPress={() => navigation.push('VideoDetails', { video: item })}
        >
            <Image
                source={{ uri: `${BASE_URL}${item.bannerImage}` }}
                style={styles.relatedThumbnail}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Text numberOfLines={2} style={styles.relatedTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.relatedDescription}>{item.description}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <Video
                source={{ uri: video.url }}
                style={styles.videoPlayer}
                controls
                resizeMode="contain"
            />
            <Text style={styles.videoTitle}>{video.title}</Text>

            {/* Channel Info & Actions */}
            <View style={styles.channelContainer}>
                <Image
                    source={require('../../../assets/user.png')} // Replace with real channel image
                    style={styles.channelImage}
                />
                <Text style={styles.channelName}>Channel Name</Text>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Feather name="thumbs-up" size={20} color="black" />
                        <Text style={styles.actionText}>Like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={20} color="black" />
                        <Text style={styles.actionText}>Comment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons name="share" size={20} color="black" />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Related Videos */}
            <Text style={styles.relatedHeader}>Related Videos</Text>
            <FlatList
                data={relatedVideos}
                keyExtractor={(item, index) => item._id + index}
                renderItem={renderRelatedItem}
                scrollEnabled={false}
            />
        </ScrollView>
    );
};

export default VideoDetails;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    videoPlayer: {
        width: '100%',
        height: 220,
        backgroundColor: 'black',
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        margin: 10,
    },
    channelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 10,
    },
    channelImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    channelName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 12,
    },
    relatedHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 10,
        marginTop: 10,
        marginBottom: 5,
    },
    relatedItem: {
        flexDirection: 'row',
        marginHorizontal: 10,
        marginBottom: 10,
    },
    relatedThumbnail: {
        width: 120,
        height: 80,
        borderRadius: 8,
    },
    relatedTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    relatedDescription: {
        fontSize: 12,
        color: '#555',
    },
});
