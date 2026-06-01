import React, {useEffect, useRef, useState} from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import ActiveMusicBadge from '../../../music/ActiveMusicBadge';
import Sound from 'react-native-sound';
import Feather from 'react-native-vector-icons/Feather';

interface HeaderControlsProps {
    onBack: () => void;
    onExport: () => void;
    onAddText: () => void;
    onStopSound: () => void;
    playingId: string | null;
    isExporting: boolean;
    volumnSetting: () => void;
}
Sound.setCategory('Playback');

const HeaderControls = ({ onBack, onExport, onAddText, isExporting, playingId, onStopSound,
    volumnSetting
 }: HeaderControlsProps) => {
    
    return (
        <View style={styles.topOverlay}>
            {/* Left Side: Close/Back */}
            <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.7}>
                  <Feather name="x" size={18} color="white" />
            </TouchableOpacity>
                {
                    playingId ?
                        <ActiveMusicBadge // this is also called in VideoNativeffmge
                            playingId={playingId}
                            onStop={onStopSound}
                            volumnSetting={volumnSetting}
                        /> : null
                }
            {/* Right Side: Tools and Export */}
            <View style={styles.topRightActions}>
                <TouchableOpacity
                    onPress={onExport}
                    style={[styles.doneButton, isExporting && { opacity: 0.6 }]}
                    disabled={isExporting}
                    activeOpacity={0.8}
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color="black" />
                    ) : (
                        <Text style={styles.doneText}>Next</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    topOverlay: {
        position: 'absolute',
        top: 0, // Adjusted for status bar height
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#000', height: 60,
        paddingHorizontal: 5,
        zIndex: 100, // Ensure it stays above everything
    },
    topRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 25,
        height: 25,
        borderRadius: 21,
        backgroundColor: 'rgba(0,0,0,0.45)', // Slightly darker for better visibility
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12, marginTop: 20
    },
    buttonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '300'
    },
    smallIcon: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
    },
    doneButton: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 25,
        marginLeft: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    doneText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14
    },
});

export default HeaderControls;