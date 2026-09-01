import React, { useState, useEffect, useRef } from 'react';
import { FB } from '../../../theme/social';
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
            {/*
              One way out, not two.

              The header carried a back arrow on the left AND a close X on the
              right, both calling goBack() -- two controls for one action,
              squeezing the field between them. The X is gone, the field gets
              the width back, and the magnifier sits inside it the way every
              search bar has it.
            */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={FB.text} />
                </TouchableOpacity>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={17} color={FB.textSecondary} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search people, reels and posts"
                        value={search}
                        onChangeText={handleTyping}
                        placeholderTextColor={FB.textTertiary}
                        autoFocus
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearIcon}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => {
                                setSearch('');
                                setCurrentPage(1);
                                fetchProducts(1, '');
                            }}>
                            <Ionicons name="close-circle" size={18} color={FB.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
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
    container: { flex: 1, backgroundColor: FB.surface },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: FB.divider,
    },
    /* A pill, not a rounded rectangle. Facebook's search field is fully
       rounded and sits on the standard grey fill. */
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 14,
        backgroundColor: FB.fill,
        borderRadius: FB.radius.pill,
        paddingHorizontal: 14,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 15,
        color: FB.text,
        padding: 0,
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
