import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AddAddressModal from '../../../component/shopping/address/AddAddressModal';
import api from '../../../component/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from "react-redux";
import { getSingleUser } from "../../../store/slice/userSlice";
import { getLiveLocation } from '../../permission/PermissionManager';
  import { useFocusEffect } from '@react-navigation/native';
  import { useCallback } from 'react';

const DeliveryAddress = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [address, setAddress] = useState(null)
  const [modalVisible, setModalVisible] = useState(false);
  const [userid, setUserid] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const { singleUser } = useSelector((state: any) => state.users);
  console.log('....singleUser', singleUser)


  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );
  const loadUser = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return console.log("No user data found");
    const user = JSON.parse(jsonValue);
    setUserid(user._id);
    setEmail(user.email);
    dispatch(getSingleUser(user._id));
    const location = await getLiveLocation();
    console.log("✅ location direct:", location);
    setAddress(location?.address)
    setLatitude(location.latitude);
    setLongitude(location?.longitude)
  };


  const handleSaveAddress = async (data: any) => {
    setModalVisible(false);

    try {
      await api.post("/apis/auth/update-address", {
        userId: userid,
        address: data,
      });

      dispatch(getSingleUser(userid));
    } catch (error) {
      console.log("Error updating address", error);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await api.post("/apis/auth/delete-address", {
        userId: userid,
        addressId,
      });

      dispatch(getSingleUser(userid));
    } catch (error) {
      console.log("Error deleting address", error);
    }
  };

  const handleEditAddress = (address: any) => {
    // navigation.navigate("EditAddressScreen", { address });
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Delivery address</Text>

        <View style={{ width: 28 }} />
      </View>
      <ScrollView>
        {/* ADDRESS LIST */}
        {


          singleUser?.user?.address?.length > 0 ? (
            singleUser.user.address.map((addr: any) => (
              <View key={addr._id} style={styles.addressCard}>

                <View style={styles.addressHeader}>
                  <Text style={styles.addressTitle}>{addr.name}</Text>

                  <View style={styles.actionRow}>
                    {/*   <TouchableOpacity onPress={() => handleEditAddress(addr)}>
            <MaterialCommunityIcons name="pencil" size={22} color="#1c75ff" />
          </TouchableOpacity> */}

                    <TouchableOpacity onPress={() => handleDeleteAddress(addr._id)}>
                      <MaterialCommunityIcons name="delete" size={15} color="red" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 12 }}>Location: {addr.location}</Text>
                <Text style={{ fontSize: 12 }}>House Number: {addr.houseNumber}</Text>
                <Text style={{ fontSize: 12 }}>Type: {addr.name}</Text>
                <Text style={{ fontSize: 12 }}>Mobile: {addr.mobile}</Text>
                <Text style={{ fontSize: 12 }}>Delivery Instructions: {addr.instructions}</Text>

              </View>
            ))
          ) : (
            <View style={styles.noAddressContainer}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={50} color="#999" />
              <Text style={styles.noAddressText}>No Delivery Address</Text>
            </View>
          )}
      </ScrollView>

      {/* ADD ADDRESS BUTTON */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>

      {/* MODAL */}
      {
        modalVisible ?
          <>
            <AddAddressModal
              visible={modalVisible}
              onClose={() => 
              {
                loadUser();
                setModalVisible(false)
              }
              }
              onSave={handleSaveAddress}
              userid={userid}
              latitude={latitude}
              longitude={longitude}
              address={address}
              navigation={navigation}
            />
          </> : null
      }

    </View>
  );
};

export default DeliveryAddress;

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },

  addressCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff", fontSize: 12
  },

  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  addressTitle: {
    fontWeight: "bold",
    fontSize: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  noAddressContainer: {
    alignItems: "center",
    marginTop: 20,
  },

  noAddressText: {
    fontSize: 12,
    color: "#777",
    marginTop: 10,
  },

  addButton: {
    backgroundColor: "#000",
    paddingVertical: 15,
    marginTop: "auto",
    marginBottom: 20,
    borderRadius: 10,
    alignItems: "center",
  },

  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
