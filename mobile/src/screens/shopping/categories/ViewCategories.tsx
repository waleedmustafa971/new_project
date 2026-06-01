import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView, ListRenderItem
} from 'react-native';
import * as base from '../../../component/global'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';

// 1. Define the Interfaces based on your API response
interface SubCategory {
    _id: string;
    name: string;
    image: string | null;
    parentId: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

interface Category {
    _id: string;
    name: string;
    image: string | null;
    type: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
    __v: number;
    subcategories: SubCategory[];
}

const { width } = Dimensions.get('window');
const LEFT_COLUMN_WIDTH = width * 0.25; // 25% for sidebar

const ViewCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigation = useNavigation();

    // Fetch Data from your API
    useEffect(() => {
        fetch(base.BASE_URL + '/api/product/dashboardHome')
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setCategories(json.categories);
                    setSelectedCategory(json.categories[0]); // Default to first category
                }
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    // Left Sidebar Item
    const renderSidebarItem: ListRenderItem<Category> = ({ item }) => {
        const isActive = selectedCategory?._id === item._id;
        return (
            <TouchableOpacity
                style={[styles.sidebarItem, isActive && styles.activeSidebarItem]}
                onPress={() => setSelectedCategory(item)}
            >
                {isActive && <View style={styles.activeIndicator} />}
                <Text style={[styles.sidebarText, isActive && styles.activeSidebarText]}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    // Right Grid Item (Subcategories)
    const renderSubCategoryItem: ListRenderItem<SubCategory> = ({ item }) => (
        <TouchableOpacity style={styles.subCatItem}>
            <View style={styles.imageContainer}>
                <Image
                    source={{
                        uri: item.image
                            ? base.BASE_URL + `${item.image}`
                            : 'https://via.placeholder.com/100'
                    }}
                    style={styles.subCatImage}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.subCatText} numberOfLines={2}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{
                    flexDirection: 'row'
                }}>
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={18}
                        color="#000"
                    />
                     <Text style={styles.headerTitle}>Shop by category</Text>
                </TouchableOpacity>
               
            </View>

            <View style={styles.content}>
                {/* Left Sidebar */}
                <View style={styles.leftColumn}>
                    <FlatList
                        data={categories}
                        keyExtractor={(item) => item._id}
                        renderItem={renderSidebarItem}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

                {/* Right Subcategory Grid */}
                <View style={styles.rightColumn}>
                    <FlatList
                        data={selectedCategory?.subcategories || []}
                        keyExtractor={(item) => item._id}
                        renderItem={renderSubCategoryItem}
                        numColumns={3} // As seen in Temu UI
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <Text style={styles.subCatHeader}>{selectedCategory?.name}</Text>
                        }
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
    content: { flex: 1, flexDirection: 'row' },

    // Sidebar Styles
    leftColumn: {
        width: LEFT_COLUMN_WIDTH,
        backgroundColor: '#f7f7f7',
    },
    sidebarItem: {
        paddingVertical: 20,
        paddingHorizontal: 10,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    activeSidebarItem: {
        backgroundColor: '#fff',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: '50%',
        height: 20,
        width: 4,
        backgroundColor: '#ff4d00', // Temu Orange
        marginTop: -10,
    },
    sidebarText: { fontSize: 12, color: '#333', textAlign: 'center' },
    activeSidebarText: { fontWeight: 'bold', color: '#000' },

    // Right Column Styles
    rightColumn: { flex: 1, padding: 10 },
    subCatHeader: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
    subCatItem: {
        width: '33.33%',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    imageContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f9f9f9',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    subCatImage: { width: 50, height: 50 },
    subCatText: {
        fontSize: 11,
        marginTop: 8,
        textAlign: 'center',
        color: '#444',
    },
});

export default ViewCategories;