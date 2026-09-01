import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    StatusBar,
    TextInput,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from "react-redux";
import { followUserAsync } from "../../../store/slice/userSlice";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from "../../../component/global";

const CurrentUserFollowering = () => {

    const dispatch = useDispatch();
    const navigation = useNavigation();

    const [userid, setUserid] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [products, setProducts] = useState([]);
    const [isloading, setIsloading] = useState(false);
    const [followedUsersing, setFollowedUsersing] = useState([]);
    const [search, setSearch] = useState('');
    const [searchShow, setSearchShow] = useState(false)
    useEffect(() => {
        fetchMyFollowers(1, search);
    }, []);

    useEffect(() => {
        if (page > 1) {
            fetchMyFollowers(page, search);
        }
    }, [page]);

    useEffect(() => {
        // Fetch new search results when search input changes
        const delayDebounce = setTimeout(() => {
            setPage(1);
            fetchMyFollowers(1, search);
        }, 500); // Debounce to reduce API calls

        return () => clearTimeout(delayDebounce);
    }, [search]);

    const handleLoad = () => {
        if (!isloading && page < totalPages) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    const fetchMyFollowers = async (currentPage, searchQuery) => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            setIsloading(true);

            try {
                const response = await axios.get(
                    base.BASE_URL + `/apis/reel/myFollowering`,
                    {
                        params: {
                            userId: userData._id,
                            page: currentPage,
                            limit: 10,
                            search: searchQuery, // search parameter sent to API
                        },
                    }
                );

                const { followers, totalPages } = response.data;

                if (currentPage === 1) {
                    setProducts(followers);
                } else {
                    setProducts((prevProducts) => [...prevProducts, ...followers]);
                }

                setTotalPages(totalPages);
            } catch (error) {
                console.error("Error fetching followers:", error.response?.data || error.message);
            } finally {
                setIsloading(false);
            }
        }
    };

    const handleFollow = (followId) => {
        dispatch(followUserAsync({ userId: userid, followId }));
        setFollowedUsersing((prev) => [...prev, followId]);
    };

    /*
      Open the person. Every row here offered Follow and nothing else -- no way
      to look at somebody before deciding, which is the one thing you want from
      a list of people. Same behaviour as tapping a name anywhere else.
    */
    const openProfile = (item) => {
        if (!item?._id) return;
        navigation.navigate("MyWall", { userid: item._id });
    };

    const renderItemUsers = ({ item }) => (
        <View style={styles.friendContainer}>
            <Image
                source={item.image ? { uri: item.image } : require("../../../assets/user.png")}
                style={styles.avatar}
            />
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => openProfile(item)}
                activeOpacity={0.7}
            >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subname}>You follow them</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.addButton,
                    followedUsersing.includes(item._id) && styles.followingButton,
                ]}
                onPress={() => handleFollow(item._id)}
                disabled={followedUsersing.includes(item._id)}
            >
                <Text style={styles.addText}>
                    {followedUsersing.includes(item._id) ? "Following" : "Follow Back"}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.leftIcon}
                >
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.title}>My Followers</Text>
                <View style={styles.rightIcon} />
                <TouchableOpacity
                    onPress={() => setSearchShow(!searchShow)}
                    style={styles.rightIcon}
                >
                    <Ionicons name={searchShow ? "close" : "search"} size={24} color="black" />
                </TouchableOpacity>
            </View>
            {searchShow && (
                <View style={styles.searchBox}>
                    <TextInput
                        placeholder="Search by Name..."
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={22} color="#888" style={{ paddingHorizontal: 5 }} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                renderItem={renderItemUsers}
                onEndReached={handleLoad}
                onEndReachedThreshold={0.5}
                numColumns={1}
                ListFooterComponent={
                    isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
                }
            />
        </SafeAreaView>
    );
};

const styles = {
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 50,
        paddingHorizontal: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    leftIcon: { flex: 1 },
    title: { flex: 3, textAlign: "center", fontSize: 14, fontWeight: "bold" },
    rightIcon: { flex: 1, alignItems: "flex-end" },
    container: { flex: 1, backgroundColor: "#ffffff" },
    friendContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        margin: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#f9f9f9',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    avatar: { width: 80, height: 80, borderRadius: 50, marginRight: 10 },
    name: { fontSize: 16 },
    subname: { fontSize: 13 },
    addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
    addText: { color: "#fff", fontSize: 13 },
    followingButton: {
        backgroundColor: "#aaa",
    },
};

export default CurrentUserFollowering;
