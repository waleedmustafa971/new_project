import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    StatusBar, TextInput,
    Alert,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as base from "../../../component/global";
import { Provider, useDispatch, useSelector } from "react-redux";
import { followUserAsync } from "../../../store/slice/userSlice";
import { getUserData } from "../../../store/slice/authSlice";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const CurrentUserFollowers = () => {

    const dispatch = useDispatch()
    const navigation = useNavigation()
    const [userid, setUserid] = useState(""); //setCurrentuserid
    const [currentuserid, setCurrentuserid] = useState(""); //
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [products, setProducts] = useState([]);
    const [isloading, setIsloading] = useState([]);
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
        console.log("current page.....with scroll followers", page);
        if (!isloading && page < totalPages) {
            setPage((prevPage) => prevPage + 1);
        }
    };


    const fetchMyFollowers = async (currentPage, searchQuery) => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            setCurrentuserid(userData._id);
            setIsloading(true);
            try {
                console.log('ddd' + JSON.stringify(userData))
                const response = await axios.get(
                    base.BASE_URL + `/apis/reel/myFollowers`,
                    {
                        params: {
                            userId: userData._id,
                            page: currentPage,
                            search: searchQuery, // search parameter sent to API
                            limit: 10,
                        },
                    }
                );

                const { followers, totalPages, totalFollowers } = response.data;
                //   console.log('...f.....' + response.data)
                setProducts((prevProducts) =>
                    currentPage === 1 ? followers : [...prevProducts, ...followers]
                );
                setTotalPages(totalPages);
            } catch (error) {
                console.error(
                    "Error fetching followers:",
                    error.response?.data || error.message
                );
            } finally {
                setIsloading(false);
            }
        }
    };


    const handleFollow = (followId) => {
        const userId = userid; //67dc057dd0c338e049d45603
        console.log("current user id...follower.." + userid);
        dispatch(followUserAsync({ userId, followId }));
        //  setTextfollow('following')

        // Add followId to followed list
        setFollowedUsersing((prev) => [...prev, followId]);
    };

    /*
      Open the person.

      Every row here offered Follow and nothing else -- no way to look at
      somebody before deciding to follow them, which is the one thing you want
      from a list of strangers. Tapping the name or avatar opens their wall, the
      same as tapping a name anywhere else in the app.
      */
    const openProfile = (item) => {
      if (!item?._id) return;
      navigation.navigate("MyWall", { userid: item._id });
    };

    const renderItemusers = ({ item }) => (
        <View style={styles.friendContainer}>
            {item.image == null ? (
                <Image
                    source={
                        item.image
                            ? { uri: item.image }
                            : require("../../../assets/user.png")
                    }
                    style={{
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 2,
                        marginTop: 3,
                        width: 40,
                        height: 40,
                        borderRadius: 50,
                        marginRight: 10,
                    }}
                />
            ) : (
                <Image
                    source={
                        item.image
                            ? { uri: item.image }
                            : require("../../../assets/user.png")
                    }
                    style={styles.avatar}
                />
            )}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => openProfile(item)}
                activeOpacity={0.7}
            >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subname}>Follows you</Text>
            </TouchableOpacity>
            <TouchableOpacity
                //style={styles.addButton}
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
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#ffffff"
                translucent={false}
            />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.leftIcon}
                >
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.title}>My Followers</Text>
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
                renderItem={renderItemusers}
                onEndReached={handleLoad}
                onEndReachedThreshold={0.5} // Trigger load more when 50% of the list is visible
                numColumns={1}
                ListFooterComponent={
                    isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
                }
            />
        </SafeAreaView>

    )
}
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
    avatar: { width: 40, height: 40, borderRadius: 50, marginRight: 10 },
    name: { fontSize: 13 },
    subname: { fontSize: 11 },
    addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
    addText: { color: "#fff", fontSize: 13 },
    followingButton: {
        backgroundColor: "#aaa", // or green, your choice
    },

    followingText: {
        color: "#fff", // or slightly dimmed if you want
    },
};

export default CurrentUserFollowers