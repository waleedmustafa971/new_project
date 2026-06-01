import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, ScrollView, StyleSheet, Modal,
    TouchableOpacity, SafeAreaView, Linking, Share, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Iconmaterial from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'
import api from "../../../component/api"; // your axios instance
import {
    useNavigation,
    useRoute,
    RouteProp,
} from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ImageSlider from './imageslider/ImageSlider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapSection from '../../map/MapSection';
import UserInfo from './UserInfo';
// 🧭 STEP 1: Define your navigation param list
type RootStackParamList = {
    ClassifiedDetails: { itemdetails: any };
    ViewAgent: { propertyid: string };
};

// 🧭 STEP 2: Define navigation and route prop types
type ClassifiedDetailsNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'ClassifiedDetails'
>;

type ClassifiedDetailsRouteProp = RouteProp<
    RootStackParamList,
    'ClassifiedDetails'
>;

const ClassifiedDetails = () => {
    const navigation = useNavigation<ClassifiedDetailsNavigationProp>();
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [liked, setLiked] = React.useState(false);
    const [userid, setUserid] = useState<string | null>(null);
    //const route = useRoute()
    const route = useRoute<ClassifiedDetailsRouteProp>();
    // const id = route.params?.id;
    const itemdetails = route.params?.itemdetails;
    console.log('itemdetails...' + JSON.stringify(itemdetails));

    const openImageModal = (image: string) => {
        setModalImage(image);
        setModalVisible(true);
    };

    useEffect(() => {
        getHistorydata()
    }, [])

    const slugify = (text = '') =>
        text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-')   // spaces & special chars → -
            .replace(/^-+|-+$/g, '');   // trim - from start/end

    const shareData = async () => {
        const producttitle = slugify(itemdetails?.shortTitle);

        try {
            const propertyLink = `${base.BASE_URL}/product/${itemdetails._id}/${producttitle}`;

            let shareOptions;

            if (Platform.OS === "ios") {
                // iOS supports `url` for link previews
                shareOptions = {
                    message: "Check out this Product!", // Text above preview
                    url: propertyLink,
                };
            } else {
                // Android ignores `url` in Share; put link in message
                shareOptions = {
                    message: `Check out this Product! ${propertyLink}`,
                };
            }

            const result = await Share.share(shareOptions);

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log("Shared with activity type:", result.activityType);
                } else {
                    console.log("Shared successfully!");
                }
            } else if (result.action === Share.dismissedAction) {
                console.log("Share dismissed");
            }
        } catch (error) {
            console.error("Error sharing:", error.message);
        }
    }

    //shareData
    const SaveData = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem("userdata");
            if (jsonValue != null) {
                const userData = JSON.parse(jsonValue);
                setUserid(userData._id);
                if (!userData._id) {
                    console.warn("No userId found in storage");
                    return;
                }
                try {
                    const response = await api.post("/apis/property/addpropertyfaviourites", {
                        userid: userData._id,
                        property_id: itemdetails._id,
                        details: itemdetails
                    });
                    console.log("Added:", response.data);
                    return response.data;
                } catch (error) {
                    console.error("Error adding save:", error.response?.data || error.message);
                    throw error;
                }
            }
            else {
                console.log('userid not found')
            }

        } catch (error) {
            console.error("Failed to update history:", error.response?.data || error.message);
            throw error;
        }

    }

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
            console.error("Failed to update history:");
            throw error;
        }
    }

        const handleWhatsapps = () => {
            const productdetails = " Product Code : " + itemdetails?._id + " product name " + itemdetails?.shortTitle;
            const phoneNumber = itemdetails?.whatsapp; // e.g. "919876543210"
           // const phoneNumber = "+8801711934333"; // e.g. "919876543210"
            const message = encodeURIComponent(productdetails);
            const url = `https://wa.me/${phoneNumber}?text=${message}`;
            Linking.openURL(url).catch(err => {
                console.error("Failed to open WhatsApp", err);
            });
        };
    
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* 🔹 Image Slider */}
                <TouchableOpacity onPress={() => openImageModal(itemdetails?.images[0])}>
                    <View style={styles.imageContainer}>
                        <ImageSlider images={itemdetails?.images} navigation={navigation} />
                        {/* 🔙 Back Icon */}
                        {/* setLiked(!liked) SaveData shareData*/}
                        <TouchableOpacity style={styles.shareicon} onPress={() => shareData()}>
                            <Icon
                                name={liked ? 'share-social' : 'share-social-outline'}
                                size={18}
                                color={liked ? '#3498db' : '#ffffff'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.favouritesicon} onPress={() => SaveData(itemdetails)}>
                            <Icon
                                name={liked ? 'save' : 'save-outline'}
                                size={18}
                                color={liked ? '#3498db' : '#ffffff'}
                            />
                        </TouchableOpacity>


                    </View>
                </TouchableOpacity>
                <View style={{ padding: 10 }}>
                    <View style={styles.pricediv}>
                        <Text style={{
                            fontSize: 16,
                            fontWeight: 'bold', marginLeft: 4
                        }}>
                            {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'AED',
                                maximumFractionDigits: 0, // optional: removes decimal if not needed
                            }).format(Number(itemdetails?.price))}
                        </Text>
                    </View>
                    <View style={styles.description}>
                        <Text style={{
                            fontWeight: 'bold', fontSize: 16
                        }}> {itemdetails?.shortTitle} </Text>
                    </View>
                    {/* Address */}
                    <View style={styles.locationRow}>
                        <Iconmaterial name="map-marker" size={22} color="#787575"
                            style={{ marginLeft: -4 }} />
                        <Text style={styles.address}>
                            {itemdetails?.location}
                        </Text>
                    </View>

                    <View style={styles.description}>
                        <Text> {itemdetails?.description} </Text>
                    </View>

                    <View style={styles.chipContainer}>
                        {itemdetails?.age && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{itemdetails.age}</Text>
                            </View>
                        )}

                        {itemdetails?.usage && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{itemdetails.usage}</Text>
                            </View>
                        )}

                        {itemdetails?.condition && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{itemdetails.condition}</Text>
                            </View>
                        )}
                    </View>

                    {/* <SimilarPropertyTransaction /> */}

                    {/* 🔹 User Info */}
                    <View style={styles.userRow}>
                        <View style={{ flexDirection: 'row' }}>
                            {
                                itemdetails?.userinfo?._id ?
                                    <UserInfo userid={itemdetails?.userinfo._id} navigation={navigation} />
                                    :
                                    <UserInfo userid={itemdetails?.userid} navigation={navigation} />

                            }


                        </View>

                    </View>
                    <View style={{ marginTop: 7 }}>
                        <View style={{ marginBottom: 5 }}>
                            <Text style={{
                                fontSize: 14, fontWeight: 'bold',
                                marginBottom: 3
                            }}>Location </Text>
                            <Text> {itemdetails?.location}</Text>
                        </View>
                        <MapSection locationName={itemdetails?.location}
                            onLocationSelect={(coords) => console.log(coords)} />

                    </View>
                </View>
            </ScrollView>

            {/* 🔹 Footer Actions */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${base.sendEmail}`)}>
                    <Icon name="mail-outline" size={28} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${itemdetails.phoneNo}`)}>
                    <Icon name="call-outline" size={28} color="#34C759" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    handleWhatsapps()
                }}>
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

export default ClassifiedDetails;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginTop: 10,
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    price: { fontSize: 24, color: '#000' },
    description: {
        color: '#333',
        borderWidth: 0, borderColor: 'red',
        marginTop: 5
    },
    descriptiontitle: {
        marginTop: 10,
        fontSize: 18,
        color: '#333',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 9
    },
    userImage: {
        width: 50, height: 50, borderRadius: 25, marginRight: 10,
    },
    username: { fontSize: 16, fontWeight: '600' },
    map: {
        height: 200,
        marginTop: 15,
    },
    ownerBox: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    ownerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 0,
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
        marginTop: -5
    },
    backIcon: {
        position: 'absolute',
        top: 15,
        left: 15,
        //  backgroundColor: '#00000088',
        padding: 6,
        borderRadius: 20,
    },
    loveIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        // backgroundColor: '#00000088',
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
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    pricediv: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0, padding: 0,
        marginTop: 3,
        borderWidth: 2, borderColor: '#f2f2f2'
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        //  gap: 6,
    },
    infoText: {
        fontSize: 17,
        color: '#555',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        borderWidth: 0, borderColor: '#f2f2f2'
    },
    address: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    chip: {
        backgroundColor: '#F2F4F7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 6,
    },
    chipText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },

});

