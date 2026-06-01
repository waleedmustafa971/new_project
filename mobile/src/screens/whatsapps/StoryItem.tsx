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

type Story = {
  id: string;
  name: string;
  image: string;
};

type StoryListProps = {
  me: string;
  //userid: string;
  // partner: string | null;
  userinfo: object;
};

import { useNavigation } from '@react-navigation/native';

const StoryList: React.FC<StoryListProps> = ({ me, userinfo }: any) => {
  //console.log('...story list....' + JSON.stringify(userinfo) + ')
  const navigation = useNavigation();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userid, setUserid] = useState(null);
  const [currentuserid, setCurrentuserid] = useState(null);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState<boolean>(false);
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
      setIsloading(false);
      // console.log('here' + userData._id + '--' + userData.name)
      try {
        const response = await axios.get(
          base.BASE_URL + `/apis/reel/myFollowering`,
          {
            params: {
              userId: userData._id,
              page: currentPage,
              limit: 10,
            },
          }
        );
        const { followers, totalPages, totalFollowers } = response.data;
        setProducts((prevProducts) =>
          currentPage === 1 ? followers : [...prevProducts, ...followers]
        );
        setTotalPages(totalPages);
      } catch (error) {
        setIsloading(false);
      } finally {
        setIsloading(false);
      }
    } else { console.log('no user found') }
  };
  const passValue = (item: any) => {
    const userdata = {
      _id: item._id, // No conversation yet
      type: "private",
      partner: {
        _id: item._id,
        name: item.name,
        image: item.image || ""
      },
      lastMsg: null, // or {} if you want to initialize an empty object
    };
    navigation.navigate("ChatDetails", { me: me, partner: item._id, userinfo: userdata });
  }
  const renderItemusers = ({ item }: any) => {
    // const isSelected = selectedUsers.some((u) => u._id === item._id);
    return (
      <>
        <TouchableOpacity style={styles.storyItem} key={item._id}
          onPress={() => {
            //navigation.navigate("ChatDetails", { me: me, partner: partner, userinfo: userinfo });
            passValue(item);
          }}
        >
          <Image source={
            item.image ? { uri: item.image } : require("../../assets/user.png")
          } style={styles.storyImage} />
          {/*  <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text> */}
          <Text style={styles.storyName}>
            {item.name.length > 5 ? item.name.slice(0, 6) + ".." : item.name}
          </Text>
        </TouchableOpacity>
      </>
    );
  };


  return (
    <View style={{ marginBottom: 7 }}>
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
    marginRight: 10,
    alignItems: 'center',
  },
  StoryAdd: {
    marginRight: 5,
    alignItems: 'center',
  },
  storyBg: {
    width: 40,
    height: 40,
    borderRadius: 32,
    backgroundColor: '#f2f2f2', /* 007AFF */
    borderWidth: 2,
    borderColor: '#f2f2f2', padding: 12
  },
  storyImage: {
    width: 40,
    height: 40,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#000',
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default StoryList;
