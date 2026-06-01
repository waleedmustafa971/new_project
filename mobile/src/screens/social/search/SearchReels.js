import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, StyleSheet, ScrollView, Image,
    ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as base from '../../../component/global'
import SearchPeopole from './SearchPeopole';
import api from '../../../component/api';
import SearchReelsView from './SearchReelsView';
import { useFocusEffect } from '@react-navigation/native'

const SearchReels = () => {
    const navigation = useNavigation();
    const [selectedTab, setSelectedTab] = useState('Search friends');
    const [search, setSearch] = useState("");
    const inputRef = useRef(null)    
    const typingTimeout = useRef(null);
    const tabs = ['Search friends', 'Search Reel', 'Search Video', 'Search Content'];
    const [currentPage, setCurrentPage] = useState(1);
    const [products, setProducts] = useState([]);
    const [isloading, setIsloading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [userid, setUserid] = useState('');

    // Store search term in AsyncStorage
    const saveSearch = async (text) => {
        try {
            await AsyncStorage.setItem('searchText', text);
        } catch (e) {
            console.error('Failed to save search', e);
        }
    };



    const handleTyping = (text) => {
        setSearch(text);
        saveSearch(text);

        setSearch(text);
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = setTimeout(() => {
            if (text.length >= 3 || text.length === 0) {
                setCurrentPage(1);
                //  fetchProducts(1, text);
            }
        }, 500);
    };

    const clearSearch = () => {
        setSearch('');
        saveSearch('');
    };
    useFocusEffect(
      React.useCallback(() => {
        const timeout = setTimeout(() => {
          inputRef.current?.focus()
        }, 350) // IMPORTANT delay
    
        return () => clearTimeout(timeout)
      }, [])
    )
    
    useEffect(() => {
        fetchProducts(currentPage, search);
    }, [currentPage, search]);

    const fetchProducts = async (page, searchTerm = "") => {
        try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (!jsonValue) return;

            const userData = JSON.parse(jsonValue);
            setUserid(userData._id);
            setIsloading(true);

            const response = await api.get(
                `/apis/reel/search-reels`,
                {
                    params: {
                        page,
                        limit: 10,
                        search: searchTerm,
                    },
                }
            );

            const { reels, totalPages } = response.data;
            console.log('filters....', response.data)
            setProducts((prev) =>
                page === 1 ? reels : [...prev, ...reels]
            );
            setTotalPages(totalPages);
        } catch (error) {
            console.error("Error fetching users:", error?.response?.data || error.message);
        } finally {
            setIsloading(false);
        }
    };


    return (
          <KeyboardAvoidingView
              style={styles.container}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
        <View style={styles.container}>
            {/* Header with Search Input */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <View style={styles.searchContainer}>
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search by friends name / Reel / Video / Content "
                        value={search}
                        onChangeText={handleTyping}
                        placeholderTextColor="#9CA3AF"   // 👈 Add this
                    />
                    {search.length > 0 && (
                        <TouchableOpacity style={styles.clearIcon}
                            onPress={() => {
                                setSearch('');
                                setCurrentPage(1);
                                fetchProducts(1, '');
                            }}>
                            <Ionicons name="close-circle" size={20} color="gray" />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={() => navigation.goBack()}>                  
                    <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
            </View>
            <SearchReelsView search={search} products={products} userid={userid}/>


            {/* Example Content */}
          {/*   <View style={styles.content}>
                <Text style={{ fontSize: 12 }}>Selected Tab: {selectedTab}</Text>
                <Text style={{ fontSize: 12, marginTop: 10 }}>Search Term: {search}</Text>
            </View> */}
        </View>
        </KeyboardAvoidingView>
    );
};

export default SearchReels;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: '#000'
    },
    clearIcon: {
        marginLeft: 5,
    },
    tabsContainer: {
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginRight: 10, height: 40
    },
    activeTab: {
        backgroundColor: '#000', height: 40
    },
    tabText: {
        color: '#000',
        fontSize: 14,
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        padding: 20,
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
});
