import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import * as base from '../../../component/global'
//import ShowClassifiedCategory from './ShowClassifiedCategory';
//import SearchModalClassified from './search/SearchModalClassified';
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import JobTitleSection from './JobTitleSection';
import JobSearchBar from './JobSearchBar';
import menuData from './data.json';
import BrowseCategories from './BrowseCategories';
import axios from 'axios';
import HotJobList from './HotJobList';
import FooterJob from '../FooterJob';
import UploadCVSection from './UploadCVSection';
import ModalSearchJob from '../modal/ModalSearchJob';
import JobbyQualification from './JobbyQualification';
import Jobtypecount from './Jobtypecount';
import PostJobModal from '../modal/PostJobModal';


type Category = {
  id: string;
  name: string;
};

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
  TestSound: undefined;
  FilterClassified: undefined;
  SeeAllProduct: { category: string }
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface JobCategory {
  _id: string;
  title: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
  subcategories: any[];
  jobcategoriesdata: [];
}
interface JobPopular {
  _id: string;
}


const JobDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [jobcategoriesdata, setJobcategoriesdata] = useState<JobCategory[]>([]);
  const [jobpopularlist, setJobpopularlist] = useState<JobPopular[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [text, setText] = useState('');
  const [modaljobpopup, setModaljobpopup] = useState(false);
  const [jobType, setJobType] = useState(null);

  const handleSelect = (category: Category) => {
    setSelectedCategory(category);
    // You can navigate or trigger another action here
    console.log('Selected:', category.name);
    // navigation.navigate("TestSound")
    navigation.navigate("SeeAllProduct", { category: category.name })
  };

  const renderItem = ({ item }: { item: Category }) => (
    <>
      <TouchableOpacity style={styles.render_card} onPress={() => handleSelect(item)}>
        <View style={styles.itemContainer}>
          <Text style={styles.itemText}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    </>

  );

  useEffect(() => {
    getJobcat()
    getPopularjob()
  }, [])

  const getJobcat = async () => {
    try {
      const res = await axios.get(
        base.BASE_URL + "/apis/job/getlist?page=1&limit=100"
      );
      // console.log(res.data);
      setJobcategoriesdata(res.data || []);
    } catch (error) {
      console.error("Error fetching job categories:", error);
    } finally {
      setLoading(false);
    }
  }

  const getPopularjob = async () => {
    try {
      const res = await axios.get(base.BASE_URL + "/apis/job/getjoblist?page=1&limit=10");
      setJobpopularlist(res.data?.users || []);
    } catch (error) {
      console.error("Error fetching job list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (jobType) {
    navigation.navigate("CompanyJobpost", {
      type: jobType,
    });
  }
}, [jobType]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={["#ffffff", "#f2f2f2"]} // start → end colors
          start={{ x: 0, y: 0 }}          // gradient direction (top-left)
          end={{ x: 1, y: 0 }}            // to right side
          locations={[0, 0.91]}           // 0% → 91%
          style={styles.gradient}
        >
          <View style={{
            width: '100%',
            borderBottomLeftRadius: 30, borderBottomRightRadius: 30
          }}>
            <View style={styles.headerContainer}>
              {/* Search Box */}
              <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
                <Ionicons
                  name="chevron-back"
                  size={25}
                  color="#000"
                  style={{
                    marginLeft: 2, marginRight: 5,
                    width: 25
                  }}
                />
              </TouchableOpacity>
              <View style={styles.searchContainer}>
                <Text style={{ color: '#000' }}>Job Portal</Text>
              </View>
              {/* Filter Icon */}
              <TouchableOpacity style={styles.iconButton} onPress={() => {
                setModaljobpopup(true)}}>
                <Text style={{ color: 'white' }}>Post Job</Text>
              </TouchableOpacity> 

            </View>
            <View>
              <JobTitleSection />
            </View>
            <View>
              <JobSearchBar onOpenModal={() => setShowSearchModal(true)} />
            </View>
          </View>

        </LinearGradient>

        <View style={{
          marginBottom: 0, padding: 8, height: 100
        }}>
          <>
            <UploadCVSection />
          </>
        </View>

        <View style={{ borderWidth: 0, borderColor: 'red' }}>
          <BrowseCategories jobcategoriesdata={jobcategoriesdata} />
        </View>

        <View style={{
          marginBottom: 0
        }}>
          <>
            {loading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <HotJobList
                jobpopularlist={jobpopularlist}
                setJobpopularlist={setJobpopularlist}
              />
            )}
          </>
        </View>

         <View style={{
          marginBottom: 0
        }}>
              <JobbyQualification/>
        </View>

          <View style={{
          marginBottom: 0
        }}>
              <Jobtypecount/>
        </View>


        <Modal
          visible={showSearchModal}
          animationType="slide"
          onRequestClose={() => setShowSearchModal(false)}
        >
          <ModalSearchJob
            query={text}
            onClose={() => {
              setShowSearchModal(false);
              setText('');
            }}
          />
        </Modal>

        {
          modaljobpopup ?
          <> 
          <PostJobModal visible={modaljobpopup} setVisible={setModaljobpopup} setJobType={setJobType}/>          
          </> : null
        }


      </ScrollView>
    {/*   <View style={styles.footer}>
        <FooterJob navigation={navigation} />
      </View> */}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#ffffff',
  },
  footer: {
    backgroundColor: 'white',
    padding: 3,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  header: {
    fontSize: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    alignSelf: 'center',
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
    marginLeft: 5,
    padding: 8,
    backgroundColor: '#000',
    borderRadius: 8,
  }
});

export default JobDashboard;
