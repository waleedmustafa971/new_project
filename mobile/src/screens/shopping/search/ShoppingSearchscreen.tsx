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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import SQLite, { Transaction, ResultSet, SQLiteDatabase } from 'react-native-sqlite-storage';
import * as base from '../../../component/global';

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

interface CategoryItem {
    _id: string;
    name: string;
    image: string;
}

interface SubcategoryItem {
    _id: string;
    name: string;
    image: string;
}

interface RecentSearch {
  id: number;
  term: string;
}

const ShoppingSearchscreen: React.FC<SearchModalClassifiedProps> = ({
  query: initialQuery = '',
  onClose,
}) => {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState<string>(initialQuery);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [founddatalist, setFounddatalist] = useState<PropertyItem[]>([]);
  const [categorydatalist, setCategorydatalist] = useState<CategoryItem[]>([]);
  const [subcategorydatalist, setSubcategorydatalist] = useState<SubcategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length > 0) {
        fetchfrmDB(query);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    db.transaction((tx: Transaction) => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS recentecommerce (id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT);');
    });

    fetchRecent();
  }, []);

  const fetchRecent = () => {
    db.transaction((tx: Transaction) => {
      tx.executeSql(
        'SELECT * FROM recentecommerce ORDER BY id DESC',
        [],
        (_: Transaction, result: ResultSet) => {
          const data: RecentSearch[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            data.push(result.rows.item(i) as RecentSearch);
          }
          setRecent(data);
        }
      );
    });
  };

  const handleContinueSearch = async () => {
    /* navigation.navigate('SearchScreenPage', {
      search: query,
      Category: selectedCategory,
    }); */
  };

  const handleSearch = () => {
    if (!query.trim()) return;

    db.transaction((tx: Transaction) => {
      tx.executeSql('INSERT INTO recentecommerce (term) VALUES (?)', [query]);
    });

    fetchRecent();
    fetchfrmDB();
  };

  const fetchfrmDB = async () => {
     setCategorydatalist([])
     setSubcategorydatalist([])
     setFounddatalist([])
    try {
      const endpoint =
        selectedCategory === 'All'
          ? `${base.BASE_URL}/api/product/globalsearch?page=${page}&limit=${PAGE_LIMIT}&search=${query.trim()}`
          : `${base.BASE_URL}/api/product/globalsearch?page=${page}&limit=${PAGE_LIMIT}&search=${query.trim()}`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setFounddatalist((prev) => [...prev, ...json.productData]); //categoryData
      setCategorydatalist((prev) => [...prev, ...json.categoryData]); //categoryData
      setSubcategorydatalist((prev) => [...prev, ...json.subcategoryData]); //categoryData
    } catch (error) {
      console.error('Error fetching:', error);
    }
  };

  const clearRecent = () => {
    db.transaction((tx: Transaction) => {
      tx.executeSql('DELETE FROM recentecommerce');
    });
    setRecent([]);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setCategorydatalist([])
    setSubcategorydatalist([])
    setFounddatalist([])
  };

  const onSelectItem = (item: PropertyItem) => {
    /* navigation.navigate('ResultScreen', {
      query,
      category: selectedCategory,
      item,
    }); */
  };

  const renderItemfrmDB = ({ item }: { item: PropertyItem }) => (
    <TouchableOpacity
      style={styles.card}
      key={item._id}
      onPress={() => navigation.navigate('ClassifiedDetails', { itemdetails: item })}
    >
      <View style={styles.detailsBox}>
        <Text style={styles.title}>{item.productname}</Text>
      </View>
       <View>
       <Icon name="chevron-right" size={28} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderItemcategory = ({ item }: { item: CategoryItem }) => (
    <TouchableOpacity
      style={styles.card}
      key={item._id}
      onPress={() => {
      navigation.navigate("SingleCategoryProduct", {
        categoryid: item._id,
        categoryname : item.name
      })
    }}
    >
      <View style={styles.detailsBox}>
        <Text style={styles.title}>{item.name}</Text>
      </View>
       <View>
         <Icon name="chevron-right" size={28} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderItemsubcategory = ({ item }: { item: SubcategoryItem }) => (
    <TouchableOpacity
      style={styles.card}
      key={item._id}
      onPress={() => {
      navigation.navigate("SingleCategoryProduct", {
        categoryid: item._id,
        categoryname : item.name
      })
    }}
    >
      <View style={styles.detailsBox}>
        <Text style={styles.title}>{item.name}</Text>
      </View>
      <View>
         <Icon name="chevron-right" size={28} color="#999" />
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'white' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white', padding: 10 }}>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => {
            navigation.goBack();
          }}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <TextInput
              ref={inputRef}
              placeholder="What are you looking for?"
                placeholderTextColor="#888"   // ← HERE
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              style={{ flex: 1, color: '#000' }}
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

        {recent.length > 0 && (
          <View style={styles.recentRow}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text style={styles.clearBtn}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {recent.map((r) => (
          <TouchableOpacity key={r.id} style={styles.recentItem} onPress={() => setQuery(r.term)}>
            <Icon name="history" size={16} />
            <Text style={{ marginLeft: 8 }}>{r.term}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ borderWidth: 0, backgroundColor: 'white', marginTop: 10 }}>
          <FlatList
            data={categorydatalist}
            keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()}
            renderItem={renderItemcategory}
          />
          <FlatList
            data={subcategorydatalist}
            keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()}
            renderItem={renderItemsubcategory}
          />
          <FlatList
            data={founddatalist}
            keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()}
            renderItem={renderItemfrmDB}
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
    borderRadius: 12,
    height: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    overflow: 'hidden',
    borderBottomColor: '#f2f2f2',
    borderBottomWidth: 2, flexDirection: 'row', justifyContent: 'space-between'
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center' },
  recentRow: { marginTop: 20, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontWeight: 'bold', fontSize: 14 },
  title: { fontSize: 14 },
  clearBtn: { fontSize: 13, color: 'red' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  category: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    height: 35,
    borderWidth: 1,
    borderColor: '#f2f2f2',
  },
  categorySelected: { backgroundColor: '#000' },
  detailsBox: {
      padding: 8
  }
});

export default ShoppingSearchscreen;
