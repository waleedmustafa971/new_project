import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView, Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";
import Header from './Layout/Header';
import MotorsCategories from './MotorsCategories';
import RecommandMotors from './RecommandMotors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base from '../../component/global'
import DraftMotorslist from './ads/DraftMotorslist';
import MotorsDashboardcars from './MotorsDashboardcars';
import api from '../../component/api';
import SearchModal from './search/SearchModal';
import MotorsGroupView from './MotorsGroupView';
const PAGE_LIMIT = 10;

type Property = {
  _id: string;
  shortTitle?: string;
  city?: string;
  country?: string;
  currency?: string;
  price?: string | number;
  images?: { image: string }[];
};

type Category = {
  _id: string;
  name?: string;  
  properties: Property[];
  subcategories: [];
};

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  TestSound: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const Motors: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [data, setData] = useState([]);
  const [categorydata, setCategorydata] = useState([]);
  const [userid, setUserid] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [text, setText] = useState('');

   const [categories, setCategories] = useState<Category[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
  

  const handleSelect = (category: Category) => {
    setSelectedCategory(category);
    // You can navigate or trigger another action here
    console.log('Selected:', category.name);
    navigation.navigate("TestSound")
  };

  useEffect(() => {
    fetchDatadraft()
    fetchCategory()
  }, [])
  
  const fetchCategory = async () => {
    setLoading(true);
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      console.log("user id....." + userData._id);
      setUserid(userData._id);
      try {
        const res = await api.get("/apis/categories/list?type=Motors");
        setCategories(res.data);
        setLoading(false);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
  }

  const fetchDatadraft = async () => {
    if (loading || page > totalPages) return;

    try {
      setLoading(true);

      const jsonValue = await AsyncStorage.getItem('userdata');
      if (!jsonValue) {
        console.log('No user data found');
        return;
      }

      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      const status = 'draft';
      const res = await api.get(
        `/apis/motors/draft/${userData._id}/${status}`,
        {
          params: {
            page,
            limit: PAGE_LIMIT,
            status: status
          },
        }
      );

      const { users, totalPages: total } = res.data;
      setData(prev => [...prev, ...users]);
      setTotalPages(total);
    //  console.log('Motors draft data:', users);
    } catch (error: any) {
      console.error('Error fetching draft data:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <Header navigation={navigation} onSearchPress={() => setSearchVisible(true)} />
      <View style={{ height: 50 }}>
        <MotorsCategories navigation={navigation} categories={categories}/>
      </View>
      <ScrollView style={{ marginBottom: 20 }}>
        {
          data.length > 0 ?
            <View style={{
              padding: 10, marginBottom: 0,
              backgroundColor: '#f2f2f2'
            }}>
              <DraftMotorslist data={data} navigation={navigation} />
            </View>
            : null
        }
        <MotorsGroupView />
      </ScrollView>
      {
        searchVisible ?
          <>

          </> : null
      }
      <Modal
        visible={searchVisible}
        animationType="slide"
        onRequestClose={() => setSearchVisible(false)}
      >
        <SearchModal
          query={text}
          onClose={() => {
            setSearchVisible(false);
            setText('');
          }}
        />
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
});

export default Motors;
