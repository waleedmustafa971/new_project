import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

type VideoPlayerProps = {
    videoUri: string;
    onDelete: () => void;
    onPost: (videoUri: string, isMuted: boolean) => void;
};

const VideoPlayer = ({ videoUri, onDelete, onPost }: VideoPlayerProps) => {
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const togglePlayback = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handlePost = () => {
        onPost(videoUri, isMuted);
    };

    return (
        <View style={{ width: '100%', height: '100%', position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
            <Video
                source={{ uri: videoUri }}
                ref={videoRef}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                paused={!isPlaying}
                muted={isMuted}
                repeat
            />

            {/* Play/Pause Button */}
            <TouchableOpacity onPress={togglePlayback} style={styles.playPauseButton}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color="white" />
            </TouchableOpacity>

            {/* Bottom Buttons */}
            <View style={styles.bottomButtonsContainer}>
                {/* Delete Button */}
                <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                    <Feather name="trash-2" size={15} color="white" />
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>

                {/* Mute Toggle */}
                <TouchableOpacity onPress={toggleMute} style={styles.actionButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color="white" />
                    <Text style={styles.buttonText}>{isMuted ? 'Muted' : 'Unmuted'}</Text>
                </TouchableOpacity>

                {/* Post Button */}
                <TouchableOpacity onPress={handlePost} style={styles.actionButton}>
                    <Feather name="upload" size={15} color="white" />
                    <Text style={styles.buttonText}>Post</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    playPauseButton: {
        position: 'absolute',
        top: '45%',
        left: '45%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 30,
        padding: 10,
    },
    bottomButtonsContainer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 10,
        borderRadius: 10,
    },
    buttonText: {
        color: 'white',
        marginTop: 5,
        fontSize: 10,
    },
});

export default VideoPlayer;
