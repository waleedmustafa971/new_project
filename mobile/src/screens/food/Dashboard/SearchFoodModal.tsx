import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    FlatList,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import SQLite, { Transaction, ResultSet, SQLiteDatabase } from 'react-native-sqlite-storage';
import * as base from '../../../component/global';
import api from '../../../component/api';
import CategoryList from '../../../component/food/CategoryList';

const db: SQLiteDatabase = SQLite.openDatabase({ name: 'searches.db' });

type SubCategory = {
    subid: string;
    subtitle: string;
    parentid: string;
};

type Category = {
    id: string;
    name: string;
    sub?: SubCategory[];
};


const PAGE_LIMIT = 10;
const { width } = Dimensions.get('window');

interface SearchModalClassifiedProps {
    query?: string;
    onClose: () => void;
}

interface PropertyItem {
    _id: string;
    shortTitle: string;
    [key: string]: any;
}

interface RecentSearch {
    id: number;
    term: string;
}

const SearchFoodModal: React.FC<SearchModalClassifiedProps> = ({
    query: initialQuery = '',
    onClose,
}) => {
    const navigation = useNavigation<any>();
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState<string>(initialQuery);
    const [recent, setRecent] = useState<RecentSearch[]>([]);
    const [founddatalist, setFounddatalist] = useState<PropertyItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [results, setResults] = useState<any[]>([]); //
    const [categories, setCategories] = useState<any[]>([]); //categories
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (query.length > 4) {
                handleSearch();
                fetchfrmDB(query);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    useFocusEffect(
        React.useCallback(() => {
            const timeout = setTimeout(() => {
                inputRef.current?.focus()
            }, 350) // IMPORTANT delay

            return () => clearTimeout(timeout)
        }, [])
    )

    useEffect(() => {
        db.transaction((tx: Transaction) => {
            tx.executeSql('CREATE TABLE IF NOT EXISTS recentfood (id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT);');
        });
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        await Promise.all([
            fetchRecent(),
            fetchCategory()
        ]);
    };

    const fetchRecent = () => {
        db.transaction((tx: Transaction) => {
            tx.executeSql(
                'SELECT * FROM recentfood ORDER BY id DESC',
                [],
                (_: Transaction, result: ResultSet) => {
                    const data: RecentSearch[] = [];
                    for (let i = 0; i < result.rows.length; i++) {
                        data.push(result.rows.item(i) as RecentSearch);
                    }
                    console.log('...fetchRecent.... ', JSON.stringify(data))
                    setRecent(data);
                }
            );
        });
    };

    const fetchCategory = async () => {
        if (loaded) return;
        try {
            const endpoint = `/api/food/getcategorylist`;
            console.log('Fetching:', endpoint);
            const res = await api.get(endpoint);
            console.log('...fetchCategoryCategories..', res.data);
            setCategories(res.data); // ✅ FIXED
            setLoaded(true);
        } catch (error) {
            console.error('Error fetching:', error);
        }
    };


    const handleSearch = () => {
        if (!query.trim()) return;
        console.log('handle search from ')
        db.transaction((tx: Transaction) => {
            tx.executeSql(
                'INSERT INTO recentfood (term) VALUES (?)',
                [query],
                (txObj, resultSet) => {
                    console.log("Insert successful!");
                    console.log("Rows affected:", resultSet.rowsAffected);

                    if (resultSet.rowsAffected > 0) {
                      //  fetchRecent();
                      //  fetchfrmDB();
                        console.log("Data inserted correctly ✅");
                    }
                },
                (txObj : string, error: any) => {
                    console.log("Insert failed ❌", error);
                    return true; // roll back transaction
                }
            );
        });
    };
    const fetchfrmDB = async () => {
        try {
            const endpoint = `/api/food/get-global-search-items?page=${page}&limit=${PAGE_LIMIT}&search=${query}`;
            console.log('Fetching global search :', endpoint);
            const res = await api.get(endpoint);
            const newData = res.data?.data || [];
            // ✅ If first page → replace
            if (page === 1) {
                setFounddatalist(newData);
            } else {
                // ✅ If next page → append
                setFounddatalist((prev) => [...prev, ...newData]);
            }
        } catch (error) {
            console.error('Error fetching:', error);
        }
    };

    const clearRecent = () => {
        db.transaction((tx: Transaction) => {
            tx.executeSql('DELETE FROM recentfood');
        });
        setRecent([]);
    };

    const clearQuery = () => {
        setQuery('');
        setResults([]);
    };

    const renderItemfrmDB = ({ item, index }: { item: PropertyItem, index: number }) => (
        <TouchableOpacity
            style={styles.card}
            key={item._id}
            onPress={() => navigation.navigate('ClassifiedDetails', { itemdetails: item })}
        >
            <View style={styles.detailsBox}>
                <View style={{ flexDirection: 'column' }}>

                    <Text style={styles.title}>
                        {item?.item_name}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>

                        {/* Final Price */}
                        <Text style={styles.finalPrice}>
                            AED {item?.final_price}
                        </Text>

                        {/* Original Price (crossed) */}
                        {item?.discount > 0 && (
                            <Text style={styles.originalPrice}>
                                AED {item?.price}
                            </Text>
                        )}

                        {/* Discount Badge */}
                        {item?.discount > 0 && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>
                                    {item?.discount}% OFF
                                </Text>
                            </View>
                        )}

                    </View>
                </View>
                <Text style={styles.title}>{item?.restaurant?.restaurant_name}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'white' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 10 }}>
                <View style={styles.row}>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="arrow-left" size={24} />
                    </TouchableOpacity>

                    <View style={styles.searchBox}>
                        <TextInput
                            ref={inputRef}
                            placeholder=""
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSearch} placeholderTextColor="#000"
                            style={{ flex: 1 }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={clearQuery}>
                                <Icon name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={{ marginTop: 7, height: 100 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ alignItems: 'center' }}
                        style={{ borderWidth: 0, borderColor: 'silver' }}
                    >
                        {categories?.map((cat) => (
                            <TouchableOpacity
                                key={cat._id}
                                onPress={() => setSelectedCategory(cat.category_name)}
                                style={[
                                    styles.category,
                                    selectedCategory === cat.category_name && styles.categorySelected,
                                ]}
                            >
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: base.BASE_URL + cat.category_image }}
                                        style={styles.image}
                                    />
                                </View>
                                <Text style={{
                                    color:
                                        selectedCategory === cat.category_name ? '#fff' : '#333',
                                }} numberOfLines={1}>
                                    {cat.category_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                {recent.length > 0 && (
                    <View style={styles.recentRow}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        <TouchableOpacity onPress={clearRecent}>
                            <Text style={styles.clearBtn}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {recent.map((r) => (
                    <TouchableOpacity key={r.id} style={styles.recentItem} 
                    onPress={() => setQuery(r.term)}>
                        <Icon name="history" size={16} />
                        <Text style={{ marginLeft: 8 }}>{r.term}</Text>
                    </TouchableOpacity>
                ))}
                <View style={{ borderWidth: 0, backgroundColor: 'white', marginTop: 10 }}>
                    <FlatList
                        data={founddatalist}
                        renderItem={renderItemfrmDB}
                        keyExtractor={(item, index) => `${item._id}_${index}`}
                    />
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};


const styles = StyleSheet.create({
    card: {
        width: width - 24,
        backgroundColor: '#fff',
        borderRadius: 12, borderBottomWidth: 1,
        marginBottom: 7,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6, padding: 5,
        overflow: 'hidden', borderBottomColor: '#f2f2f2',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center' },
    recentRow: { marginTop: 20, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 12 },
    clearBtn: { fontSize: 12, color: 'red' },
    recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    category: {
        backgroundColor: '#f2f2f2',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
        // height: 35,
        borderWidth: 1,
        borderColor: '#f2f2f2',
        alignContent: 'center', alignItems: 'center'
    },
    categorySelected: { backgroundColor: '#000' },
    detailsBox: {

    },
    imageContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#F2F2F2', // The light gray background from your image
        borderRadius: 18, // Large rounded corners
        overflow: 'hidden', // Ensures image doesn't bleed past corners
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain', // Or 'contain' depending on your original asset padding
    },
    name: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        color: '#444',
        fontWeight: '500', // Medium weight for readability
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: '#222',
    },

    finalPrice: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        marginRight: 8,
    },

    originalPrice: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'line-through',
        marginRight: 8,
    },

    discountBadge: {
        backgroundColor: '#ff3b30',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },

    discountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default SearchFoodModal;
