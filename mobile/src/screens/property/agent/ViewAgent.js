import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  Dimensions,
  ActivityIndicator, Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import api from '../../../component/api';
import { BASE_URL, SHARE_URL } from '../../../component/global';
import PropertyCard from './PropertyCard';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get("window");

const getColumns = () => {
  if (width < 600) return 2;
  if (width < 900) return 3;
  return 4;
};

const numColumns = getColumns();
const CARD_MARGIN = 8;

const CARD_WIDTH =
  (width - CARD_MARGIN * (numColumns + 1)) / numColumns;

const ViewAgent = ({ route }) => {
  const { propertyid } = route.params;

  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState('Properties');
  const [getpost, setGetpost] = useState([]);
  const [totalcount, setTotalcount] = useState(0)
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const slugify = (text = '') =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const producttitle = slugify(propertyid?.name);
  const profileLink = `${SHARE_URL}/profile/${propertyid._id}/${producttitle}`;


  useEffect(() => {
    if (propertyid?._id) {
      fetchPosts(true);
    }
  }, [propertyid]);

  const fetchPosts = useCallback(
    async (isInitial = false) => {
      if (!propertyid?._id) return;
      if (!isInitial && (loading || !hasMore)) return;

      setLoading(true);
      if (isInitial) setInitialLoading(true);

      try {
        const res = await api.get("/apis/property/myads", {
          params: {
            userid: propertyid._id,
            page: isInitial ? 1 : page,
            limit: 10,
          },
        });

        const data = res.data?.users || [];

        if (data.length === 0) {
          setHasMore(false);
        } else {
          setTotalcount(res.data?.total)
          setGetpost(prev =>
            isInitial ? data : [...prev, ...data]
          );
          setPage(prev => (isInitial ? 2 : prev + 1));
        }

      } catch (error) {
        console.error("Fetch posts error:", error);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [loading, hasMore, page, propertyid]
  );
  const shareData = async () => {
    try {
      let shareOptions;

      if (Platform.OS === 'ios') {
        shareOptions = {
          message: 'Check this profile',
          url: profileLink,
        };
      } else {
        shareOptions = {
          message: `Max! ${profileLink}`,
        };
      }

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error.message);
    }
  };


  return (
    <View style={{ flex: 1 }}>

      <FlatList
        data={selectedTab === "Properties" ? getpost : []}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 100 }}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: CARD_MARGIN,
        }}

        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={24} />
              </TouchableOpacity>

              <TouchableOpacity onPress={shareData}>
                <Icon name="share" size={24} />
              </TouchableOpacity>
            </View>

            {/* AGENCY INFO */}
            <View style={styles.agencyInfo}>
              <View>
                {propertyid?.image && (
                  <Image
                    source={{ uri: BASE_URL + '/' + propertyid.image }}
                    style={styles.logo}
                  />
                )}

                <View>
                  <Text style={styles.agencyName}>{propertyid?.name}</Text>
                  <Text style={styles.propertyCount}>
                    {totalcount} products
                  </Text>
                </View>
              </View>
              <View>
                {/* qr code */}
                <QRCode
                  value={profileLink}
                  size={70}
                />
              </View>
            </View>

            {/* TAB MENU */}
            <View style={styles.tabMenu}>
              {['Properties', 'Agents'].map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)}>
                  <Text style={[
                    styles.tabText,
                    selectedTab === tab && styles.activeTab
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AGENTS TAB */}
            {selectedTab === "Agents" && (
              <View style={styles.section}>
                {[1, 2].map((id) => (
                  <View key={id} style={styles.agentCard}>
                    <Image
                      source={{ uri: 'https://via.placeholder.com/60' }}
                      style={styles.agentImage}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.agentName}>Agent Name</Text>
                      <Text style={styles.agentLang}>English, Arabic</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        }

        renderItem={({ item }) => (
          <View style={[styles.card, { width: CARD_WIDTH }]}>
            <PropertyCard item={item} />
          </View>
        )}

        keyExtractor={(item) => item._id}

        onEndReached={() => fetchPosts()}
        onEndReachedThreshold={0.5}

        ListFooterComponent={
          loading ? <ActivityIndicator size="small" /> : null
        }
      />

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn}>
          <Icon name="email" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn}>
          <Icon name="call" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn}>
          <Icon name="sms" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ViewAgent;

const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  agencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },

  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  propertyCount: {
    color: 'gray',
  },

  tabMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },

  tabText: {
    fontSize: 15,
    color: 'gray',
  },

  activeTab: {
    color: 'black',
    fontWeight: 'bold',
  },

  card: {
    marginBottom: 10,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderTopWidth: 1,
  },

  footerBtn: {
    alignItems: 'center',
  },

  // PropertyCard styles
  cardInner: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  image: {
    width: "100%",
    height: 120,
  },

  priceTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  priceText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  title: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    marginTop: 6,
  },

  meta: {
    fontSize: 11,
    color: "#666",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
});