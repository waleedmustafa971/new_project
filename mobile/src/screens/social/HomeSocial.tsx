import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Text, View, StyleSheet, Alert, Dimensions, Modal, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  Platform,
  StatusBar,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
const { width, height } = Dimensions.get("window");
import axios from "axios";
import * as base from "../../component/global";

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from "@react-navigation/native";
import PostSection from "./post/PostSection";
import TopMenu from "./TopMenu";
import StoryScreen from "./story/StoryScreen";
import Footerpage from "./Footerpage";
import ReelsFeed from "./reel/ReelsFeed";
import SponsorScreen from "./post/SponsorScreen";
import { sponsorAds } from './post/sponsorAds';
import PeopleYouMayKnowSection from "./post/PeopleYouMayKnowSection";
import { useUser } from "../context/UserContext";
import api from "../../component/api";
import Toast from "react-native-toast-message";

type RootStackParamList = {
  HomeSocial: undefined;
  HomeWhatsapp: undefined;
  HomeScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Post = {
  _id: string;
  title: string;
  content: string;
};

const HomeSocial = () => {

  const navigation = useNavigation<NavigationProp>();
  //const [user, setUser] = useState<string | null>(null);
  const { user, setUserData, logout } = useUser();
  console.log('...setUserData....', setUserData)
  const [username, setUsername] = useState<string | null>(null);
  const [fullname, setFullname] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  //const onChangeSearch = (query) => setSearchQuery(query);
  const [token, setToken] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  //Post
  //const [getpost, setGetpost] = useState([]);
  const [getpost, setGetpost] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userid, setUserid] = useState(null)
  const [userinfo, setUserinfo] = useState([])
  const [userName, setUserName] = useState(null)
  const [userImage, setUserImage] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true);
  //end post

  useEffect(() => {
    userData();
  }, []);

  const userData = async () => {
    setInitialLoading(true);
    try {
      // const value = await AsyncStorage.getItem('userinfo');
      const user = await AsyncStorage.getItem("username");
      const fullname = await AsyncStorage.getItem("fullname");
      const token = await AsyncStorage.getItem("token");
      const jsonValue = await AsyncStorage.getItem("userdata");
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        setUserid(userData._id);
        setUserName(userData.name);
        setUserImage(userData.image);
        console.log("...token.dashboard ..last image......" + userData.image);
        setUserinfo(userData);
        //fetchPosts();
        // IMPORTANT: wait for first posts
        await fetchPosts(true);
      }
      if (user) setUsername(user);
      if (fullname) setFullname(fullname);
      if (token) setToken(token);
      //    Alert.alert(token)
    } catch (error) {
      // Error retrieving data
    }
  };

  const renderData = useMemo(() => {
    const result: any = [];
    let sponsorIndex = 0;
    let friendListInserted = false;

    getpost.forEach((post, index) => {
      result.push({ type: 'post', data: post });

      // Inject sponsor every 3 posts
      if ((index + 1) % 3 === 0) {
        result.push({ type: 'sponsor', id: `sponsor-${sponsorIndex++}` });
      }

      // Inject friend list after 5 posts, only once
      if (!friendListInserted && index === 4) {
        result.push({ type: 'friendlist', id: 'friendlist' });
        friendListInserted = true;
      }
    });

    return result;
  }, [getpost]);

  const fetchPosts = useCallback(
    async (isInitial = false) => {
      // The page and the in-flight flag live in refs, not state: onEndReached
      // fires as soon as the first page renders short, which is before a
      // setPage/setLoading update has committed. Reading state here would
      // re-request page 1 and append it a second time.
      if (fetchingRef.current) return;
      if (!isInitial && !hasMore) return;

      const requestedPage = isInitial ? 1 : pageRef.current;
      fetchingRef.current = true;
      setLoading(true);
      if (isInitial) setInitialLoading(true);

      try {
        const res = await api.get("/apis/postreel/lasttenpost", {
          params: {
            page: requestedPage,
            limit: 10,
            username: user?.username,
            userid: user?._id,
          },
        });

        if (res.data?.message === "No posts found") {
          setHasMore(false);
        } else {
          const incoming: Post[] = res.data.reels ?? [];
          // Belt and braces: the server can legitimately return a post already
          // held (a new post shifts the page window), and duplicate keys break
          // FlatList's identity tracking.
          setGetpost(prev => {
            const merged = isInitial ? incoming : [...prev, ...incoming];
            const seen = new Set<string>();
            return merged.filter(p => {
              const id = String(p._id);
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
          });
          pageRef.current = requestedPage + 1;
          setPage(requestedPage + 1);
        }
      } catch (error) {
        console.error("Fetch posts error:", error);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [hasMore, user]
  );

  return (
    <View style={styles.MainContainer}>
      <TopMenu navigation={navigation} userid={user?._id} userinfo={user} />
      <View style={{ display: 'flex' }}>
        <FlatList
          data={renderData}
          extraData={getpost}
          keyExtractor={(item, index) =>
            item.type === 'post' ? item.data._id : `${item.type}-${index}`
          }
          renderItem={({ item }) => {
            switch (item.type) {
              case 'post':
                return <PostSection post={item.data} navigation={navigation} userid={userid} />;
              case 'sponsor':
                const randomIndex = Math.floor(Math.random() * sponsorAds.length);
                return <SponsorScreen ad={sponsorAds[randomIndex]} />;
              case 'friendlist':
                return <PeopleYouMayKnowSection navigation={navigation} />;
              default:
                return null;
            }
          }}
          ListHeaderComponent={
            <>
              <StoryScreen navigation={navigation} name={userName} image={userImage} />
              <ReelsFeed userid={userid} />
            </>
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ marginBottom: 100 }} />
            )
          }
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {/* Backend end-to-end tester. Only rendered while pointed at the local
          server, so it disappears from production builds on its own. */}
      {base.USE_LOCAL_SERVER && (
        <TouchableOpacity
          style={styles.labButton}
          onPress={() => navigation.navigate('SocialLab' as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.labButtonText}>LAB</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Footerpage navigation={navigation} />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  MainContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 0
    //paddingTop: Platform.OS === "android" ? 0 : 0, // ✅ number, not string
  },
  /* Dev-only, so it should sit quietly out of the way rather than compete with
     the feed. It was large and fully opaque, landing on top of whichever post's
     overflow menu happened to scroll under it. */
  labButton: {
    position: 'absolute',
    left: 12,
    bottom: 100,
    opacity: 0.75,
    backgroundColor: '#6f74e8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20,
  },
  labButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
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

});
export default HomeSocial;
