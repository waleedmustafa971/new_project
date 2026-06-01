import React from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity, Image
} from 'react-native';
import * as base from '../../../component/global'

const DraftList = ({ data, navigation }) => {

    const datadraft = data ? data : null

    const renderItem = ({ item, index }) => {
        const firstImage = item?.images?.[0]?.image;
        const imageUri = firstImage ? base.BASE_URL + firstImage : null;

        return (
            <TouchableOpacity style={[styles.card, { backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff' }]}
                onPress={() => {
                    navigation.navigate("CreateAds", {
                        "item": item
                    })
                }} key={index}>
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <Text>No Image</Text>
                )}
                <Text
                    style={styles.title}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {item.shortTitle}
                </Text>
                <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{item.status}</Text>
                </View>
            </TouchableOpacity>
        );
    };


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
        fontSize: 14,
        marginLeft: 8,
        marginBottom: 2,
    },
    listContainer: {
        paddingHorizontal: 5,
    },
    image: {
        height: 100,
        width: '100%',
        borderRadius: 5,
    },
    card: {
        width: 150,
        padding: 12,
        marginRight: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1, borderColor: '#f2f2f2'
    },
    title: {
        fontSize: 12
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
        top: 13,
        right: 15,
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

export default DraftList;
