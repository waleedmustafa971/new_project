import {
       View, Text, SafeAreaView, StyleSheet, ScrollView,
       ActivityIndicator, Alert
} from 'react-native'
import React, { useEffect, useState } from 'react'
import HeaderProperty from './sub/HeaderProperty'
import PropertyOptions from './sub/PropertyOptions'
import RecomandProperty from './sub/RecomandProperty'
import ExploreUae from './sub/ExploreUae'
import PropertyforRent from './sub/PropertyforRent'
import PropertyforSale from './sub/PropertyforSale'
import RoomforRent from './sub/RoomforRent'
import { useNavigation } from '@react-navigation/native'
import NearbyLocationScreen from './sub/NearbyLocationScreen'
import KeepLooking from './sub/KeepLooking'
import BottomNavBar from './BottomNavBar'
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraftList from './ads/DraftList'
import * as base from '../../component/global'
import TopCategoryScreen from './TopCategoryScreen'
const PAGE_LIMIT = 10;
import NetInfo from "@react-native-community/netinfo";
import api from '../../component/api'
import { requestAllPermissions, getLiveLocation } from '../../screens/permission/PermissionManager';
import HomeCategory from '../HomeCategory'
import ShowClassifiedCategory from '../HomeCategory'
import PropertyCategory from './PropertyCategory'
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import LocationFilterModal from './LocationFilterModal'
import { isConnected } from '../../constants/network'
import Toast from 'react-native-toast-message';

interface PropertyQueryParams {
       page: number;
       limit: number;
       add_post?: string;
       Category?: string;
       subCategory?: string;
       age?: string;
       usage?: string;
       condition?: string;
       minPrice?: string;
       maxPrice?: string;
       title?: string;
       city?: string;
       propertyType?: string;
       userId?: string;
       status?: string
}


const PropertyDashboard = () => {
       const navigation = useNavigation()
       const [data, setData] = useState<any[]>([]);
       const [locationdata, setLocationdata] = useState<any[]>([]);
       const [page, setPage] = useState(1);
       const [loading, setLoading] = useState(false);
       const [totalPages, setTotalPages] = useState(1);
       const [userid, setUserid] = useState(null);
       const [categorydata, setCategorydata] = useState<any[]>([]);
       const [nearbydata, setNearbydata] = useState<any[]>([]);
       const [propertySales, setPropertySales] = useState<any[]>([]);
       const [propertyforrent, setPropertyforrent] = useState<any[]>([]);
       const [keeplookingdata, setKeeplookingdata] = useState<any[]>([]);
       const [roomforrent, setRoomforrent] = useState<any[]>([]);
       const [latitude, setLatitude] = useState<number | null>(null);
       const [longitude, setLongitude] = useState<number | null>(null);
       const [address, setAddress] = useState(null)

       const [locationFilter, setLocationFilter] = useState(false);
       const [distance, setDistance] = useState(1);

       const increase = () => setDistance(d => d + 1);
       const decrease = () => distance > 1 && setDistance(d => d - 1);

       const applyFilter = () => {
              setNearbydata([])
              console.log('Selected distance:', distance);
              setLocationFilter(false);
              getLocationdata(locationdata)

       };
       useEffect(() => {
              const init = async () => {
                     const online = await isConnected();
                     if (!online) {
                            Toast.show({
                                   type: 'error',
                                   text1: 'No Internet, Please check your connection.',
                                   position: 'top',
                            });
                            return;
                     }
                     setLoading(true);
                     try {
                            await withTimeout(requestAllPermissions());
                            const location = await getLiveLocation();
                            console.log("✅property page location direct:", location);
                            setAddress(location?.address);
                            setLatitude(location?.latitude);
                            setLongitude(location?.longitude);
                            setLocationdata(location)
                            // fetchDashboard(location.latitude, location.longitude);
                     } catch (e) {
                            console.log("Init error:", e);
                     } finally {
                            setLoading(false);
                     }
              };

              init();
       }, []);


       useEffect(() => {

              NetInfo.fetch().then((state) => {
                     if (!state.isConnected) {
                            Alert.alert("No Internet", "Please check your connection.");
                            setLoading(false);
                            return; // ❌ Stop execution
                     }
                     setLoading(true);

                     Promise.allSettled([
                            withTimeout(fetchDatadraft()),
                            withTimeout(fetchCategory()),
                            withTimeout(fetchKeep()),
                            withTimeout(requestAllPermissions())
                     ]).finally(async () => {
                           
                            setLoading(false);
                     });
              });

       }, []);

       const getLocationdata = async (data: any) => {
              // setLoading(true);
              try {
                     const params = {
                            page: 1,
                            limit: 10,
                            add_post: 'Property',
                          /*   lat: data.region?.latitude,
                            long: data.region?.longitude, */
                            lat: latitude,
                            long: longitude,
                            kilometer: distance
                     };

                     console.log('....params.nearby.. ', params)

                     try {
                            const { data } = await api.get('/apis/property/nearbyproperty/live', { params });
                            setNearbydata(data.users);
                     } catch (error) {
                            console.error("Error fetching:", error);
                            //  setLoading(false)
                     }

              } catch (error) {
                     console.error("Error fetching:", error);
              } finally {
                     // setLoading(false);
              }
       };


       const withTimeout = (promise, ms = 10000) =>
              Promise.race([
                     promise,
                     new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
              ]);

       const fetchDatadraft = async () => {
              try {
                     const jsonValue = await AsyncStorage.getItem("userdata");

                     if (!jsonValue) {
                            console.log("No user data found");
                            return;
                     }

                     const userData = JSON.parse(jsonValue);
                     setUserid(userData._id);

                     const url =
                            `${base.BASE_URL}/apis/property/draft/${userData._id}/draft` +
                            `?page=${page}&limit=${PAGE_LIMIT}&status=draft`;

                     console.log("Request URL:", url);

                     const res = await fetch(url);

                     if (!res.ok) {
                            const errorText = await res.text();
                            console.error("Server Error:", res.status, errorText);
                            return;
                     }

                     const json = await res.json();

                     setData(prev => [...prev, ...(json.users || [])]);
                     setTotalPages(json.totalPages || 1);

              } catch (error) {
                     console.error("Fetch failed:", error);
              }
       };

       const fetchCategory = async () => {
              const params: PropertyQueryParams = {
                     page,
                     limit: PAGE_LIMIT,
                     add_post: 'Property',
                     status: 'live'
              };
              try {
                     const { data } = await api.get('/apis/property/recommandproperty/live', { params });
                     setCategorydata(data.users);
              } catch (error) {
                     console.error("Error fetching:", error);
                     setLoading(false)
              }
       }
       const fetchKeep = async () => {
              const jsonValue = await AsyncStorage.getItem("userdata");
              if (jsonValue != null) {
                     const userData = JSON.parse(jsonValue);
                     setUserid(userData._id);
                     const params: PropertyQueryParams = {
                            page,
                            limit: PAGE_LIMIT,
                            userId: userData._id,
                            addpost: 'Property'
                     };
                     try {
                            const { data } = await api.get('/apis/property/viewuserviewhistory', { params });
                            //   setKeeplookingdata(data.users);
                            setKeeplookingdata(data?.data ?? []);


                     } catch (error) {
                            console.error("Error fetching:", error);
                     }
              }

       };

       const ShimmerHeader = () => (
              <View style={{ padding: 15 }}>
                     <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: '100%', height: 45, borderRadius: 10 }} />
                     <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
                            {[1, 2, 3, 4].map((i) => (
                                   <View key={i} style={{ alignItems: 'center' }}>
                                          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 60, height: 60, borderRadius: 30 }} />
                                          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 50, height: 10, marginTop: 8, borderRadius: 5 }} />
                                   </View>
                            ))}
                     </View>
              </View>
       );

       const ShimmerSection = () => (
              <View style={{ marginVertical: 15, paddingLeft: 15 }}>
                     <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 150, height: 20, marginBottom: 15, borderRadius: 5 }} />
                     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {[1, 2, 3, 4].map((i) => (
                                   <View key={i} style={{ marginRight: 15 }}>
                                          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 140, height: 120, borderRadius: 10 }} />
                                          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 100, height: 12, marginTop: 10, borderRadius: 5 }} />
                                          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: 80, height: 10, marginTop: 5, borderRadius: 5 }} />
                                   </View>
                            ))}
                     </ScrollView>
              </View>
       );

       return (
              <SafeAreaView style={styles.container}>
                     {loading ? (
                            <ScrollView>
                                   <ShimmerHeader />
                                   <ShimmerSection /> {/* Represents Nearby Locations */}
                                   <ShimmerSection /> {/* Represents Keep Looking */}
                                   <ShimmerSection /> {/* Represents Recommended */}
                                   <ShimmerSection /> {/* Represents Recommended */}
                            </ScrollView>
                     ) : (
                            <>
                                   <HeaderProperty address={address}/>
                                   <PropertyOptions />
                                   <ScrollView style={{ marginBottom: 20 }}>
                                          {
                                                 data.length > 0 ?
                                                        <View style={{
                                                               padding: 0, marginBottom: 0, borderTopWidth: 2, borderTopColor: '#f2f2f2', backgroundColor: '#f2f2f2', borderBottomWidth: 2, borderBottomColor: '#f2f2f2',
                                                        }}>
                                                               <DraftList data={data} navigation={navigation} />
                                                        </View>
                                                        : null
                                          }
                                          <View style={{ marginBottom: 0, marginTop: 7 }}>
                                                 <NearbyLocationScreen data={nearbydata} setLocationFilter={setLocationFilter} navigation={navigation}/>
                                          </View>
                                          {
                                                 keeplookingdata.length > 0 ?
                                                        <View style={{ padding: 3, marginBottom: 7 }}>
                                                               <View style={{
                                                                      padding: 0, marginBottom: 0
                                                               }}>
                                                                      <KeepLooking data={keeplookingdata} navigation={navigation} />
                                                               </View>
                                                        </View>
                                                        : null
                                          }
                                          {
                                                 categorydata.length > 0 ?
                                                        <View style={{
                                                               marginBottom: 7,
                                                               borderWidth: 0, borderColor: '#000'
                                                        }}>
                                                               <RecomandProperty categorydata={categorydata} navigation={navigation} />
                                                        </View>
                                                        :
                                                        null
                                          }
                                          <PropertyCategory />


                                   </ScrollView>
                                   <View style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          borderWidth: 0, borderColor: 'green',
                                          justifyContent: 'space-between',
                                          flexDirection: 'row',
                                          width: '100%',
                                          alignItems: 'center',
                                          backgroundColor: '#f2f2f2',
                                          height: 55
                                   }}>
                                          <BottomNavBar navigation={navigation} data={locationdata} />
                                   </View>
                            </>
                     )}

                     <LocationFilterModal
                            visible={locationFilter}
                            distance={distance}
                            setDistance={setDistance} // <-- ADD THIS setDistance
                            onApply={applyFilter}
                            onClose={() => setLocationFilter(false)}
                     />


              </SafeAreaView>
       )
}

export default PropertyDashboard

const styles = StyleSheet.create({
       container: { flex: 1, backgroundColor: '#fff', padding: 5 },
       flashSalesHeader: {
              flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', paddingHorizontal: 16, marginTop: 20
       },
       flashSalesTitle: { fontSize: 20, fontWeight: 'bold' },
       seeAll: { color: '#007bff' },

       productList: { paddingVertical: 16, paddingLeft: 16 },
       productCard: { width: 150, backgroundColor: '#f9f9f9', borderRadius: 12, marginRight: 16, paddingBottom: 10 },
       imageContainer: { position: 'relative' },
       productImage: { width: '100%', height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
       discountTag: { position: 'absolute', top: 8, right: 8, backgroundColor: 'red', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
       discountText: { color: '#fff', fontSize: 12 },

       productName: { fontSize: 14, fontWeight: 'bold', marginTop: 8, paddingHorizontal: 8 },
       productPrice: { fontSize: 14, color: '#007bff', paddingHorizontal: 8, marginTop: 4 },
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
       listImage: {
              width: 120,
              height: 120,
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
       },
       productDetails: {
              padding: 10,
              flex: 1,
              justifyContent: "space-between",
       }

});
