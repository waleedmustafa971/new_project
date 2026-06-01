import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    PanResponder,
    Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ColorBoxScreen from './ColorBoxScreen';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// FIX: Font map with both the require path and the Font Family string
const FONT_MAP: any = {
    'Classic': { data: require('../../../../../assets/font/Classica-Bold.ttf'), family: 'Classica-Bold' },
    'Deco': { data: require('../../../../../assets/font/Deco.ttf'), family: 'Deco' },
    'Modern': { data: require('../../../../../assets/font/arial_narrow_7.ttf'), family: 'arial_narrow_7' },
    'Marimpa': { data: require('../../../../../assets/font/Marimpa.ttf'), family: 'Marimpa' },
    'Editor': { data: require('../../../../../assets/font/EDITORS.ttf'), family: 'EDITORS' },
    'Honey': { data: require('../../../../../assets/font/Honey-I-spilt-Verdana.ttf'), family: 'Honey-I-spilt-Verdana' },
    'Type': { data: require('../../../../../assets/font/Typewriterhand.ttf'), family: 'Typewriterhand' }
};

const SokiaTextEditor = ({
    visible,
    initialText,
    initialColor,
    initialSize,
    initialbgColor,
    onSave,
    onClose
}: any) => {
    const [text, setText] = useState(initialText);
    const [color, setColor] = useState(initialColor || '#000');
    const [size, setSize] = useState(initialSize || 26);
    const [selectedFont, setSelectedFont] = useState('Classic');
    const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
    const [openBackgroundColorbox, setOpenBackgroundColorbox] = useState(false);
    const [selectedbgColor, setSelectedbgColor] = useState(initialbgColor || '#000');

    const MIN_FONT = 12;
    const MAX_FONT = 40;
    const SLIDER_HEIGHT = 250;

    useEffect(() => {
        if (visible) {
            setText(initialText);
            // Default to Classic when opening
            if (!initialText) setSelectedFont('Classic');
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const relativeY = Math.max(0, Math.min(SLIDER_HEIGHT, gestureState.moveY - (SCREEN_HEIGHT * 0.25)));
                const percent = 1 - (relativeY / SLIDER_HEIGHT);
                const newSize = MIN_FONT + (percent * (MAX_FONT - MIN_FONT));
                setSize(newSize);
            },
        })
    ).current;

    const toggleAlignment = () => {
        const sequence: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
        const nextIndex = (sequence.indexOf(alignment) + 1) % 3;
        setAlignment(sequence[nextIndex]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconCircle}>
                            <MaterialCommunityIcons name="text-fields" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconCircle}>
                            <Ionicons name="time-outline" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            // Correcting the syntax: pass variables as arguments
                            onSave(
                                text,
                                color,
                                size,
                                FONT_MAP[selectedFont],
                                alignment,
                                selectedbgColor
                            );

                            console.log("Saved Data:", {
                                text,
                                color,
                                size,
                                font: FONT_MAP[selectedFont],
                                alignment,
                                bgcolor: selectedbgColor
                            });
                        }}
                    >
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>

                {/* Wedge Slider (Tapered Design) */}
                <View style={styles.leftSliderWrapper} {...panResponder.panHandlers}>
                    <View style={styles.wedgeBase}>
                        <View style={styles.wedgeShape} />
                        <View style={[styles.sliderKnob, { bottom: `${((size - MIN_FONT) / (MAX_FONT - MIN_FONT)) * 100}%` }]} />
                    </View>
                </View>

                {/* Main Input Area */}
                <View style={styles.inputWrapper}>
                    <TextInput
                        autoFocus
                        multiline
                        style={[
                            styles.input,
                            {
                                color: color,
                                fontSize: size,
                                fontFamily: FONT_MAP[selectedFont].family, // Use the string name here
                                backgroundColor: selectedbgColor,
                                textAlign: alignment,
                            }
                        ]}
                        value={text}
                        onChangeText={setText}
                        placeholder="Start typing"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    {/* Font Selector */}
                    <View style={styles.fontStyleContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            {Object.keys(FONT_MAP).map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    onPress={() => setSelectedFont(f)}
                                    style={[styles.stylePill, selectedFont === f && styles.activePill]}
                                >
                                    <Text style={[styles.pillText, selectedFont === f && styles.activePillText]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Background Colorbox Popup */}
                    {openBackgroundColorbox && (
                        <View style={styles.colorboxfilter}>
                            <ColorBoxScreen onSelectbgColor={(colors) => setSelectedbgColor(colors[0])} />
                        </View>
                    )}

                    {/* Bottom Toolbar */}
                    <View style={styles.bottomToolbar}>
                        <TouchableOpacity><Text style={styles.toolIcon}>Aa</Text></TouchableOpacity>

                        <TouchableOpacity onPress={() => setOpenBackgroundColorbox(!openBackgroundColorbox)}>
                            <Ionicons name="color-palette" size={24} color={openBackgroundColorbox ? "#007AFF" : "white"} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleAlignment}>
                            <MaterialCommunityIcons
                                name={alignment === 'left' ? "format-align-left" : alignment === 'right' ? "format-align-right" : "format-align-center"}
                                size={24} color="white"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setSelectedbgColor(selectedbgColor === 'transparent' ? '#000000' : 'transparent')}>
                            <MaterialCommunityIcons name="format-letter-case" size={24} color={selectedbgColor !== 'transparent' ? "#007AFF" : "white"} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, alignItems: 'center' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    doneText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    leftSliderWrapper: { position: 'absolute', left: 25, top: '25%', height: 250, width: 40, zIndex: 100 },
    wedgeBase: { flex: 1, width: 12, alignItems: 'center' },
    wedgeShape: { width: 0, height: '100%', borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 250, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: 4 },
    sliderKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: 'white', left: -5, elevation: 5 },
    inputWrapper: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
    input: { width: '100%', padding: 15, borderRadius: 10 },
    fontStyleContainer: { marginBottom: 15 },
    stylePill: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    activePill: { backgroundColor: 'white' },
    pillText: { color: 'white', fontWeight: 'bold' },
    activePillText: { color: 'black' },
    colorboxfilter: { paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.8)' },
    bottomToolbar: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.8)', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, gap: 25, marginBottom: 30, alignItems: 'center' },
    toolIcon: { color: 'white', fontSize: 20, fontWeight: 'bold' }
});

export default SokiaTextEditor;