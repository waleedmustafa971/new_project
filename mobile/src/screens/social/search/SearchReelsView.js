import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, Image
} from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as base from '../../../component/global'

const SearchReelsView = ({ search, products, userid }) => {
    const navigation = useNavigation()
    const [currentPage, setCurrentPage] = useState(1);
    const [isloading, setIsloading] = useState(false);
    const typingTimeout = useRef(null);
    const [totalPages, setTotalPages] = useState(1);

    const handleProfile = (item) => {
        navigation.navigate("SingleReel", { reel: [item],  userid: userid })
    }

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.friendContainer} onPress={() => {
            handleProfile(item)
        }}>
        {/*     <Image
                source={
                    item.image
                        ? { uri: item.image }
                        : require("../../../assets/user.png")
                }
                style={styles.avatar}
            /> */}
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.videoTitle}</Text>
            </View>
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
                }
            />
        </View>
    )
}

export default SearchReelsView

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
});
