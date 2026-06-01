import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, FlatList, StyleSheet, ActivityIndicator, Image, TextInput, Switch, ScrollView, Alert } from "react-native";
import Feather from 'react-native-vector-icons/Feather'
import AntDesign from 'react-native-vector-icons/AntDesign'
import Icon from 'react-native-vector-icons/Ionicons'
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as base from '../../component/global'
import { useNavigation } from "@react-navigation/native";
import AddGroupForm from "./AddGroupForm";
import api from "../../component/api";

const AddNewgroupscreen = () => {
  const navigation = useNavigation()
  const [userid, setUserid] = useState(""); //setCurrentuserid
  const [currentuserid, setCurrentuserid] = useState(""); //
  const [pagename, setPagename] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState([]);
  const [isloading, setIsloading] = useState([]);
  const [followedUsersing, setFollowedUsersing] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false)

  const [permission, setPermission] = useState('Everyone');
  const [text, setText] = useState(null)

  const permissions = ['Everyone', 'Admins only'];
  useEffect(() => {
    fetchMyfollerwers(1);
    return () => {
      fetchMyfollerwers();
    };
  }, []);

  /* const handleSelectUser = (user) => {
    const updatedUsers = [...selectedUsers, user];
    setSelectedUsers(updatedUsers);
    if (onSelectUsers) {
      onSelectUsers(updatedUsers);
    }
    console.log('.....handleSelectUser......' + JSON.stringify(user))
  };
 */


  const handleRemoveUser = (userId) => {
    const updatedUsers = selectedUsers.filter((u) => u._id !== userId);
    setSelectedUsers(updatedUsers);
  };



  useEffect(() => {
    if (page > 1) {
      fetchMyfollerwers(page);
    }
  }, [page]);

  const handleLoad = () => {
    console.log("current page.....with scroll followers", page);
    if (!isloading && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const fetchMyfollerwers = async (currentPage) => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (jsonValue != null) {
      const userData = JSON.parse(jsonValue);
      setUserid(userData._id);
      setCurrentuserid(userData._id);
      setIsloading(true);
      try {
        console.log("ddd" + JSON.stringify(userData));
        const response = await api.get(
          `/apis/reel/myFollowering?userId=${userData._id}&page=${currentPage}&limit=10`
        );
        const { followers, page, limit } = response.data;
        setProducts((prevProducts) =>
          currentPage === 1 ? followers : [...prevProducts, ...followers]
        );
        setTotalPages(totalPages);
      } catch (error) {
        console.error(
          "Error fetching followers:",
          error.response?.data || error.message
        );
      } finally {
        setIsloading(false);
      }
    }
  };

  const handleToggleUser = (user) => {
    const isSelected = selectedUsers.some((u) => u._id === user._id);
    let updatedUsers;

    if (isSelected) {
      updatedUsers = selectedUsers.filter((u) => u._id !== user._id);
    } else {
      updatedUsers = [...selectedUsers, user];
    }

    setSelectedUsers(updatedUsers);
  };



  const renderItemusers = ({ item }) => {
    const isSelected = selectedUsers.some((u) => u._id === item._id);
    return (
      <TouchableOpacity
        style={styles.friendContainer}
        key={item._id}
        onPress={() => handleToggleUser(item)}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={item.image ? { uri: item.image } : require("../../assets/user.png")}
            style={styles.avatar}
          />
          {isSelected && (
            <View
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                backgroundColor: 'blue',
                borderRadius: '50%',
                padding: 5
              }}
            >
              <Feather name="check" size={15} color="#ffffff" />
            </View>
          )}

        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.subname}>
            People you may know
          </Text>
        </View>
      </TouchableOpacity>
    )
  };



  const onChangeText = () => {


  }
  const submitNext = () => {
    if (!selectedUsers) {
      Alert.alert('Select the Member from List')
    } else {
      setOpenForm(true)
    }

  }
  const handledata = () => {
    setOpenForm(false);
    navigation.navigate("CreateGroup", {
      userid: "",
      userinfo: ""
    });
  }


  return (
    <View>
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}
            >
              <AntDesign name="back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerText}>
              New Group
              {selectedUsers.length > 0
                ? ` (${selectedUsers.length})`
                : ''}
            </Text>
          </View>
          {
            isloading ?
              <ActivityIndicator />
              :
              <TouchableOpacity onPress={submitNext} style={styles.nextButton}>
                <Text style={{ color: '#ffffff' }}>Next</Text>
              </TouchableOpacity>
          }

        </View>

        <View style={styles.listWrapper}>
          {/* Start Form */}

          <View style={{
            borderWidth: 0,
            borderColor: 'red', padding: 0
          }}>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={selectedUsers}
              keyExtractor={(item) => item._id}
              style={{ marginTop: 10 }}
              renderItem={({ item }) => (
                <View style={styles.storyItem}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={item.image ? { uri: item.image } : require("../../assets/user.png")}
                      style={styles.storyImage}
                    />
                    <TouchableOpacity style={styles.closeIcon} onPress={() => handleRemoveUser(item._id)}>
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {/* The key part here: numberOfLines and ellipsizeMode */}
                  <Text style={styles.storyName}>
                    {item.name.length > 9 ? item.name.slice(0, 9) + '...' : item.name}
                  </Text>
                </View>
              )}

            />


          </View>
          {/* End form */}

          {/* Search bar */}
          <View style={styles.searchcontainer}>
            <Icon name="search" size={20} color="#888" style={styles.searchicon} />
            <TextInput
              style={styles.searchinput}
              // value={text}
              onChangeText={onChangeText}
              placeholder="Search friends"
              placeholderTextColor="#aaa"
            />
          </View>
          {/* End Search bar */}
          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            renderItem={renderItemusers}
            onEndReached={handleLoad}
            onEndReachedThreshold={0.5}
            numColumns={1}
            ListFooterComponent={
              isloading ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : null
            }
          />
        </View>
      </View>
      {
        openForm ?
          <>
            <AddGroupForm visible={openForm} onClose={() => handledata()} userid={userid} users={selectedUsers} />
          </>
          : null
      }
    </View>
  )
}

const styles = {
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 30,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    marginTop: 25,
    borderBottomWidth: 0,
    borderColor: "#ddd",
  },
  storyItem: {
    marginRight: 16,
    alignItems: 'center', padding: 8
  },
  avatarContainer: {
    position: 'relative',
  },
  storyImage: {
    width: 40,
    height: 40,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  closeIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff0000',
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10, height: 200
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginTop: 5,
  },
  leftIcon: { flex: 1 },
  title: { flex: 3, textAlign: "center", fontSize: 18, fontWeight: "bold" },
  rightIcon: { flex: 1, alignItems: "flex-end" },
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  friendContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  avatar: { width: 30, height: 30, borderRadius: 50, marginRight: 10 },
  name: { fontSize: 14 },
  subname: { fontSize: 10 },
  addButton: { backgroundColor: "#000", padding: 10, borderRadius: 20 },
  addText: { color: "#fff", fontSize: 13 },
  followingButton: {
    backgroundColor: "#aaa", // or green, your choice
  },

  followingText: {
    color: "#fff", // or slightly dimmed if you want
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingBottom: 0, borderWidth: 0, borderColor: 'green'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 5,
    marginRight: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151', // Tailwind's gray-800
  },
  nextButton: {
    backgroundColor: '#3B82F6', // Tailwind's blue-500
    borderRadius: 20,
    padding: 8,
    marginLeft: 12,
    elevation: 5, // shadow for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // iOS shadow
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 5,
    flex: 1, borderWidth: 0, borderColor: 'green'
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  permissionOption: {
    paddingVertical: 8,
  },
  selectedOption: {
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  permissionText: {
    fontSize: 14,
  },
  memberList: {
    maxHeight: 100,
    marginTop: 5,
  },
  memberItem: {
    fontSize: 13,
    paddingVertical: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  row: {
    width: 100, height: 100,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },

  name: {
    flex: 1,
    fontSize: 16,
  },
  /* search */
  searchcontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 40,
    marginVertical: 10,
  },
  searchicon: {
    marginRight: 8,
  },
  searchinput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  /* End Search */
};

export default AddNewgroupscreen;
