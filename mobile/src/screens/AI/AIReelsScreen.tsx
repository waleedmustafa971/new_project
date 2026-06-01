import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import React from "react";
import Ionicons from "react-native-vector-icons/Ionicons";

const AIReelsScreen = ({ navigation } : any) => {
    return (
        <View style={{ flex: 1, backgroundColor: "#f7f7f7" }}>

            {/* 🔥 Header with Back */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="black" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>AI Creator</Text>

                {/* empty view for spacing */}
                <View style={{ width: 22 }} />
            </View>

            {/* Content */}
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                <Text style={styles.subHeader}>
                    Create reels, captions & stories using AI
                </Text>

                <TouchableOpacity style={styles.card}>
                    <Text style={styles.cardTitle}>🎬 Generate Reel Idea</Text>
                    <Text style={styles.cardDesc}>
                        Get viral reel ideas with scenes & captions
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card}>
                    <Text style={styles.cardTitle}>📝 Write Caption</Text>
                    <Text style={styles.cardDesc}>
                        Generate engaging captions instantly
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card}>
                    <Text style={styles.cardTitle}>📖 Story Creator</Text>
                    <Text style={styles.cardDesc}>
                        Create story slides with text & polls
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card}>
                    <Text style={styles.cardTitle}>#️⃣ Generate Hashtags</Text>
                    <Text style={styles.cardDesc}>
                        Boost reach with trending hashtags
                    </Text>
                </TouchableOpacity>


                <TouchableOpacity style={styles.card}>
                    <Text style={styles.cardTitle}>
                        🎵 Create Your Own Song with AI
                    </Text>
                    <Text style={styles.cardDesc}>
                        Generate lyrics, melody ideas, and vibe for your reel music
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

export default AIReelsScreen;

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },

    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",

        // shadow
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111",
    },

    subHeader: {
        fontSize: 14,
        color: "#666",
        marginBottom: 20,
    },

    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,

        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
        marginBottom: 4,
    },

    cardDesc: {
        fontSize: 13,
        color: "#777",
    },
});