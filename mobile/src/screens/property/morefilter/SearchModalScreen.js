import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import SQLite from 'react-native-sqlite-storage';
import api from '../../../component/api';

const db = SQLite.openDatabase({ name: 'searches.db' });
const PAGE_LIMIT = 10;
const { width } = Dimensions.get('window');

const SearchModalScreen = ({ onClose }) => {
  const navigation = useNavigation();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [founddatalist, setFounddatalist] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  /* ===================== INIT ===================== */
  useEffect(() => {
    inputRef.current?.focus();

    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS recent (id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT);'
      );
    });

    fetchRecent();
  }, []);

  /* ===================== DEBOUNCED SEARCH ===================== */
  useEffect(() => {
    if (query.length < 2) {
      setFounddatalist([]);
      return;
    }

    const timeout = setTimeout(() => {
      insertRecent(query)
      setPage(1);
      fetchfrmDB(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const insertRecent = (term) => {
  if (!term || term.trim().length < 2) return;

  db.transaction(tx => {
    // Avoid duplicates
    tx.executeSql(
      'DELETE FROM recent WHERE term = ?',
      [term]
    );

    tx.executeSql(
      'INSERT INTO recent (term) VALUES (?)',
      [term],
      () => fetchRecent()
    );
  });
};


  /* ===================== FETCH RECENT ===================== */
  const fetchRecent = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM recent ORDER BY id DESC',
        [],
        (_, { rows }) => {
          const data = [];
          for (let i = 0; i < rows.length; i++) {
            data.push(rows.item(i));
          }
          setRecent(data);
        }
      );
    });
  };

  /* ===================== FETCH FROM API ===================== */
  const fetchfrmDB = async (reset = false) => {
    try {
      if (loading) return;
      setLoading(true);

      const res = await api.get('/apis/property/property-global-search-by-group', {
        params: {
          page: reset ? 1 : page,
          limit: PAGE_LIMIT,
          add_post: 'Property',
          search: query,
        },
      });

      const users = res.data?.data || [];

      setFounddatalist(prev =>
        reset ? users : [...prev, ...users]
      );

      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== LOAD MORE ===================== */
  const loadMore = () => {
    if (!loading && page < totalPages) {
      setPage(prev => prev + 1);
      fetchfrmDB();
    }
  };

  /* ===================== RECENT ===================== */
  const clearRecent = () => {
    db.transaction(tx => tx.executeSql('DELETE FROM recent'));
    setRecent([]);
  };

  const clearQuery = () => {
    setQuery('');
    setFounddatalist([]);
  };

  /* ===================== RENDER ITEM ===================== */
  const renderItemfrmDB = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
      const filters = {
        type: item.propertyType,
        city: item.city,
        categoryId: item.mainCategory?._id,
        subCategoryId: item.subCategory?._id,
        searchText: query, // optional
      };

      console.log('Posting filters:', filters);

      navigation.navigate('PropertyforRent', {
        filters,
      });
    }}
     
    >
      <Text style={styles.title}>{query}</Text>
      <Text style={styles.subtitle}>{item.mainCategory?.name} - {item?.subCategory?.name} - {item?.propertyType} - {item?.city} - Ads ({item?.count})</Text>
    </TouchableOpacity>
  );

  /* ===================== UI ===================== */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1, padding: 10 }}>
        {/* HEADER */}
        <View style={styles.row}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <TextInput
              ref={inputRef}
              placeholder="search by Villa/Apartment/Residential/Commercial?"
              placeholderTextColor="#000"
              value={query}
              onChangeText={setQuery}
              style={{ flex: 1 }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearQuery}>
                <Icon name="close" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

       
        {/* RESULTS */}
        {
          founddatalist.length > 0 ?
          <>
           <FlatList
          data={founddatalist}
          keyExtractor={item => item._id}
          renderItem={renderItemfrmDB}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
        />
          </> : null
        }
       

         {/* RECENT */}
        {recent.length > 0 && (
          <View style={styles.recentRow}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text style={styles.clearBtn}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {recent.map(r => (
          <TouchableOpacity
            key={r.id}
            style={styles.recentItem}
            onPress={() => setQuery(r.term)}
          >
            <Icon name="history" size={16} />
            <Text style={{ marginLeft: 8 }}>{r.term}</Text>
          </TouchableOpacity>
        ))}


        {/* CONTINUE BUTTON */}
        {/* {isFocused && (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
               insertRecent(query);
               fetchfrmDB(true)
              Keyboard.dismiss();
              setIsFocused(false);
            }}
          >
            <Text style={styles.continueText}>Continue with search</Text>
          </TouchableOpacity>
        )} */}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default SearchModalScreen;

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  recentRow: {
    marginTop: 20,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  clearBtn: {
    color: 'red',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  card: {
    width: width - 24,
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 6,
    marginBottom: 5, borderBottomWidth: 2, borderBottomColor: '#f2f2f2'
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12
  },
  
  continueBtn: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  continueText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
