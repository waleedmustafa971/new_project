import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
/* import MapView, { Marker } from 'react-native-maps';
 */
//import ImageSlider from 'react-native-image-slider-box';
import Icon from 'react-native-vector-icons/Ionicons';
import Iconmaterial from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../component/global'
import { useNavigation, useRoute } from '@react-navigation/native';
import ImageSlider from './ImageSlider';
import UserInfo from '../classified/details/UserInfo';
import MotorsDetailsChild from './MotorsDetailsChild';
import AsyncStorage from "@react-native-async-storage/async-storage";


const MotorsDetails = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImage, setModalImage] = useState(null);
    const [liked, setLiked] = React.useState(false);
    const navigation = useNavigation();
    const route = useRoute()
    const item = route.params?.item;

    const openImageModal = (image) => {
        setModalImage(image);
        setModalVisible(true);
    };
    const handleWhatsapps = () => {
        const productdetails = "Hi, I am interested on this product Code : " + item?._id + " product name " + item?.shortTitle;
        const phoneNumber = item?.whatsapp; // e.g. "919876543210"
      //  const phoneNumber = "+8801711934333"; // e.g. "919876543210"
      console.log('....phone no .... ', phoneNumber)
        const message = encodeURIComponent(productdetails);
        const url = `https://wa.me/${phoneNumber}?text=${message}`;
        Linking.openURL(url).catch(err => {
            console.error("Failed to open WhatsApp", err);
        });
    };
    useEffect(() => {
        getHistorydata()
    }, [])
    const getHistorydata = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (jsonValue != null) {
                const userData = JSON.parse(jsonValue);
                setUserid(userData._id);
                if (!userData._id) {
                    console.warn("No userId found in storage");
                    return;
                }
                const response = await api.post("/apis/property/updatepropertyhistory", {
                    userId: userData._id,
                    id: itemdetails._id
                });
                console.log("History updated:", response.data);
                console.log("History updated here :", response);
                return response.data;
            }
            else {
                console.log('userid not found')
            }

        } catch (error) {
           // console.error("Failed to update history:");
            throw error;
        }
    }


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <ImageSlider images={item.images} navigation={navigation} />

                <MotorsDetailsChild item={item} />
                <View style={{ marginTop: 7, marginLeft: 10 }}>
                    <Text style={styles.address}>
                        Location
                    </Text>
                </View>
                <View style={styles.locationRow}>
                    <Text style={styles.address}>
                        {item?.location}
                    </Text>
                </View>
                <View style={styles.userRow}>
                    <View style={{ flexDirection: 'row' }}>
                        {
                            item?.userinfo?._id ?
                                <UserInfo userid={item?.userinfo._id} navigation={navigation} />
                                :
                                <UserInfo userid={item?.userid} navigation={navigation} />

                        }
                    </View>
                </View>
            </ScrollView>



            {/* 🔹 Footer Actions */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${base.sendEmail}`)}>
                    <Icon name="mail-outline" size={28} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item?.phoneNo}`)}>
                    <Icon name="call-outline" size={28} color="#34C759" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        handleWhatsapps()
                    }}
                >
                    <Icon name="logo-whatsapp" size={28} color="#25D366" />
                </TouchableOpacity>
            </View>

            {/* 🔹 Modal for Image View */}
            <Modal visible={modalVisible} transparent={true}>
                <TouchableOpacity
                    style={styles.modalContainer}
                    onPress={() => setModalVisible(false)}
                >
                    <Image
                        source={{ uri: modalImage }}
                        style={styles.fullImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
};

export default MotorsDetails;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginTop: 10,
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    price: { fontSize: 24, color: '#000' },
    description: {
        marginTop: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#333',
    },
    descriptiontitle: {
        marginTop: 10,
        paddingHorizontal: 15, fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        paddingHorizontal: 15,
    },
    userImage: {
        width: 50, height: 50, borderRadius: 25, marginRight: 10,
    },
    username: { fontSize: 16, fontWeight: '600' },
    map: {
        height: 200,
        marginTop: 15,
        marginHorizontal: 15,
        borderRadius: 10,
    },
    ownerBox: {
        marginTop: 20,
        paddingHorizontal: 15,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    ownerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        height: 60,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#ccc',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '90%',
        height: '80%',
    },
    image: {
        height: 231,
        width: '100%',
        borderRadius: 10,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 250,
        borderRadius: 10,
    },
    backIcon: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: '#00000088',
        padding: 6,
        borderRadius: 20,
    },
    loveIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: '#00000088',
        padding: 6,
        borderRadius: 20,
    },
    favouritesicon: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: '#00000088',
        padding: 6,
        borderRadius: 20,
    },
    shareicon: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        backgroundColor: '#00000088',
        padding: 6,
        borderRadius: 20,

    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0, padding: 0
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 12,
        color: '#555',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        flexWrap: 'wrap', padding: 8
    },
    address: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
});

