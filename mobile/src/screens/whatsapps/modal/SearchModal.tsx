import React, { useState, useEffect, useRef } from "react";
import {
    Modal,
    TextInput,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from "../../../component/global";

const SearchModal = ({ visible = false, onClose, onHandleChat }) => {
    const typingTimeout = useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState([]);
    const [isloading, setIsloading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [userid, setUserid] = useState("");

    useEffect(() => {
        fetchProducts(currentPage, search);
    }, [currentPage]);

    const fetchProducts = async (page, searchTerm = "") => {
        try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (!jsonValue) return;

            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            setIsloading(true);

            const response = await axios.get(
                base.BASE_URL + `/apis/auth/notInfriends`,
                {
                    params: {
                        userId: userData._id,
                        page,
                        limit: 10,
                        search: searchTerm,
                    },
                }
            );

            const { users, totalPages } = response.data;

            setProducts((prev) =>
                page === 1 ? users : [...prev, ...users]
            );
            setTotalPages(totalPages);
        } catch (error) {
            console.error("Error fetching users:", error?.response?.data || error.message);
        } finally {
            setIsloading(false);
        }
    };

    const handleTyping = (text) => {
        setSearch(text);
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = setTimeout(() => {
            if (text.length >= 3 || text.length === 0) {
                setCurrentPage(1);
                fetchProducts(1, text);
            }
        }, 500);
    };

    const handleLoadMore = () => {
        if (!isloading && currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.friendContainer}>
            <Image
                source={
                    item.image
                        ? { uri: item.image }
                        : require("../../../assets/user.png")
                }
                style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subname}>People you may know</Text>
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                    onHandleChat(item);
                    onClose();
                }}
            >
                <Text style={styles.addText}>Chat</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={!!visible} animationType="slide" transparent>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={styles.modalContainer}>
                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="gray" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name..."
                                placeholderTextColor="#999"
                                value={search}
                                onChangeText={handleTyping}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setSearch('');
                                        setCurrentPage(1);
                                        fetchProducts(1, '');
                                    }}
                                >
                                    <Ionicons name="close-circle" size={18} color="gray" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* User List */}
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
            </View>
        </Modal>
    );
};

const styles = {
    modalContainer: {
        height: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginLeft: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        color: 'black',
    },
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
};

export default SearchModal;
