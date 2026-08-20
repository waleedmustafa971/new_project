import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
  TextInput, Button
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import MobileModel from './auth/MobileModel';
import BottomNavBar from './BottomNav';
import ReelsFeed from './social/reel/ReelsFeed';
import HomeCategory from './HomeCategory';
import ModalJobpopup from './job/modal/ModalJobpopup';

import SampleTurboModule from '../../specs/NativeSampleModule';

import { useTranslation } from '../screens/lang/TranslationContext';

type RootStackParamList = {
  HomeSocial: undefined;
  ChatScreen: { userid: string; userinfo: object };
  Motors: undefined;
  PropertyDashboard: undefined;
  FilterClassified: undefined;
  ShoppingDashboard: undefined;
  FoodDashboard: undefined;
  AuthScreen: undefined;
  NotificationPage: undefined;
  FilterFurniture: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type GridItem = {
  key: string;
  icon: string;
  backgroundColor: string;
  value: string;
};

const GRID_DATA: GridItem[] = [
  { key: 'home_Social', value: "Social", icon: 'chatbubbles-outline', backgroundColor: '#FFB74D' },
  { key: 'home_Messenger', value: "Messenger", icon: 'logo-whatsapp', backgroundColor: '#4CAF50' },
  { key: 'home_Property', value: "Property", icon: 'home-outline', backgroundColor: '#42A5F5' },
  { key: 'home_Motors', value: "Motors", icon: 'car-sport-outline', backgroundColor: '#FF7043' },
  { key: 'home_Classified', value: "Classified", icon: 'pricetags-outline', backgroundColor: '#BA68C8' },
  { key: 'home_Job', value: "Job", icon: 'briefcase-outline', backgroundColor: '#64B5F6' },
  /* Furniture was a briefcase in the same blue as Job — two tiles that looked
     identical at a glance, in a grid whose whole job is to be scannable. */
  { key: 'home_Furniture', value: "Furniture", icon: 'bed-outline', backgroundColor: '#26A69A' },
  { key: 'home_Shopping', value: "Shopping", icon: 'cart-outline', backgroundColor: '#FFD54F' },
  { key: 'home_Food', value: "Food", icon: 'restaurant-outline', backgroundColor: '#E57373' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { translate, language } = useTranslation();

  const [userid, setUserid] = useState<string | null>(null);
  const [userinfo, setUserinfo] = useState<any>({});
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [modaljobpopup, setModaljobpopup] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const numColumns = 3;
  const spacing = 12;
  const itemWidth = (screenWidth - spacing * (numColumns + 1)) / numColumns;

  /* Native Module Test */
  const [value, setValue] = React.useState('');
  const [reversedValue, setReversedValue] = React.useState('');

  const onPress = () => {
    const revString = SampleTurboModule.reverseString(value);
    setReversedValue(revString);
  };

  /* ---------------- USER CHECK ---------------- */
  useEffect(() => {
    const checkUser = async () => {
      const jsonValue = await AsyncStorage.getItem('userdata');
      if (jsonValue) {
        const userData = JSON.parse(jsonValue);
        setUserid(userData._id);
        console.log('userid: ', userData._id);
        setUserinfo(userData);
      } else {
        navigation.navigate('AuthScreen');
      }
    };
    checkUser();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  /* ---------------- TRANSLATION ---------------- */
  useEffect(() => {
    const loadTranslations = async () => {
      setLabels({});
      const result: Record<string, string> = {};
      result.app_name = await translate('app_name', 'max');

      for (const item of GRID_DATA) {
        const fallback = item.key.replace('home_', '').replace('_', ' ');
        result[item.key] = await translate(item.key, fallback);
      }

      setLabels(result);
    };

    loadTranslations();
  }, [language]);

  /* ---------------- NAVIGATION ---------------- */
  const handleScreen = (key: string) => {
    switch (key) {
      case 'home_Social':
        navigation.navigate('HomeSocial');
        break;
      case 'home_Messenger':
        navigation.navigate('ChatScreen', { userid: userid!, userinfo });
        break;
      case 'home_Motors':
        navigation.navigate('Motors');
        break;
      case 'home_Property':
        navigation.navigate('PropertyDashboard');
        break;
      case 'home_Classified':
        navigation.navigate('FilterClassified');
        break;
      case 'home_Job':
        setModaljobpopup(true);
        break;
      case 'home_Furniture':
        navigation.navigate('FilterFurniture');
        break;
      case 'home_Shopping':
        navigation.navigate('ShoppingDashboard');
        break;
      case 'home_Food':
        navigation.navigate('FoodDashboard');
        break;
    }
  };

  /* ---------------- GRID ITEM ---------------- */
  const renderItem = ({ item }: { item: GridItem }) => (
    <TouchableOpacity
      style={[
        styles.iconWrapper,
        {
          width: itemWidth,
          flexDirection: language === 'ar' ? 'row-reverse' : 'column',
        },
      ]}
      onPress={() => handleScreen(item.key)}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.backgroundColor }]}>
        <Ionicons name={item.icon} size={23} color="#fff" />
      </View>
      {/*   <Text style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'center' }]}>
        {labels[item.key] || item.key}
      </Text> */}
      <Text
        style={[
          styles.label,
          {
            textAlign: language === 'ar' ? 'right' : 'center',
            marginRight: language === 'ar' ? 12 : 0, // example dynamic margin
            marginLeft: language === 'ar' ? 0 : 0,
          }
        ]}
      >
        {labels[item.key] || item.key}
      </Text>

    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP BAR */}
      <View
        style={[
          styles.topBar,
          { flexDirection: language === 'ar' ? 'row-reverse' : 'row' },
        ]}
      >
        <Text style={[styles.appName, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
          {labels.app_name || 'max'}
        </Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('NotificationPage')}
        >
          <Ionicons name="notifications-outline" size={22} color="#333" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.gridCard}>
          <FlatList
            data={language === 'ar' ? [...GRID_DATA].reverse() : GRID_DATA}
            numColumns={numColumns}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.grid}
          />
        </View>

        <View style={{ height: 180 }}>
          <ReelsFeed userid={userid} />
        </View>

        <HomeCategory />

        <ModalJobpopup visible={modaljobpopup} setVisible={setModaljobpopup} />
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="Home" language={language} />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gridCard: { paddingVertical: 10, alignItems: 'center' },
  grid: { paddingHorizontal: 12 },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f2f2f2',
    marginRight: 12,
    padding: 7,
    borderRadius: 10,
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: { fontSize: 11, color: '#333' },
  /* topBar: {
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee', marginTop: 0
  }, */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // IMPORTANT for vertical alignment
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appName: { fontSize: 28, fontWeight: '700', color: '#000' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    width: 8,
    height: 8,
    backgroundColor: 'red',
    borderRadius: 4,
    position: 'absolute',
    top: 6,
    right: 6,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
  },
  textInput: {
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
});
