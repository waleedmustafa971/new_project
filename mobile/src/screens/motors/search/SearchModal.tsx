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
import api from '../../../component/api';

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

const categories: Category[] = [
  { id: '1', name: 'All in Classifieds', sub: [] },
  {
    id: '2',
    name: 'Mobile Phones and Tablets',
    sub: [
      { subid: '1', subtitle: 'Mobile Phones', parentid: '1' },
      { subid: '2', subtitle: 'Mobile Phone and Tablet Accessories', parentid: '1' },
      { subid: '3', subtitle: 'Tablets', parentid: '1' },
      { subid: '4', subtitle: 'Other Mobile Phone and Tablets', parentid: '1' },
    ],
  },
  { id: '3', name: 'Electronics' },
  { id: '4', name: 'Computers and Networking' },
  { id: '5', name: 'Business and Industrial' },
  // ... other categories
];

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

const SearchModal: React.FC<SearchModalClassifiedProps> = ({
  query: initialQuery = '',
  onClose,
}) => {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState<string>(initialQuery);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [founddatalist, setFounddatalist] = useState<PropertyItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length > 2) {
        fetchfrmDB();
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    db.transaction((tx: Transaction) => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS recentmotors (id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT);');
    });

    fetchRecent();
  }, []);

  const fetchRecent = () => {
    db.transaction((tx: Transaction) => {
      tx.executeSql(
        'SELECT * FROM recentmotors ORDER BY id DESC',
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

  const handleContinueSearch = async () => {
    /* navigation.navigate('SearchScreenPage', {
      search: query,
      Category: selectedCategory,
    }); */
  };

  const handleSearch = () => {
    if (!query.trim()) return;

    db.transaction((tx: Transaction) => {
      tx.executeSql('INSERT INTO recentmotors (term) VALUES (?)', [query]);
    });

    fetchRecent();
    fetchfrmDB();
  };

const fetchfrmDB = async () => {
  try {
    setFounddatalist([]);

    const res = await api.get(
      `/apis/property/global-search-list/live`,
      {
        params: {
          page,
          limit: PAGE_LIMIT,
          add_post: 'Motors',
          search: query ?? '',
        },
      }
    );

    console.log('API response:', res.data);

    setFounddatalist(res.data?.users || []);
  } catch (error: any) {
    console.error('Error fetching:', error?.response || error);
  }
};

  const clearRecent = () => {
    db.transaction((tx: Transaction) => {
      tx.executeSql('DELETE FROM recentclassified');
    });
    setRecent([]);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
  };

  const onSelectItem = (item: PropertyItem) => {
    /* navigation.navigate('ResultScreen', {
      query,
      category: selectedCategory,
      item,
    }); */
  };

  const renderItemfrmDB = ({ item, index }: { item: PropertyItem, index : number }) => (
    <TouchableOpacity
      style={styles.card}
      key={item._id}
      onPress={() => navigation.navigate('ClassifiedDetails', { itemdetails: item })}
    >
      <View style={styles.detailsBox}>
        <Text style={styles.title}>{item.shortTitle}</Text>
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
              placeholder="What are you looking for?"
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

        {/* Categories */}
{/*         <View style={{ height: 40 }}>
          <ScrollView horizontal contentContainerStyle={{ height: 40, alignItems: 'center' }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.name)}
                style={[styles.category, selectedCategory === cat.name && styles.categorySelected]}
              >
                <Text style={{ color: selectedCategory === cat.name ? '#fff' : '#333' }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View> */}

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
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    overflow: 'hidden',
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

  }
});

export default SearchModal;
