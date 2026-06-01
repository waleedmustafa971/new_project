import React, { useState, useRef, useEffect } from 'react'
import { View, TouchableOpacity, Animated, StyleSheet, Image } from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import AudioRecorderPlayer from 'react-native-audio-recorder-player'
const defaultUserImage = require("../../../assets/user.png"); // Replace with correct path
const audioRecorderPlayer = new AudioRecorderPlayer()
import AsyncStorage from '@react-native-async-storage/async-storage';
import Waveform from './Waveform';
import AudioTime from './AudioTime';

const VoicePlayer = ({ url, userimage, me, xpartner }) => {

    //  console.log('audio voice player' + me + '.... userid---partnerid' + xpartner + 'user image' + userimage)
    //  console.log('pppp---' + xpartner, me, xpartner === me); // Check this
    const [isPlaying, setIsPlaying] = useState(false);
    const [mypicture, setMypicture] = useState(null)
    // Define pattern of bar heights using sin()
    const translateX = useRef(new Animated.Value(0)).current;
    const pattern = new Array(40).fill(0).map((_, i) => 10 + Math.sin(i / 4) * 10);
    const barWidth = 1;
    const barMargin = 1;
    const patternWidth = pattern.length * (barWidth + barMargin * 2);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);


    const checkUser = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            setMypicture(userData.image);
        } else {
            console.log("No user data found");
        }

    }
    useEffect(() => {
        checkUser()
    }, [isPlaying])

    const formatMilliseconds = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };



    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.timing(translateX, {
                    toValue: -patternWidth, // move left by pattern's width
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start()
        } else {
            translateX.stopAnimation()
            translateX.setValue(0);
        }
    }, [isPlaying]);

    const onPlayPause = async () => {
        if (!isPlaying) {
            setIsPlaying(true);

            try {
                await audioRecorderPlayer.startPlayer(url);

                audioRecorderPlayer.addPlayBackListener(async (e) => {
                    setCurrentTime(e.currentPosition);
                    setDuration(e.duration);
                    const remaining = Math.abs(e.duration - e.currentPosition);
                    if (remaining < 500) {
                        await onStop();
                    }
                });

            } catch (err) {
                console.warn(err);
                setIsPlaying(false);
            }

        } else {
            await onStop();
        }
    };


    const onStop = async () => {
        try {
            await audioRecorderPlayer.stopPlayer();
            audioRecorderPlayer.removePlayBackListener(); // ensure no multiple listeners
        } catch (err) {
            console.warn('Failed to stop:', err);
        } finally {
            setIsPlaying(false); // this triggers icon change
        }
    };


    return (
        <TouchableOpacity style={styles.container} onPress={onPlayPause}>
            {/*   {
                userimage ?
                <Image source={{uri : xpartner === me ? mypicture : userimage }} style={styles.avatar} />
                :
                <Image source={defaultUserImage} style={styles.avatar} />
            } */}
            <Image source={defaultUserImage} style={styles.avatar} />

            <View style={styles.iconButton}>
                <Icon
                    name={isPlaying ? 'stop-circle-outline' : 'play-circle-outline'}
                    size={35}
                    color="#000"
                />
            </View>

            <View style={styles.waveform}>
                {/* <AudioTime currentTime={currentTime} duration={duration} />  */} 
                <Waveform isPlaying={isPlaying} color="#000" />
            </View>
        </TouchableOpacity>
    )
}
export default VoicePlayer

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40
    },
    iconButton: { padding: 2 },
    waveform: {
        overflow: 'hidden',
        marginLeft: 0,
        height: 50,
        width: 100 // adjust to your UI
    },
    bar: {
        width: 1,
        backgroundColor: '#000', // or use conditional color if needed
        marginHorizontal: 1,
        borderRadius: 5, // rounds both top and bottom
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
});
