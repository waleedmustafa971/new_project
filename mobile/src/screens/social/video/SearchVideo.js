import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, Image, Dimensions
} from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as base from '../../../component/global'
const screenWidth = Dimensions.get('window').width;
//const cardWidth = (screenWidth / 2) - 16; // Adjust for margin and padding
const cardWidth = (screenWidth - 32) / 2; 

const SearchVideo = ({ search, products }) => {
    const navigation = useNavigation()
    const [currentPage, setCurrentPage] = useState(1);
    const [isloading, setIsloading] = useState(false);
    const typingTimeout = useRef(null);
    const [userid, setUserid] = useState('');
    const [totalPages, setTotalPages] = useState(1);




    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.cardContainer}  onPress={() => navigation.navigate('VideoDetails', { video: item })}>
            <View style={styles.imageWrapper}>
                <Image
                    source={
                        item.bannerImage
                            ? { uri: base.BASE_URL +`${item.bannerImage}` }
                            : require("../../../assets/user.png")
                    }
                    style={styles.thumbnail}
                />
                <Ionicons
                    name="play-circle"
                    size={50}
                    color="white"
                    style={styles.playIcon}
                />
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        </TouchableOpacity>
    );
    const handleLoadMore = () => {
        if (!isloading && currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    return (
        <View>
            <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                numColumns={2} // Static two columns
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
                }
            />
          
        </View>
    )
}

export default SearchVideo

const styles = StyleSheet.create({
    friendContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 50,
        marginRight: 10,
    },
    name: { fontSize: 16 },
    subname: { fontSize: 13, color: "#888" },
    addButton: {
        backgroundColor: "#000",
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    addText: { color: "#fff", fontSize: 13 },
    cardContainer: {
        flex: 1,
        margin: 8,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    imageWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: 120,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    playIcon: {
        position: 'absolute',
        top: '40%',
        left: '40%',
        opacity: 0.8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginHorizontal: 8,
        marginTop: 4,
    },
    description: {
        fontSize: 12,
        color: '#555',
        marginHorizontal: 8,
        marginBottom: 8,
    },
});
