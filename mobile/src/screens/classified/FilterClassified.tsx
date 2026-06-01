import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity, TextInput,
  StyleSheet, Modal, StatusBar
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import * as base from '../../component/global'
import ShowClassifiedCategory from './ShowClassifiedCategory';
import SearchModalClassified from './search/SearchModalClassified';
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import { Filter } from 'lucide-react';
import FilterModalDashboard from './Modal/FilterModalDashboard';
import PostAdsModal from './ads/PostAdsModal';
import { cities, classifiedCategory } from '../../constants/globalData';
import api from '../../component/api';

type Category = {
  _id: string;
  name: string;
  subcategories: { "name": string, "url": string },

};



const categoryIcons = {
  'All in Classifieds': <Feather name="list" size={20} color="#333" />,
  'Mobile Phones and Tablets': <MaterialCommunityIcons name="cellphone" size={20} color="#333" />,
  'Electronics': <MaterialCommunityIcons name="television" size={20} color="#333" />,
  'Computer and Networking': <MaterialCommunityIcons name="desktop-classic" size={20} color="#333" />,
  'Bussiness and Industrial': <MaterialCommunityIcons name="factory" size={20} color="#333" />,
  'Home Appliances': <MaterialCommunityIcons name="fridge-outline" size={20} color="#333" />,
  'Sports Equipment': <MaterialCommunityIcons name="basketball" size={20} color="#333" />,
  'Clothing and Accessories': <MaterialCommunityIcons name="tshirt-crew" size={20} color="#333" />,
  'Cameras and Imaging': <Feather name="camera" size={20} color="#333" />,
  'Jewelry and Watches': <MaterialCommunityIcons name="watch" size={20} color="#333" />,
  'Pets': <MaterialCommunityIcons name="dog" size={20} color="#333" />,
  'Musical Instruments': <MaterialCommunityIcons name="guitar-electric" size={20} color="#333" />,
  'Gaming': <MaterialCommunityIcons name="controller-classic-outline" size={20} color="#333" />,
  'Baby Items': <MaterialCommunityIcons name="baby-carriage" size={20} color="#333" />,
  'Toys': <MaterialCommunityIcons name="puzzle-outline" size={20} color="#333" />,
  'Tickets and Vouchers': <MaterialCommunityIcons name="ticket-outline" size={20} color="#333" />,
  'Collectibles': <FontAwesome5 name="gem" size={20} color="#333" />,
  'Books': <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#333" />,
  'Music': <Feather name="music" size={20} color="#333" />,
  'Free Stuff': <MaterialCommunityIcons name="gift-outline" size={20} color="#333" />,
  'Lost/Found': <MaterialCommunityIcons name="magnify" size={20} color="#333" />,
  'DVDs and Movies': <MaterialCommunityIcons name="movie-open-outline" size={20} color="#333" />,
  'Furniture, Home, and Garden': <MaterialCommunityIcons name="sofa" size={20} color="#333" />,
};

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  TestSound: undefined;
  FilterClassified: undefined;
  SeeAllProduct: { category: string, subcategories: object, type: string },
  PaymentScreenClassified: { id: string, type: string, userid: string }
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


const FilterClassified: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState([]);
  const [showsearchmodal, setShowsearchmodal] = useState(false)
  const [modalcity, setModalcity] = useState(false)
  const [userid, setUserid] = useState("")
  const [loading, setLoading] = useState(true)
  const [postclassifiedmodal, setPostclassifiedmodal] = useState(false)

  const handleSelect = (category: Category) => {
    setSelectedCategory(category);
    // You can navigate or trigger another action here
    console.log('Selected:', category?._id);
    console.log('subcategories Selected:', JSON.stringify(category?.subcategories));
    // navigation.navigate("TestSound")
    navigation.navigate("SeeAllProduct", { category: category?._id, subcategories: category?.subcategories })
  };

  const renderItem = ({ item }: { item: Category }) => (
    <>
      <TouchableOpacity style={styles.render_card}
        onPress={() => handleSelect(item)} key={item.name}>
        <View style={styles.itemContainer}>
          <Text style={styles.itemText}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    </>

  );

  useEffect(() => {
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
        const res = await api.get("/apis/categories/list?type=Classifieds");
        setCategories(res.data);
        setLoading(false);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
  }

  const handlePost = (adId: string) => {
    console.log('Ad ID from modal:', adId);
    // example usage:
    navigation.navigate('PaymentScreenClassified', {
      id: adId,
      type: 'payment', userid: userid
    });
  };

  const ShimmerCard = () => {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: "#f0f0f0" },
        ]}
      >
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={styles.listImage}
        />
        <View style={styles.productDetails}>
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "70%", height: 14, borderRadius: 5, marginBottom: 6 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "40%", height: 12, borderRadius: 5, marginBottom: 4 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "60%", height: 12, borderRadius: 5 }} />
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {categories.length === 0 && loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {[...Array(18)].map((_, index) => (
            <ShimmerCard key={index} />
          ))}
        </View>
      ) : (
        <>
          <View style={{ height: 105, backgroundColor: '#ffffff' }}>
            <View style={{
              height: 110, backgroundColor: '#F2F0F0',
              borderBottomLeftRadius: 30, borderBottomRightRadius: 30
            }}>
              <View style={styles.headerContainer}>
                {/* Search Box */}
                <TouchableOpacity
                  onPress={() => navigation.goBack()} // Added => 
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color="#888"
                    style={{ marginLeft: 5, marginRight: 5 }}
                  />
                 {/*  <Text style={{ color: '#888', fontSize: 16 }}>Back</Text> */}
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#888"
                    style={{ marginHorizontal: 2, marginLeft: 5 }} />
                  <TouchableOpacity
                    style={styles.searchInput}
                    onPress={() => setShowsearchmodal(true)}
                  ><Text style={{ padding: 9 }}>Search</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Icon */}
                <TouchableOpacity style={styles.iconButton} onPress={() => { setModalcity(true) }}>
                  <Ionicons name="options-outline" size={24} color="#000" />
                </TouchableOpacity>

                {/* Location Icon */}
                <TouchableOpacity style={styles.posticonButton} onPress={() => setPostclassifiedmodal(true)}>
                  <Text style={{ color: 'white' }}>Post Ads</Text>
                </TouchableOpacity>

              </View>

              <FlatList
                data={categories}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          </View>
          <ShowClassifiedCategory />
        </>
      )}
      <Modal
        visible={showsearchmodal}
        animationType="slide"
        onRequestClose={() => setShowsearchmodal(false)}
      >
        <SearchModalClassified
          query={text}
          onClose={() => {
            setShowsearchmodal(false);
            setText('');
          }}
        />
      </Modal>

      {
        modalcity && (
          <Modal
            transparent
            animationType="fade"
            visible={modalcity}
            onRequestClose={() => setModalcity(false)}
          >
            <FilterModalDashboard onClose={() => setModalcity(false)} cities={cities} />
          </Modal>
        )
      }
      {
        postclassifiedmodal && (
          <Modal
            transparent
            animationType="fade"
            visible={postclassifiedmodal}
            onRequestClose={() => setPostclassifiedmodal(false)}
          >
            <PostAdsModal onClose={() => setPostclassifiedmodal(false)} onChangevalue={handlePost} />
          </Modal>
        )
      }
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#f4f4f4',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 5,
    paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#f2f2f2'
  },
  card: {
    backgroundColor: '#fff',
    //borderRadius: 12,
    padding: 16, width: '100%',
    borderBottomWidth: 2, borderBottomColor: '#f2f2f2'
  },
  render_card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8, height: 40, marginRight: 5,
    borderBottomWidth: 2, borderBottomColor: '#f2f2f2'
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 5,
  },
  iconButton: {
    marginLeft: 5, marginRight: 8,
    padding: 6,
    //backgroundColor: '#3700b3',
    borderRadius: 8,
  },
  posticonButton: {
    flexDirection: 'row',      // 👈 makes it one line
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#000',
    gap: 6,                    // spacing between icon & text (RN 0.71+)
  },
  listImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  productDetails: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  }
});

export default FilterClassified;
