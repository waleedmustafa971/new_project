import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    SafeAreaView,
} from "react-native";
import MultiSlider from '@ptomasroos/react-native-multi-slider';

const { width } = Dimensions.get('window');

const TimerModal = ({ visible = false, onClose, takeTimerToParent, videoDuration = 50 }) => {
    // Initialize trimEnd at the max duration so the slider isn't collapsed at 0
    const [trimStart, setTrimStart] = useState(0); 
    const [trimEnd, setTrimEnd] = useState(videoDuration);

    // Reset values when modal opens to match the video duration
    useEffect(() => {
        if (visible) {
            setTrimStart(0);
            setTrimEnd(videoDuration);
        }
    }, [visible, videoDuration]);

    const handleDone = () => {
        if (takeTimerToParent) {
            takeTimerToParent({
                startTime: trimStart,
                endTime: trimEnd,
                duration: trimEnd - trimStart
            });
        }
        onClose();
    };

    return (
        <Modal 
            visible={!!visible} 
            animationType="slide" 
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.fullScreenOverlay}>
                {/* 1. Clickable transparent area to close modal if user taps outside */}
                <TouchableOpacity 
                    style={styles.clickableArea} 
                    onPress={onClose} 
                    activeOpacity={1} 
                />

                {/* 2. The Header - Floating above the sheet or at the top */}
                <SafeAreaView style={styles.topHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.headerActionText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDone}>
                        <Text style={[styles.headerActionText, { fontWeight: 'bold' }]}>Done</Text>
                    </TouchableOpacity>
                </SafeAreaView>

                {/* 3. White Sheet Section - Fixed at Bottom: 0 */}
                <View style={styles.sheetContainer}>
                    <View style={styles.dragHandle} />
                    
                    <Text style={styles.timeLabel}>
                        {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s
                    </Text>

                    <MultiSlider
                        values={[trimStart, trimEnd]}
                        sliderLength={width - 60}
                        min={0}
                        max={videoDuration}
                        step={0.1}
                        allowOverlap={false}
                        snapped
                        onValuesChange={(values) => {
                            setTrimStart(values[0]);
                            setTrimEnd(values[1]);
                        }}
                        selectedStyle={{ backgroundColor: '#FFD700' }}
                        markerStyle={styles.markerStyle}
                        trackStyle={{ height: 6 }}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullScreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)', // Dimmed background
        justifyContent: 'flex-end',         // Pushes content to bottom: 0
    },
    clickableArea: {
        ...StyleSheet.absoluteFillObject,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 10,
    },
    headerActionText: {
        color: 'white',
        fontSize: 17,
        marginTop: 20
    },
    sheetContainer: {
        height: 220,                         // Slightly more than 200 to account for drag handle
        backgroundColor: 'white',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginTop: 12,
        marginBottom: 20,
    },
    timeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: 'black',
        marginBottom: 15,
    },
    markerStyle: {
        backgroundColor: '#FFD700',
        height: 24,
        width: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'white',
        elevation: 3,
    }
});

export default TimerModal;