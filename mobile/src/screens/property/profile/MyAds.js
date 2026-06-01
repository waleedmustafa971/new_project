import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as base from '../../../component/global'
import api from '../../../component/api'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import AdInsightsModal from "./AdInsightsModal";
const PAGE_LIMIT = 10;

export default function MyAds() {
  const [data, setData] = useState([]); 
  const [selectedData, setSelectedData] = useState([]); 
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [userid, setUserid] = useState(null);
  const navigation = useNavigation()
  //6858084f41cc71c9c697da79
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      console.log("user id....." + userData._id);
      setUserid(userData._id);
      //////
      if (loading || page > totalPages) return;
      setLoading(true);
      try {
        const res = await fetch(base.BASE_URL + `/apis/property/myown-ads/${userData._id}/live?page=${page}&limit=${PAGE_LIMIT}`
        );
        const json = await res.json();
        setData((prev) => [...prev, ...json.users]);
        setTotalPages(json.totalPages);
      } catch (error) {
        console.error("Error fetching:", error);
      } finally {
        setLoading(false);
      }

      ////
    } else {
      console.log("No user data found");
    }

  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handGrap = (item) => {
    setSelectedData(item)
    setModalVisible(true)
  }

  const renderItem = ({ item, index }) => (
    <View style={styles.card} key={item._id + index}>
      <Image
        source={{ uri: base.BASE_URL + `${item.images?.[0]?.image}` }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.textContainer}>
        <View style={{ width: '80%' }}>
          <Text style={styles.title} numberOfLines={1}
            ellipsizeMode="tail">{item.shortTitle}</Text>

        </View>
        <View style={{ flexDirection: 'column' }}>
          <Text
            style={[
              styles.status,
              {
                backgroundColor: item.status === "draft" ? "#FFB74D" : "#81C784",
              },
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        marginBottom: 5
      }}>

        {/* Graphs */}
        <TouchableOpacity style={styles.button} onPress={() => handGrap(item)}>
          <Icon name="stats-chart" size={20} color="#000" />
          <Text style={styles.buttonText}>Graphs</Text>
        </TouchableOpacity>

        {/* Impression */}
        <TouchableOpacity style={styles.button}>
          <Icon name="eye" size={20} color="#000" />
          <Text style={styles.buttonText}> {item?.viewsCount} Views</Text>
        </TouchableOpacity>

        {/* Message */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate("ProductChatScreen", {
              productId: item._id,
              otherUserId: item.userid,
              userId: userid,
            })
          }
        >
          <Icon name="chatbubble-ellipses" size={20} color="#000" />
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>

        {/* More Views */}
        <TouchableOpacity style={styles.button} onPress={() => {
          navigation.navigate('PaymentScreenProperty', {
            id: item._id,
            type: 'payment', userid: userid
          });
        }}>
          <Icon name="eye-outline" size={20} color="#000" />
          <Text style={styles.buttonText}>Get More Views</Text>
        </TouchableOpacity>


        {
          item?.status === "draft" ?
            <>
              <TouchableOpacity style={{
                width: 100, height: 40,
                backgroundColor: '#000',
                borderRadius: 10, justifyContent: 'center',
                alignContent: 'center',
                alignItems: 'center',
                marginBottom: 15, marginRight: 10
              }}>
                <Text style={{
                  color: '#000000'
                }}>Delete</Text>
              </TouchableOpacity>
            </> : null
        }

      </View>

    </View>
  );

  const loadMore = () => {
    if (!loading && page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <>

      <FlatList
        data={data}
        renderItem={renderItem}
        // keyExtractor={(item) => item._id}
        keyExtractor={(item) => item._id.toString()} // make sure it's a string
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && <ActivityIndicator size="large" color="#000" />}
        contentContainerStyle={styles.container}
      />

      {/* 3. The Modal Component */}
      <AdInsightsModal
        visible={modalVisible} data={selectedData}
        onClose={() => setModalVisible(false)}
      />
    </>

  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  image: {
    width: "100%",
    height: 180,
  },
  textContainer: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
  status: {
    color: "#000", padding: 5,
    borderRadius: 8,
    fontWeight: "bold",
    fontSize: 12,
    justifyContent: 'center'
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // for Android shadow
  },
  buttonText: {
    color: "#000",
    fontWeight: "600",
    marginLeft: 8,
  },
});
