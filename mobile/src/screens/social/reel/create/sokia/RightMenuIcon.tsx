import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { rgbaColor } from 'react-native-reanimated/lib/typescript/Colors';
import Feather from 'react-native-vector-icons/Feather'

interface SidebarProps {
    onOpenFilters: () => void;
    onOpenAudio: () => void;
    onOpenTimer: () => void;
    onOpenStickers: () => void;
    onOpenText: () => void;
    isFilterOpen: boolean; // Add this
    isStickersOpen: boolean; // Add this
}

const RightMenuIcon = ({ onOpenFilters, onOpenAudio, onOpenTimer, onOpenStickers, onOpenText, isFilterOpen }: SidebarProps) => {
    return (
        <View style={styles.sidebar}>
            {/* Filter Tool */}
            <TouchableOpacity style={styles.iconButton} onPress={onOpenFilters}>

                <Text style={[
                    styles.label,
                    { color: isFilterOpen ? '#FF0050' : '#ffffff' } // Changes color when open
                ]}>Filter</Text>
                <Feather name="filter" size={15} color={isFilterOpen ? '#FF0050' : '#ffffff'} />
            </TouchableOpacity>

            {/* Audio Tool */}
            <TouchableOpacity style={styles.iconButton} onPress={onOpenAudio}>
                <Text style={styles.label}>Audio</Text>
                <Feather name="music" size={15} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={onOpenTimer}>
                <Text style={styles.label}>Timer</Text>
                <Feather name="clock" size={15} color="#ffffff" />

            </TouchableOpacity>

            {/* Stickers Tool */}
            <TouchableOpacity style={styles.iconButton} onPress={onOpenStickers}>

                <Text style={styles.label}>Stickers</Text>
                <Feather name="smile" size={15} color="#ffffff" />
            </TouchableOpacity>

            {/* Text Tool */}
            <TouchableOpacity style={styles.iconButton} onPress={onOpenText}>
                <Text style={styles.iconText}>Aa</Text>
                <Feather name="type" size={15} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    sidebar: {
        flexDirection: 'column',
        alignItems: 'flex-end',   // 👈 push content to the right
        justifyContent: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 5,
        borderRadius: 20,
        height: 200,
    },

    iconButton: {
        flexDirection: 'row',
        justifyContent: 'center', marginLeft: 5,
        alignItems: 'center', height: 30, borderRadius: 15, padding: 7,
        marginBottom: 15, backgroundColor: 'rgba(0, 0, 0, 0.3)', // ✅ black with 50% opacity
    },
    iconText: {
        color: '#ffffff',
        fontSize: 12, marginRight: 5
    },
    label: {
        color: '#ffffff',
        fontSize: 12,
        marginTop: 0, marginRight: 5,
        fontWeight: '600',
    }
});

export default RightMenuIcon;