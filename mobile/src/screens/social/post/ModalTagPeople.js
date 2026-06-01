import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Pressable,
    FlatList, StyleSheet, ActivityIndicator,
    Image
} from "react-native";

import Feather from 'react-native-vector-icons/Feather'
import AntDesign from 'react-native-vector-icons/AntDesign'
import { useDispatch, useSelector } from "react-redux";
//import { fetchFollowing } from '../../store/slice/followingSlice' //'../redux/slices/reelSlice';
//import { fetchFollowing } from "../../store/slice/followingSlice"; //'../redux/slices/reelSlice';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from '../../../component/global'

const ModalTagPeople = ({ visible, onClose, navigation, onSelectUsers }) => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState("");
    const [userid, setUserid] = useState(""); //setCurrentuserid
    const [currentuserid, setCurrentuserid] = useState(""); //
    const dispatch = useDispatch();
    const [pagename, setPagename] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [products, setProducts] = useState([]);
    const [isloading, setIsloading] = useState([]);
    const [followedUsersing, setFollowedUsersing] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    useEffect(() => {
        fetchMyfollerwers(1);
        return () => {
            fetchMyfollerwers();
        };
    }, []);

    const handleSelectUser = (user) => {
        const updatedUsers = [...selectedUsers, user];
        setSelectedUsers(updatedUsers);
        if (onSelectUsers) {
            onSelectUsers(updatedUsers);
        }
        console.log('.....handleSelectUser......' + JSON.stringify(user))
    };

    const handleRemoveUser = (userId) => {
        const updatedUsers = selectedUsers.filter((u) => u._id !== userId);
        setSelectedUsers(updatedUsers);
        if (onSelectUsers) {
            onSelectUsers(updatedUsers);
        }
    };

    useEffect(() => {
        if (page > 1) {
            fetchMyfollerwers(page);
        }
    }, [page]);

    const handleLoad = () => {
        console.log("current page.....with scroll followers", page);
        if (!isloading && page < totalPages) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    const fetchMyfollerwers = async (currentPage) => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);

            setUserid(userData._id);
            setCurrentuserid(userData._id);
            setIsloading(true);

            try {
                console.log("ddd" + JSON.stringify(userData));
                const response = await axios.get(
                    base.BASE_URL + `/apis/reel/myFollowering`,
                    {
                        params: {
                            userId: userData._id,
                            page: currentPage,
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
        setFollowedUsersing((prev) => [...prev, followId]);
    };

    const renderItemusers = ({ item }) => {
        const isSelected = selectedUsers.some((u) => u._id === item._id);

        return (
            <View style={styles.friendContainer} key={item._id}>
                <TouchableOpacity>
                    <Image
                        source={
                            item.image ? { uri: item.image } : require("../../../assets/user.png")
                        }
                        style={styles.avatar}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subname}>People you may know</Text>
                </TouchableOpacity>

                <View style={{ display: 'flex', flexDirection: 'row' }}>
                    {isSelected ? (
                        <>
                            <TouchableOpacity
                                style={{ backgroundColor: 'green',
                                    borderRadius: 50, padding: 5,
                                    marginRight: 5
                                 }}
                                onPress={() => { }}
                            >
                                <Feather name="check" size={15} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                 style={{ backgroundColor: 'red',
                                    borderRadius: 50, padding: 5,
                                    marginRight: 5
                                 }}
                                onPress={() => handleRemoveUser(item._id)}
                            >
                                <Feather name="x" size={15} color="white" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={{ backgroundColor: 'blue', borderRadius: 50, padding: 5 }}
                            onPress={() => handleSelectUser(item)}
                        >
                            <Feather name="plus" size={15} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };


    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <AntDesign name="close" size={24} color="black" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>
                                Tag Friends
                                {selectedUsers.length > 0
                                    ? ` (${selectedUsers.length})`
                                    : ''}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={onClose} style={styles.nextButton}>
                            <Feather name="arrow-right" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.listWrapper}>
                        <FlatList
                            data={products}
                            keyExtractor={(item) => item._id}
                            renderItem={renderItemusers}
                            onEndReached={handleLoad}
                            onEndReachedThreshold={0.5}
                            numColumns={1}
                            ListFooterComponent={
                                isloading ? (
                                    <ActivityIndicator size="large" color="#0000ff" />
                                ) : null
                            }
                        />
                    </View>
                </View>
            </Pressable>
        </Modal>
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
        marginTop: 25,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    leftIcon: { flex: 1 },
    title: { flex: 3, textAlign: "center", fontSize: 18, fontWeight: "bold" },
    rightIcon: { flex: 1, alignItems: "flex-end" },
    container: { flex: 1, padding: 10, backgroundColor: "#fff" },
    friendContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    avatar: { width: 30, height: 30, borderRadius: 50, marginRight: 10 },
    name: { fontSize: 14 },
    subname: { fontSize: 10 },
    addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
    addText: { color: "#fff", fontSize: 13 },
    followingButton: {
        backgroundColor: "#aaa", // or green, your choice
    },

    followingText: {
        color: "#fff", // or slightly dimmed if you want
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        padding: 5,
        marginRight: 10,
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151', // Tailwind's gray-800
    },
    nextButton: {
        backgroundColor: '#3B82F6', // Tailwind's blue-500
        borderRadius: 999,
        padding: 8,
        marginLeft: 12,
        elevation: 5, // shadow for Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // iOS shadow
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    listWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        flex: 1,
    },
};

export default ModalTagPeople;
