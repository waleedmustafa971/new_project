import React from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';


const DraftMotorslist = ({ data, navigation }) => {

    const datadraft = data ? data : null

    const renderItem = ({ item, index }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff' }]} 
        onPress={() => {
            navigation.navigate("MotorsAds", {
                "item": item
            })
        }} key={item._id}>
            <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{item.status}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{item.shortTitle}</Text>
            <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.subtitle}
            >
                {item.description}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Complete your ads and get live</Text>
            <FlatList
                data={datadraft}
                horizontal
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 5,
        backgroundColor: '#ffffff',
    },
    header: {
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 12,
    },
    listContainer: {
        paddingHorizontal: 5,
    },
    card: {
        width: 200,
        padding: 12,
        marginRight: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1, borderColor: '#f2f2f2'
    },
    title: {
        fontSize: 15, fontWeight: 'bold', width: 150
    },
    subtitle: {
        fontSize: 10
    },
    text: {
        fontSize: 14,
        color: '#333',
    },
    distance: {
        marginTop: 6,
        fontSize: 13,
        color: '#000',
    },
    distanceBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#e6f0ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    distanceText: {
        fontSize: 12,
        color: '#000',
        fontWeight: '600',
    },
});

export default DraftMotorslist;
