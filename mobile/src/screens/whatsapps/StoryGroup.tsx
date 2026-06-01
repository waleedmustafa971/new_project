import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as base from '../../component/global'
const AddNewStory = require("../../assets/messenger_icon/add_story.png"); // Adjust path as needed
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import api from '../../component/api';

type Story = {
  id: string;
  name: string;
  image: string;
};


const StoryGroup: React.FC = ({me,userinfo} : any) => {

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userid, setUserid] = useState(null);
  const [currentuserid, setCurrentuserid] = useState(null);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState<boolean>(false);
  const navigation = useNavigation();
  
  useEffect(() => {
    if (page > 1) {
      fetchMyfollerwers(page);
    }
  }, [page]);

   useEffect(() => {
          fetchMyfollerwers(1);
          return () => {
              fetchMyfollerwers(1);
          };
      }, []);
  

  const handleLoad = () => {
    console.log("current page.....with scroll followers", page);
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

const fetchMyfollerwers = async (currentPage: number) => {
  const jsonValue = await AsyncStorage.getItem("userdata");
  if (jsonValue != null) {
    const userData = JSON.parse(jsonValue);
    setUserid(userData._id);
    setCurrentuserid(userData._id);
    setIsloading(true);
    console.log('here ' + userData._id + ' -- ' + userData.name);

    try {
      console.log("ddd " + JSON.stringify(userData));
      const response = await api.get(`/apis/voice/getmessengergroup`,
        {
          params: {
            userId: userData._id,
            page: currentPage,
            limit: 10, 
          },
        }
      );

      const { groups, totalPages, totalGroups } = response.data;
      console.log('...group list.....', response.data);
      setProducts(prevProducts =>
        currentPage === 1 ? groups : [...prevProducts, ...groups]
      );
      setTotalPages(totalPages);
    } catch (error) {
      setIsloading(false);
      console.error(
        "Error fetching followers:",
        error.response?.data || error.message
      );
    } finally {
      setIsloading(false);
    }
  } else {
    console.log('no user found');
  }
};

const passValue = (item) => {
    console.log('......p......' + JSON.stringify(item))
    const userdata = {
            _id: item._id, // group id
            type: "group",
            group: {
                _id: item._id,
                groupName: item.groupName,
                groupimage: item.groupimage || ""
            },
            lastMsg: null, // or {} if you want to initialize an empty object
        };
    navigation.navigate("ChatDetails", { me: me, partner: item._id, userinfo: userdata, type: 'group' });
  }

  const renderItemusers = ({ item } : any) => (
    <TouchableOpacity style={styles.storyItem} key={item._id}  
    onPress={() => {
          passValue(item);
        }} >
      <Image
        source={
          item.userinfo?.userimage
            ? { uri: item.userinfo.userimage }
            : require("../../assets/user.png")
        }
        style={styles.storyImage}
      />
      <Text style={styles.storyName} numberOfLines={1}>{item.groupName || "No Name"}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ paddingVertical: 0, marginTop: 6, marginLeft: 10 }}>
      <View style={{ flexDirection: 'row' }}>
        <FlatList
          horizontal
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderItemusers}
          onEndReached={handleLoad}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isloading ? <ActivityIndicator size="large" color="#0000ff" /> : null
          }
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  storyList: {
    paddingLeft: 10,
  },
  storyItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  StoryAdd: {
    marginRight: 5,
    alignItems: 'center',
  },
  storyBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f2f2f2', /* 007AFF */
    borderWidth: 2,
    borderColor: '#f2f2f2', padding: 12
  },
  storyImage: {
    width: 40,
    height: 40,
    borderRadius: 32,
    borderWidth: 0,
    borderColor: '#007AFF',
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default StoryGroup;
