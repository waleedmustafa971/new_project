import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const { height } = Dimensions.get("window");
const MODAL_HEIGHT = 180;

export default function SaveModal({ visible, savedata, onClose, onSave }: any) {
    const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: MODAL_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    return (
        <Modal transparent visible={visible} animationType="none">
            {/* Overlay */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.modal,
                    {
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Drag Indicator */}
                <View style={styles.dragIndicator} />

                {/* Header Row */}
                <View style={styles.headerRow}>
                    <Text numberOfLines={1} style={styles.title}>
                        {savedata?.videoTitle}
                    </Text>

                    <TouchableOpacity
                        onPress={() => {
                            console.log("Saving:", savedata?._id);
                            onClose();
                        }}
                    >
                        <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Save Button */}
                <TouchableOpacity
                    style={styles.bigButton}
                    onPress={() => {
                        console.log("Saving:", savedata?._id);
                        onSave(savedata);   // 🔥 send data to parent
                    }}
                >
                    <Ionicons name="bookmark" size={14} color="#fff" />
                    <Text style={styles.bigButtonText}>Save Reel</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },

    modal: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0, // ✅ Proper bottom attachment
        height: MODAL_HEIGHT,
        backgroundColor: "#fff",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        paddingTop: 12,
        elevation: 10,
    },

    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: "#ddd",
        borderRadius: 3,
        alignSelf: "center",
        marginBottom: 15,
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    title: {
        flex: 1,
        fontSize: 12,
        fontWeight: "600",
        color: "#111",
        marginRight: 10,
    },

    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 20,
    },

    bigButton: {
        flexDirection: "row",
        backgroundColor: "#000",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    bigButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 8,
    },
});